/* eslint-disable @typescript-eslint/no-require-imports -- Node test runner. */
const assert = require('node:assert/strict');
const { test } = require('node:test');
const { loadTs } = require('./load-ts.cjs');

function payment() {
  const context = { version: 1, paymentId: 'payment', userId: 'buyer', courseId: 'course', amountMinor: 2500, currency: 'USD', state: 'READY' };
  return { id: 'payment', userId: 'buyer', courseId: 'course', amount: 25, provider: 'STRIPE', transactionId: 'transaction', status: 'PENDING', providerResponse: JSON.stringify(context) };
}
function harness(options = {}) {
  let state = { payment: { ...payment(), ...options.payment }, enrollment: options.existing ? { userId: 'buyer', courseId: 'course', progress: 79 } : null };
  const calls = [];
  let queue = Promise.resolve();
  const proof = { transactionId: 'transaction', referenceId: 'payment', amountMinor: 2500, currency: 'USD', ...options.proof };
  const mocks = {
    '@/lib/db': { prisma: { payment: { findMany: async args => {
      calls.push({ name: 'lookup', args });
      if (options.ambiguous) return [state.payment, { ...state.payment, id: 'duplicate' }];
      return state.payment.provider === args.where.provider && state.payment.transactionId === args.where.transactionId ? [structuredClone(state.payment)] : [];
    } } } },
    './checkout': { PAYMENT_HEADERS: { 'Cache-Control': 'private, no-store' } },
    './PaymentFactory': { PaymentFactory: { getProvider: () => ({
      verifyWebhook: async (_req, rawBody) => { calls.push({ name: 'signature', rawBody }); return options.signature !== false; },
      verifyPayment: async (id, expected) => {
        calls.push({ name: 'proof', id, expected });
        if (options.providerError) throw new Error('secret upstream details');
        return options.invalidProof ? null : proof;
      },
    }) } },
    './transactions': { withPaymentTransaction: async fn => {
      const previous = queue; let release; queue = new Promise(resolve => { release = resolve; }); await previous;
      const working = structuredClone(state);
      const tx = {
        payment: {
          findUnique: async () => {
            if (options.changed) working.payment.amount = 0.01;
            return structuredClone(working.payment);
          },
          updateMany: async ({ where, data }) => {
            calls.push({ name: 'claim', where, data });
            if (options.lostClaim || !Object.entries(where).every(([k, v]) => working.payment[k] === v)) return { count: 0 };
            Object.assign(working.payment, data); return { count: 1 };
          },
        },
        enrollment: { upsert: async args => {
          calls.push({ name: 'enroll', args });
          if (options.failEnrollment) throw new Error('private database detail');
          if (working.enrollment) Object.assign(working.enrollment, args.update);
          else working.enrollment = { ...args.create };
        } },
      };
      try { const result = await fn(tx); state = working; return result; } finally { release(); }
    } },
  };
  return { handle: loadTs('../src/lib/payments/webhook.ts', mocks).handlePaymentWebhook, calls, get state() { return state; } };
}
function request(body = { type: 'checkout.session.completed', data: { object: { id: 'transaction' } } }) {
  return new Request('https://academy.test/api/webhooks/payments/stripe', { method: 'POST', body: typeof body === 'string' ? body : JSON.stringify(body) });
}

test('unauthenticated webhooks cannot read the payment database or grant access', async () => {
  const h = harness({ signature: false });
  assert.equal((await h.handle(request(), 'STRIPE')).status, 401);
  assert.deepEqual(h.calls.map(c => c.name), ['signature']); assert.equal(h.state.enrollment, null);
});

test('only a matching captured server proof atomically approves the stored buyer and course', async () => {
  const h = harness({ existing: true });
  const response = await h.handle(request(), 'STRIPE'); assert.equal(response.status, 200);
  assert.equal(h.state.payment.status, 'APPROVED'); assert.equal(JSON.parse(h.state.payment.providerResponse).state, 'VERIFIED');
  assert.deepEqual(h.state.enrollment, { userId: 'buyer', courseId: 'course', progress: 79 });
  assert.deepEqual(h.calls.map(c => c.name), ['signature', 'lookup', 'proof', 'claim', 'enroll']);
  assert.deepEqual(h.calls.find(c => c.name === 'enroll').args.update, {});
});

test('concurrent notifications and replay never duplicate enrollment or status transitions', async () => {
  const h = harness();
  const responses = await Promise.all([h.handle(request(), 'STRIPE'), h.handle(request(), 'STRIPE')]);
  assert.ok(responses.every(r => r.status === 200));
  assert.equal((await h.handle(request(), 'STRIPE')).status, 200);
  assert.equal(h.calls.filter(c => c.name === 'claim').length, 1);
  assert.equal(h.calls.filter(c => c.name === 'enroll').length, 1);
});

test('unpaid, wrong amount, currency, reference or transaction proofs fail closed', async () => {
  for (const config of [{ invalidProof: true }, { proof: { amountMinor: 1 } }, { proof: { currency: 'SAR' } },
    { proof: { referenceId: 'victim-payment' } }, { proof: { transactionId: 'other-transaction' } }]) {
    const h = harness(config); assert.equal((await h.handle(request(), 'STRIPE')).status, 422);
    assert.equal(h.state.payment.status, 'PENDING'); assert.equal(h.state.enrollment, null);
    assert.equal(h.calls.some(c => c.name === 'claim'), false);
  }
});

test('ambiguous, old, rejected or changed records require reconciliation rather than guessing', async () => {
  for (const config of [{ ambiguous: true }, { payment: { providerResponse: null } }, { payment: { status: 'REJECTED' } },
    { changed: true }, { lostClaim: true }, { payment: { provider: 'PAYPAL' } }]) {
    const h = harness(config); assert.equal((await h.handle(request(), 'STRIPE')).status, 409);
    assert.equal(h.state.enrollment, null);
  }
});

test('enrollment or provider failures never leave an approved payment and hide internal errors', async () => {
  for (const config of [{ failEnrollment: true }, { providerError: true }]) {
    const h = harness(config); const response = await h.handle(request(), 'STRIPE');
    assert.equal(response.status, 503); assert.doesNotMatch(await response.text(), /private|secret|database|upstream/);
    assert.equal(h.state.payment.status, 'PENDING'); assert.equal(h.state.enrollment, null);
  }
});

test('manual or unknown providers, oversized bodies and malformed signed JSON cannot mutate payments', async () => {
  for (const provider of ['MANUAL', 'UNKNOWN']) {
    const h = harness(); assert.equal((await h.handle(request(), provider)).status, 400); assert.deepEqual(h.calls, []);
  }
  const h = harness(); assert.equal((await h.handle(request('x'.repeat(262145)), 'STRIPE')).status, 413);
  assert.deepEqual(h.calls, []);
  assert.equal((await h.handle(request('{'), 'STRIPE')).status, 400); assert.equal(h.state.enrollment, null);
});

test('irrelevant signed events are acknowledged without database lookup', async () => {
  const h = harness(); assert.equal((await h.handle(request({ type: 'charge.refunded' }), 'STRIPE')).status, 200);
  assert.deepEqual(h.calls.map(c => c.name), ['signature']);
});

test('PayPal capture events locate the order id and never trust an approval-only notification', async () => {
  const h = harness({ payment: { provider: 'PAYPAL' } });
  const event = { event_type: 'PAYMENT.CAPTURE.COMPLETED', resource: { id: 'capture-not-order', supplementary_data: { related_ids: { order_id: 'transaction' } } } };
  assert.equal((await h.handle(request(event), 'PAYPAL')).status, 200);
  assert.equal(h.calls.find(c => c.name === 'lookup').args.where.transactionId, 'transaction');
  const other = harness({ payment: { provider: 'PAYPAL' } });
  assert.equal((await other.handle(request({ event_type: 'CHECKOUT.ORDER.APPROVED', resource: { id: 'transaction' } }), 'PAYPAL')).status, 200);
  assert.equal(other.state.enrollment, null); assert.equal(other.calls.some(c => c.name === 'lookup'), false);
});

test('serialization conflicts retry a bounded transaction without hiding unrelated errors', async () => {
  let attempts = 0;
  const { withPaymentTransaction } = loadTs('../src/lib/payments/transactions.ts', {
    '@/lib/db': { prisma: { $transaction: async (fn, settings) => {
      attempts++; assert.equal(settings.isolationLevel, 'Serializable');
      if (attempts < 3) throw Object.assign(new Error('conflict'), { code: 'P2034' });
      return fn({ marker: true });
    } } },
  });
  assert.equal(await withPaymentTransaction(tx => tx.marker), true); assert.equal(attempts, 3);
  const always = loadTs('../src/lib/payments/transactions.ts', {
    '@/lib/db': { prisma: { $transaction: async () => { throw Object.assign(new Error('conflict'), { code: 'P2034' }); } } },
  });
  await assert.rejects(always.withPaymentTransaction(() => {}), { status: 409 });
});
