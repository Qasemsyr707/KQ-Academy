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
  failCredit = false, failEnrollment = false, lostClaim = false, extraPayments = [] } = {}) {
  let state = { payment: structuredClone(payment), more: structuredClone(extraPayments), enrollment: structuredClone(enrollment),
    walletUSD: 0, walletSYP: 0, notes: [] };
  const rowFor = (working, id) => [working.payment, ...working.more].find(row => row?.id === id);
  let queue = Promise.resolve();
  const events = [];
  const credits = [];
  const creates = [];
  const transitions = [];
  const mocks = {
    '@/lib/auth': { authOptions: {} },
    // Records notifications in the transaction's staged state, with the database's unique dedupe key.
    '@/lib/notifications': (() => {
      const store = (tx, userId, key, title) => {
        const dedupeKey = `${key}:${userId}`;
        if (!tx.notes.some(note => note.dedupeKey === dedupeKey)) tx.notes.push({ userId, dedupeKey, title });
      };
      return {
        notify: async (tx, input) => store(tx, input.userId, input.dedupeKey, input.title),
        notifyEnrollment: async (tx, e) => {
          store(tx, e.userId, `enrolled:${e.eventKey}`, 'تم تسجيلك في الكورس');
          store(tx, e.instructorId, `new-student:${e.eventKey}`, 'طالب جديد في كورسك');
        },
      };
    })(),
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
            const row = rowFor(working, where.id);
            return row ? structuredClone(row) : null;
          },
          updateMany: async ({ where, data }) => {
            transitions.push({ where, data });
            const row = rowFor(working, where.id);
            const matches = row && Object.entries(where).every(([key, value]) => row[key] === value);
            if (lostClaim || !matches) return { count: 0 };
            Object.assign(row, data);
            return { count: 1 };
          },
        },
        // createMany + skipDuplicates: the database's ON CONFLICT DO NOTHING, reporting how many rows were created.
        enrollment: { createMany: async args => {
          creates.push(args);
          if (failEnrollment) throw new Error('Simulated enrollment failure');
          assert.equal(args.skipDuplicates, true);
          assert.equal(args.data.length, 1);
          assert.deepEqual({ userId: args.data[0].userId, courseId: args.data[0].courseId }, { userId: BUYER_ID, courseId: COURSE_ID });
          if (working.enrollment) return { count: 0 };
          working.enrollment = { id: 'new-enrollment', ...args.data[0] };
          return { count: 1 };
        } },
        notes: working.notes,
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
    events, credits, creates, transitions,
    get state() { return state; },
  };
}

function request(body, method = 'POST') {
  return new Request('https://academy.test/api/admin/payments', {
    method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
  });
}
const context = () => ({ params: Promise.resolve({ id: PAYMENT_ID }) });
function approve(h, kind, fields = {}, id = PAYMENT_ID) {
  return kind === 'patch'
    ? h.patch(request({ status: 'APPROVED', ...fields }, 'PATCH'), { params: Promise.resolve({ id }) })
    : h.approve(request({ paymentId: id, ...fields }));
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
    assert.equal(h.creates[0].skipDuplicates, true);
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
  assert.equal(h.creates.length, 1);
  assert.equal(h.transitions.length, 1);
});

test('concurrent manual approvals share one state transition and one instructor credit in the functional transaction mock', async () => {
  const h = harness({ enrollment: null });
  const responses = await Promise.all([approve(h, 'patch'), approve(h, 'approve')]);
  assert.deepEqual(responses.map(response => response.status), [200, 200]);
  assert.equal(h.transitions.length, 1);
  assert.equal(h.credits.length, 1);
  assert.equal(h.creates.length, 1);
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
  assert.equal(h.creates.length, 0);
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
  assert.equal(h.creates.length, 0);
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

// Staging scenario: one student, two separate manual transfers for the same course, each approved on its own.
const SECOND_ID = 'payment-2';
const secondPayment = () => ({
  ...makePayment(), id: SECOND_ID,
  providerResponse: JSON.stringify({ ...JSON.parse(makePayment().providerResponse), paymentId: SECOND_ID }),
});
const enrollmentNotes = h => h.state.notes.filter(note => note.dedupeKey.startsWith('enrolled:'));
const instructorNotes = h => h.state.notes.filter(note => note.dedupeKey.startsWith('new-student:'));

test('two approved payments for one course create one enrollment and one enrollment notification, with both payments recorded', async () => {
  for (const kind of ['patch', 'approve']) {
    const h = harness({ enrollment: null, extraPayments: [secondPayment()] });
    assert.equal((await approve(h, kind, {}, PAYMENT_ID)).status, 200);
    assert.equal((await approve(h, kind, {}, SECOND_ID)).status, 200);
    assert.deepEqual([h.state.payment.status, h.state.more[0].status], ['APPROVED', 'APPROVED']);
    assert.equal(h.creates.length, 2);
    assert.equal(enrollmentNotes(h).length, 1);
    assert.equal(enrollmentNotes(h)[0].userId, BUYER_ID);
    assert.equal(enrollmentNotes(h)[0].dedupeKey, `enrolled:${PAYMENT_ID}:${BUYER_ID}`);
    assert.equal(instructorNotes(h).length, 1);
    // Historical payment handling is unchanged: each approved payment is still credited to the instructor.
    assert.equal(h.credits.length, 2);
    assert.equal(h.state.walletUSD, 50);
  }
});

test('concurrent approval of two payments for one course announces the enrollment once', async () => {
  const h = harness({ enrollment: null, extraPayments: [secondPayment()] });
  const responses = await Promise.all([
    approve(h, 'patch', {}, PAYMENT_ID), approve(h, 'approve', {}, SECOND_ID),
    approve(h, 'patch', {}, SECOND_ID), approve(h, 'approve', {}, PAYMENT_ID),
  ]);
  assert.deepEqual(responses.map(response => response.status), [200, 200, 200, 200]);
  assert.deepEqual([h.state.payment.status, h.state.more[0].status], ['APPROVED', 'APPROVED']);
  assert.equal(enrollmentNotes(h).length, 1);
  assert.equal(instructorNotes(h).length, 1);
  assert.equal(h.state.notes.length, 2);
});

test('retrying an approved payment, before or after a second approval, adds no notification', async () => {
  const h = harness({ enrollment: null, extraPayments: [secondPayment()] });
  await approve(h, 'approve', {}, PAYMENT_ID);
  await approve(h, 'patch', {}, PAYMENT_ID);
  await approve(h, 'approve', {}, SECOND_ID);
  await approve(h, 'patch', {}, PAYMENT_ID);
  await approve(h, 'patch', {}, SECOND_ID);
  assert.equal(h.state.notes.length, 2);
  assert.equal(h.credits.length, 2);
});

test('approving a payment for a student who is already enrolled sends no enrollment notice and keeps progress', async () => {
  const h = harness();
  assert.equal((await approve(h, 'approve')).status, 200);
  assert.equal(h.state.payment.status, 'APPROVED');
  assert.equal(h.state.enrollment.progress, 67);
  assert.equal(h.state.notes.length, 0);
});

test('a rejected payment keeps its own notification, replays do not repeat it, and it never announces an enrollment', async () => {
  const h = harness({ enrollment: null, extraPayments: [secondPayment()] });
  for (let i = 0; i < 2; i++) assert.equal((await h.patch(request({ status: 'REJECTED' }, 'PATCH'), context())).status, 200);
  assert.deepEqual(h.state.notes.map(note => note.dedupeKey), [`payment-rejected:${PAYMENT_ID}:${BUYER_ID}`]);
  // A later approved payment still announces the enrollment it creates.
  assert.equal((await approve(h, 'approve', {}, SECOND_ID)).status, 200);
  assert.equal(enrollmentNotes(h).length, 1);
  assert.equal(h.state.notes.length, 3);
});

test('a failure rolls back the enrollment notification together with the approval', async t => {
  t.mock.method(console, 'error', () => {});
  const h = harness({ failCredit: true, enrollment: null });
  assert.equal((await approve(h, 'approve')).status, 500);
  assert.equal(h.state.notes.length, 0);
  assert.equal(h.state.enrollment, null);
});
