/* eslint-disable @typescript-eslint/no-require-imports -- Node's CommonJS test runner. */
const assert = require('node:assert/strict');
const { test, beforeEach, afterEach } = require('node:test');
const { loadTs } = require('./load-ts.cjs');

const SECRET = 'admin-payment-review-unit-test-secret-only';
const ORIGINAL_SECRET = process.env.NEXTAUTH_SECRET;
const PAYMENT_ID = 'payment-1';
const BUYER_ID = 'payment-owner';
const COURSE_ID = 'purchased-course';
const INSTRUCTOR_ID = 'course-instructor';
beforeEach(() => { process.env.NEXTAUTH_SECRET = SECRET; });
afterEach(() => {
  if (ORIGINAL_SECRET === undefined) delete process.env.NEXTAUTH_SECRET;
  else process.env.NEXTAUTH_SECRET = ORIGINAL_SECRET;
});

function makePayment(currency = 'USD', amount = 25) {
  return {
    id: PAYMENT_ID, userId: BUYER_ID, courseId: COURSE_ID, amount,
    status: 'PENDING', provider: 'MANUAL', paymentMethod: 'MANUAL',
    receiptImage: '/api/files/original-receipt', transactionId: 'manual-reference',
    course: { id: COURSE_ID, title: 'Course', instructorId: INSTRUCTOR_ID },
    providerResponse: JSON.stringify({
      version: 1, paymentId: PAYMENT_ID, userId: BUYER_ID, courseId: COURSE_ID,
      currency, amountMinor: Math.round(amount * 100), state: 'READY',
    }),
  };
}

function harness({ payment = makePayment(), role = 'ADMIN', banned = false, session = true,
  enrollment = { id: 'enrollment-1', userId: BUYER_ID, courseId: COURSE_ID, progress: 67 },
  failCredit = false, failEnrollment = false, lostClaim = false } = {}) {
  let state = { payment: structuredClone(payment), enrollment: structuredClone(enrollment), walletUSD: 0, walletSYP: 0 };
  let queue = Promise.resolve();
  const events = [];
  const credits = [];
  const upserts = [];
  const transitions = [];
  const mocks = {
    '@/lib/auth': { authOptions: {} },
    'next-auth': { getServerSession: async () => session ? { user: { id: 'reviewer', role: 'ADMIN' } } : null },
    '@/lib/db': { prisma: { user: { findUnique: async ({ where }) => {
      assert.equal(where.id, 'reviewer');
      return { id: 'reviewer', role, email: 'reviewer@example.test', name: 'Reviewer', phone: null, isBanned: banned };
    } } } },
    // Functional transaction mock: stage writes, serialize callbacks, publish only
    // on success. Actual PostgreSQL isolation is verified separately in staging.
    '@/lib/payments/transactions': { withPaymentTransaction: async callback => {
      const previous = queue;
      let release;
      queue = new Promise(resolve => { release = resolve; });
      await previous;
      events.push('transaction');
      const working = structuredClone(state);
      const tx = {
        payment: {
          findUnique: async ({ where }) => {
            events.push('read-payment');
            return working.payment?.id === where.id ? structuredClone(working.payment) : null;
          },
          updateMany: async ({ where, data }) => {
            transitions.push({ where, data });
            const matches = working.payment && Object.entries(where).every(([key, value]) => working.payment[key] === value);
            if (lostClaim || !matches) return { count: 0 };
            Object.assign(working.payment, data);
            return { count: 1 };
          },
        },
        enrollment: { upsert: async args => {
          upserts.push(args);
          if (failEnrollment) throw new Error('Simulated enrollment failure');
          const pair = args.where.userId_courseId;
          assert.deepEqual(pair, { userId: BUYER_ID, courseId: COURSE_ID });
          if (working.enrollment) Object.assign(working.enrollment, args.update);
          else working.enrollment = { id: 'new-enrollment', ...args.create };
          return structuredClone(working.enrollment);
        } },
        user: { update: async args => {
          credits.push(args);
          if (failCredit) throw new Error('Simulated instructor credit failure');
          assert.equal(args.where.id, INSTRUCTOR_ID);
          if (args.data.walletUSD) working.walletUSD += args.data.walletUSD.increment;
          if (args.data.walletSYP) working.walletSYP += args.data.walletSYP.increment;
          return { id: INSTRUCTOR_ID };
        } },
      };
      try {
        const result = await callback(tx);
        state = working;
        return result;
      } finally { release(); }
    } },
  };
  mocks['@/lib/request-user'] = loadTs('../src/lib/request-user.ts', mocks);
  mocks['@/lib/payments/checkout-context'] = loadTs('../src/lib/payments/checkout-context.ts', mocks);
  mocks['@/lib/payments/admin-review'] = loadTs('../src/lib/payments/admin-review.ts', mocks);
  return {
    patch: loadTs('../src/app/api/admin/payments/[id]/route.ts', mocks).PATCH,
    approve: loadTs('../src/app/api/admin/payments/approve/route.ts', mocks).POST,
    events, credits, upserts, transitions,
    get state() { return state; },
  };
}

function request(body, method = 'POST') {
  return new Request('https://academy.test/api/admin/payments', {
    method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
  });
}
const context = () => ({ params: Promise.resolve({ id: PAYMENT_ID }) });
function approve(h, kind, fields = {}) {
  return kind === 'patch'
    ? h.patch(request({ status: 'APPROVED', ...fields }, 'PATCH'), context())
    : h.approve(request({ paymentId: PAYMENT_ID, ...fields }));
}

test('both admin payment endpoints enforce current database ADMIN/OWNER roles before payment access', async () => {
  for (const options of [{ role: 'STUDENT' }, { role: 'INSTRUCTOR' }, { banned: true }, { session: false }]) {
    const h = harness(options);
    for (const kind of ['patch', 'approve']) {
      const response = await approve(h, kind, { role: 'OWNER', userId: 'reviewer' });
      assert.equal(response.status, options.banned || options.session === false ? 401 : 403);
    }
    assert.deepEqual(h.events, []);
    assert.deepEqual(h.transitions, []);
  }
  const owner = harness({ role: 'OWNER' });
  assert.equal((await approve(owner, 'approve')).status, 200);
});

test('manual approval derives the buyer/course/instructor from the stored payment and preserves existing progress', async () => {
  for (const kind of ['patch', 'approve']) {
    const h = harness();
    const response = await approve(h, kind, { userId: 'different-buyer', courseId: 'different-course', instructorId: 'different-teacher' });
    assert.equal(response.status, 200);
    const body = await response.json();
    assert.equal(body.success, true);
    assert.equal(body.payment.status, 'APPROVED');
    assert.equal(body.payment.userId, BUYER_ID);
    assert.equal(body.payment.courseId, COURSE_ID);
    assert.equal(h.state.payment.status, 'APPROVED');
    assert.equal(JSON.parse(h.state.payment.providerResponse).state, 'VERIFIED');
    assert.equal(h.state.enrollment.progress, 67);
    assert.deepEqual(h.upserts[0].update, {});
    assert.equal(h.credits[0].where.id, INSTRUCTOR_ID);
    assert.equal(h.state.walletUSD, 25);
    assert.equal(h.state.walletSYP, 0);
    assert.equal(h.transitions[0].where.status, 'PENDING');
    assert.equal(h.transitions[0].where.providerResponse, makePayment().providerResponse);
  }
});

test('currency and instructor credit use the stored snapshot rather than amount thresholds or submitted currency', async () => {
  for (const [currency, amount] of [['USD', 25000], ['SYP', 25]]) {
    const h = harness({ payment: makePayment(currency, amount) });
    assert.equal((await approve(h, 'approve', { currency: currency === 'USD' ? 'SYP' : 'USD', amount: 1 })).status, 200);
    assert.equal(h.state.walletUSD, currency === 'USD' ? amount : 0);
    assert.equal(h.state.walletSYP, currency === 'SYP' ? amount : 0);
  }
});

test('replaying approval across the two endpoints does not credit twice or reset student progress', async () => {
  const h = harness();
  assert.equal((await approve(h, 'patch')).status, 200);
  assert.equal((await approve(h, 'approve')).status, 200);
  assert.equal((await approve(h, 'patch')).status, 200);
  assert.equal(h.state.walletUSD, 25);
  assert.equal(h.state.enrollment.progress, 67);
  assert.equal(h.credits.length, 1);
  assert.equal(h.upserts.length, 1);
  assert.equal(h.transitions.length, 1);
});

test('concurrent manual approvals share one state transition and one instructor credit in the functional transaction mock', async () => {
  const h = harness({ enrollment: null });
  const responses = await Promise.all([approve(h, 'patch'), approve(h, 'approve')]);
  assert.deepEqual(responses.map(response => response.status), [200, 200]);
  assert.equal(h.transitions.length, 1);
  assert.equal(h.credits.length, 1);
  assert.equal(h.upserts.length, 1);
  assert.equal(h.state.walletUSD, 25);
  assert.equal(h.state.enrollment.progress, 0);
});

test('rejection is terminal, replayable and never creates enrollment or instructor credit', async () => {
  const h = harness({ enrollment: null });
  for (let i = 0; i < 2; i++) {
    const response = await h.patch(request({ status: 'REJECTED' }, 'PATCH'), context());
    assert.equal(response.status, 200);
    assert.equal((await response.json()).payment.status, 'REJECTED');
  }
  assert.equal((await approve(h, 'approve')).status, 409);
  assert.equal(h.state.payment.status, 'REJECTED');
  assert.equal(h.state.enrollment, null);
  assert.equal(h.state.walletUSD, 0);
  assert.equal(h.credits.length, 0);
  assert.equal(h.upserts.length, 0);
  assert.equal(h.transitions.length, 1);
});

test('online payments cannot obtain an approval through either manual administration endpoint', async () => {
  for (const provider of ['STRIPE', 'PAYPAL', 'TABBY', 'TAMARA']) {
    const payment = { ...makePayment(), provider, paymentMethod: provider };
    const h = harness({ payment });
    for (const kind of ['patch', 'approve']) assert.equal((await approve(h, kind)).status, 409);
    assert.equal(h.state.payment.status, 'PENDING');
    assert.equal(h.transitions.length, 0);
    assert.equal(h.credits.length, 0);
  }
});

test('legacy, malformed, mismatched and unfinished checkout snapshots fail closed with review guidance', async () => {
  const valid = JSON.parse(makePayment().providerResponse);
  const snapshots = [null, '{invalid json', ...[
    { paymentId: 'other-payment' }, { userId: 'other-user' }, { courseId: 'other-course' },
    { currency: 'EUR' }, { amountMinor: 1 }, { state: 'CREATING' },
  ].map(changes => JSON.stringify({ ...valid, ...changes }))];
  for (const providerResponse of snapshots) {
    const h = harness({ payment: { ...makePayment(), providerResponse } });
    const response = await approve(h, 'approve');
    assert.equal(response.status, 409);
    assert.match((await response.json()).error, /مراجعة/);
    assert.equal(h.state.payment.status, 'PENDING');
    assert.equal(h.transitions.length, 0);
    assert.equal(h.credits.length, 0);
  }
});

test('invalid status/action and malformed request objects are rejected without a payment transaction', async () => {
  const h = harness();
  for (const body of [null, [], {}, { status: 'PENDING' }, { status: 'approved' }, { status: 'APPROVED', action: 'APPROVE' }]) {
    assert.equal((await h.patch(request(body, 'PATCH'), context())).status, 400);
  }
  for (const body of [null, [], {}, { paymentId: 1 }, { paymentId: PAYMENT_ID, action: 'REJECT' }, { paymentId: PAYMENT_ID, status: 'REJECTED' }]) {
    assert.equal((await h.approve(request(body))).status, 400);
  }
  assert.deepEqual(h.events, []);
});

test('lost PENDING claim cannot perform enrollment or instructor credit', async () => {
  const h = harness({ lostClaim: true, enrollment: null });
  assert.equal((await approve(h, 'approve')).status, 409);
  assert.equal(h.state.payment.status, 'PENDING');
  assert.equal(h.state.enrollment, null);
  assert.equal(h.credits.length, 0);
  assert.equal(h.upserts.length, 0);
});

test('failure after claiming a payment rolls back its status, enrollment and instructor credit', async t => {
  t.mock.method(console, 'error', () => {});
  for (const options of [{ failEnrollment: true }, { failCredit: true }]) {
    for (const kind of ['patch', 'approve']) {
      const h = harness({ ...options, enrollment: null });
      const response = await approve(h, kind);
      assert.equal(response.status, 500);
      assert.doesNotMatch((await response.json()).error, /Simulated|instructor credit|enrollment failure/);
      assert.equal(h.state.payment.status, 'PENDING');
      assert.equal(JSON.parse(h.state.payment.providerResponse).state, 'READY');
      assert.equal(h.state.enrollment, null);
      assert.equal(h.state.walletUSD, 0);
      assert.equal(h.state.walletSYP, 0);
    }
  }
});

test('missing payment produces 404 for an authorized reviewer without any write', async () => {
  const h = harness({ payment: null });
  assert.equal((await approve(h, 'approve')).status, 404);
  assert.equal(h.transitions.length, 0);
  assert.equal(h.credits.length, 0);
});
