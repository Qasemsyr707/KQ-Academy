/* eslint-disable @typescript-eslint/no-require-imports -- Node test runner. */
const assert = require('node:assert/strict');
const { test } = require('node:test');
const { loadTs } = require('./load-ts.cjs');

function harness(options = {}) {
  const state = { payments: [], enrollments: options.enrolled ? [{ userId: 'buyer', courseId: 'course' }] : [] };
  const calls = [];
  let queue = Promise.resolve();
  const course = { id: 'course', title: 'Course', status: 'PUBLISHED', price: 25, priceSYP: 300000, ...options.course };
  class RequestUserError extends Error { constructor(status) { super('Authentication required'); this.status = status; } }
  const db = {
    setting: { findUnique: async () => options.disabled ? { value: 'false' } : null },
    course: { findUnique: async () => course },
    coupon: { findUnique: async () => options.coupon ?? null },
    enrollment: { findUnique: async ({ where }) => state.enrollments.find(e => e.userId === where.userId_courseId.userId && e.courseId === where.userId_courseId.courseId) },
    payment: {
      findUnique: async ({ where }) => state.payments.find(p => p.id === where.id),
      create: async ({ data }) => { calls.push('create'); const p = { transactionId: null, couponId: null,
        ...Object.fromEntries(Object.entries(data).filter(([, value]) => value !== undefined)) }; state.payments.push(p); return p; },
      updateMany: async ({ where, data }) => {
        const p = state.payments.find(p => Object.entries(where).every(([k, v]) => p[k] === v));
        if (!p) return { count: 0 };
        Object.assign(p, data); return { count: 1 };
      },
    },
  };
  const mocks = {
    '@/lib/db': { prisma: db },
    '@/lib/request-user': { RequestUserError, requireRequestUser: async () => {
      calls.push('auth'); if (options.denied) throw new RequestUserError(401);
      return { id: 'buyer', role: 'STUDENT', name: 'Buyer', email: 'buyer@example.test', phone: null };
    } },
    '@/lib/owned-document': { assertOwnedDocumentReference: async () => { calls.push('receipt-owner'); } },
    '@/lib/private-file-storage': { PrivateFileError: class extends Error {} },
    './availability': { checkoutAvailable: provider => ['STRIPE', 'MANUAL'].includes(provider) },
    './PaymentFactory': { PaymentFactory: { getProvider: provider => ({ createPaymentIntent: async (amount, currency, metadata) => {
      calls.push({ provider, amount, currency, metadata });
      if (options.providerFailure) return { success: false };
      return { success: true, transactionId: 'transaction', ...(provider === 'MANUAL' ? {} : { checkoutUrl: 'https://checkout.stripe.com/c/pay' }) };
    } }) } },
    './transactions': { withPaymentTransaction: async fn => {
      const previous = queue; let release; queue = new Promise(resolve => { release = resolve; }); await previous;
      try { return await fn(db); } finally { release(); }
    } },
  };
  const checkoutModule = loadTs('../src/lib/payments/checkout.ts', mocks);
  // Exercise every public entry point against the same implementation.
  const routeMocks = { '@/lib/payments/checkout': checkoutModule };
  return { state, calls, routes: {
    web: loadTs('../src/app/api/checkout/gateway/route.ts', routeMocks).POST,
    legacy: loadTs('../src/app/api/checkout/route.ts', routeMocks).POST,
    mobile: loadTs('../src/app/api/mobile/checkout/route.ts', routeMocks).POST,
  } };
}
function request(fields = {}, key = 'checkout-operation-0001') {
  return new Request('https://academy.test/api/checkout', { method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ courseId: 'course', provider: 'STRIPE', paymentType: 'online', operationId: key, ...fields }) });
}

test('all checkout endpoints reject unauthenticated identity before any payment write', async () => {
  for (const kind of ['web', 'legacy', 'mobile']) {
    const h = harness({ denied: true });
    assert.equal((await h.routes[kind](request({ userId: 'victim' }))).status, 401);
    assert.deepEqual(h.calls, ['auth']); assert.equal(h.state.payments.length, 0);
  }
});

test('forged buyer, amount, currency and success status never create paid access', async () => {
  for (const kind of ['web', 'legacy', 'mobile']) {
    const h = harness();
    const response = await h.routes[kind](request({ userId: 'victim', amount: 0.01, currency: 'SAR', status: 'APPROVED', transactionId: 'forged' }));
    assert.equal(response.status, 200);
    const body = await response.json();
    assert.equal(body.status, 'PENDING'); assert.equal(body.redirectUrl, body.url);
    assert.equal(body.redirectUrl, 'https://checkout.stripe.com/c/pay');
    assert.equal(response.headers.get('cache-control'), 'private, no-store');
    assert.equal(h.state.payments.length, 1);
    const p = h.state.payments[0];
    assert.equal(p.userId, 'buyer'); assert.equal(p.amount, 25); assert.equal(p.status, 'PENDING');
    assert.equal(JSON.parse(p.providerResponse).currency, 'USD'); assert.deepEqual(h.state.enrollments, []);
  }
});

test('simultaneous retries reuse the durable reservation and invoke provider exactly once', async () => {
  const h = harness();
  const responses = await Promise.all([h.routes.mobile(request()), h.routes.mobile(request())]);
  assert.ok(responses.every(r => [200, 409].includes(r.status)));
  const retry = await h.routes.mobile(request()); assert.equal(retry.status, 200);
  assert.equal(h.state.payments.length, 1); assert.equal(h.calls.filter(c => typeof c === 'object').length, 1);
});

test('uncertain provider result is not recreated on retry and never grants enrollment', async () => {
  const h = harness({ providerFailure: true });
  assert.equal((await h.routes.mobile(request())).status, 503);
  assert.equal((await h.routes.mobile(request())).status, 409);
  assert.equal(h.calls.filter(c => typeof c === 'object').length, 1);
  assert.equal(JSON.parse(h.state.payments[0].providerResponse).state, 'CREATING');
  assert.deepEqual(h.state.enrollments, []);
});

test('manual mobile purchase creates only one pending course payment and no wallet credit', async () => {
  const h = harness();
  const fields = { paymentType: 'local', userId: 'victim', amount: 1, receiptImage: '/uploads/receipt.png' };
  assert.equal((await h.routes.mobile(request(fields))).status, 200);
  assert.equal((await h.routes.mobile(request(fields))).status, 200);
  assert.equal(h.state.payments.length, 1); assert.equal(h.state.payments[0].amount, 300000);
  assert.equal(h.state.payments[0].provider, 'MANUAL'); assert.equal(h.state.payments[0].userId, 'buyer');
  assert.equal(JSON.parse(h.state.payments[0].providerResponse).currency, 'SYP');
  assert.deepEqual(h.state.enrollments, []);
});

test('manual web checkout accepts the existing FileReader raster receipt without uploading it twice', async () => {
  const receiptImage = `data:image/png;base64,${Buffer.from('unit-test-raster-fixture').toString('base64')}`;
  const h = harness();
  const response = await h.routes.web(request({ provider: 'MANUAL', receiptImage }));
  assert.equal(response.status, 200); assert.equal(h.state.payments[0].receiptImage, receiptImage);
  assert.equal(h.state.payments[0].status, 'PENDING'); assert.deepEqual(h.state.enrollments, []);
  for (const invalid of ['data:text/html;base64,AAAA', 'data:image/svg+xml;base64,AAAA', 'data:image/png;base64,!',
    `data:image/png;base64,${Buffer.alloc(2 * 1024 * 1024 + 1).toString('base64')}`]) {
    const denied = harness(); assert.equal((await denied.routes.web(request({ provider: 'MANUAL', receiptImage: invalid }))).status, 400);
    assert.equal(denied.state.payments.length, 0);
  }
});

test('server scopes coupons, prices and existing enrollment without resetting progress', async () => {
  const h = harness({ coupon: { id: 'discount', courseId: 'course', discount: 20 } });
  assert.equal((await h.routes.web(request({ couponCode: 'SAVE' }))).status, 200);
  assert.equal(h.state.payments[0].amount, 20);
  const already = harness({ enrolled: true });
  assert.equal((await already.routes.web(request())).status, 200);
  assert.equal(already.state.payments.length, 0); assert.equal(already.calls.filter(c => typeof c === 'object').length, 0);
});

test('unsupported, disabled, malformed and conflicting checkout requests fail without extra provider calls', async () => {
  for (const [options, fields] of [
    [{}, { provider: 'UNKNOWN' }], [{}, { provider: 'TABBY' }], [{}, { provider: 'TAMARA' }], [{}, { provider: 'PAYPAL' }],
    [{ disabled: true }, {}], [{ course: { status: 'DRAFT' } }, {}], [{ course: { price: -5 } }, {}],
    [{}, { operationId: '' }], [{}, { couponCode: 'INVALID' }], [{}, { provider: 'MANUAL', receiptImage: 'javascript:alert(1)' }],
    [{ coupon: { id: 'other', courseId: 'another-course', discount: 100 } }, { couponCode: 'WRONG' }],
  ]) {
    const h = harness(options); const res = await h.routes.web(request(fields));
    assert.ok(res.status >= 400); assert.equal(h.state.payments.length, 0);
  }
  const h = harness(); await h.routes.web(request());
  assert.equal((await h.routes.web(request({ provider: 'MANUAL', receiptImage: '/uploads/receipt.png' }))).status, 409);
  assert.equal(h.calls.filter(c => typeof c === 'object').length, 1);
});

test('browser checkout contract accepts pending redirects but never treats arbitrary 200 as paid', () => {
  const { checkoutResult } = loadTs('../src/lib/payments/checkout-result.ts');
  assert.deepEqual(checkoutResult({ success: true, status: 'PENDING', url: 'https://checkout.stripe.com/c/test' }, 'STRIPE'),
    { kind: 'redirect', url: 'https://checkout.stripe.com/c/test' });
  assert.deepEqual(checkoutResult({ success: true, pending: true, status: 'PENDING' }, 'MANUAL'), { kind: 'pending' });
  assert.deepEqual(checkoutResult({ alreadyEnrolled: true, status: 'APPROVED' }, 'STRIPE'), { kind: 'enrolled' });
  for (const url of ['javascript:alert(1)', 'https://checkout.stripe.com.evil.test/', 'https://evil.test/', 'http://checkout.stripe.com/', 'https://user:pass@checkout.stripe.com/']) {
    assert.throws(() => checkoutResult({ success: true, status: 'PENDING', redirectUrl: url }, 'STRIPE'));
  }
  assert.throws(() => checkoutResult({ url: 'https://checkout.stripe.com/' }, 'STRIPE'));
  assert.throws(() => checkoutResult({ success: true, status: 'APPROVED' }, 'MANUAL'));
});
