/* eslint-disable @typescript-eslint/no-require-imports -- Node's CommonJS test runner. */
const assert = require('node:assert/strict');
const { test, beforeEach, afterEach } = require('node:test');
const jwt = require('jsonwebtoken');
const StripeSdk = require('stripe');
const { loadTs } = require('./load-ts.cjs');

// All credentials are test-only fixtures. No provider SDK or fetch transport is
// allowed to contact a network; only Stripe's local signature routines are real.
const ENV = {
  NODE_ENV: 'test', NEXT_PUBLIC_APP_URL: 'https://academy.test',
  STRIPE_SECRET_KEY: 'sk_test_unit_fixture', STRIPE_WEBHOOK_SECRET: 'whsec_unit_fixture',
  PAYPAL_CLIENT_ID: 'paypal-unit-client', PAYPAL_CLIENT_SECRET: 'paypal-unit-secret',
  PAYPAL_WEBHOOK_ID: 'paypal-unit-webhook', PAYPAL_ENVIRONMENT: 'sandbox',
  TABBY_SECRET_KEY: 'sk_test_unit_fixture', TABBY_MERCHANT_CODE: 'unit-merchant',
  TABBY_WEBHOOK_SECRET: 'tabby-unit-webhook-secret', TABBY_WEBHOOK_HEADER: 'X-Auth-Key',
  TABBY_API_BASE_URL: 'https://api.tabby.ai',
  TAMARA_MERCHANT_TOKEN: 'tamara-unit-token', TAMARA_NOTIFICATION_TOKEN: 'tamara-unit-notification-secret',
  TAMARA_ENVIRONMENT: 'sandbox',
};
const originalEnv = Object.fromEntries(Object.keys(ENV).map(key => [key, process.env[key]]));
const originalFetch = globalThis.fetch;
beforeEach(() => {
  Object.assign(process.env, ENV);
  globalThis.fetch = async () => { throw new Error('Unexpected network access in provider test'); };
});
afterEach(() => {
  for (const key of Object.keys(ENV)) {
    if (originalEnv[key] === undefined) delete process.env[key];
    else process.env[key] = originalEnv[key];
  }
  globalThis.fetch = originalFetch;
});

const PAYMENT_ID = `checkout_${'a'.repeat(64)}`;
const USER_ID = `c${'b'.repeat(24)}`;
const COURSE_ID = `c${'c'.repeat(24)}`;
function expected(currency = 'USD') {
  return { paymentId: PAYMENT_ID, userId: USER_ID, courseId: COURSE_ID, amountMinor: 2500, currency };
}
function metadata(currency = 'USD') {
  return { ...expected(currency), courseName: 'دورة اختبار', userName: 'طالب اختبار', userEmail: 'student@example.test', userPhone: '+971500000001' };
}
function binding(currency = 'USD') {
  const { paymentId, userId, courseId } = expected(currency);
  return { paymentId, userId, courseId };
}
const proof = (transactionId, currency = 'USD') => ({ transactionId, referenceId: PAYMENT_ID, amountMinor: 2500, currency });
const response = (value, status = 200) => new Response(JSON.stringify(value), { status, headers: { 'Content-Type': 'application/json' } });
const webhook = (headers = {}, url = 'https://academy.test/api/webhooks/payments/provider') => new Request(url, { method: 'POST', headers });

function httpMock(resolve) {
  const calls = [];
  globalThis.fetch = async (url, options = {}) => {
    const call = { url: String(url), options };
    calls.push(call);
    assert.equal(options.cache, 'no-store');
    assert.equal(options.redirect, 'error');
    assert.ok(options.signal instanceof AbortSignal);
    if (call.url.endsWith('/v1/oauth2/token')) return response({ access_token: 'unit-access-token' });
    return resolve(call);
  };
  return calls;
}

function httpAdapter(name) {
  const Adapter = loadTs(`../src/lib/payments/adapters/${name}Adapter.ts`)[`${name}Adapter`];
  return new Adapter();
}

function stripeFixture() {
  return {
    id: 'cs_unit_checkout', status: 'complete', mode: 'payment', payment_status: 'paid',
    livemode: false, metadata: binding(), client_reference_id: PAYMENT_ID,
    amount_total: 2500, currency: 'usd', url: 'https://checkout.stripe.com/c/pay/unit',
    payment_intent: {
      status: 'succeeded', amount_received: 2500, currency: 'usd', metadata: binding(),
      latest_charge: {
        paid: true, status: 'succeeded', refunded: false, amount_refunded: 0, disputed: false,
        amount_captured: 2500, currency: 'usd',
      },
    },
  };
}

function stripeHarness(fixture = stripeFixture()) {
  const creates = [];
  const retrieves = [];
  const localWebhooks = new StripeSdk('sk_test_unit_local_signatures').webhooks;
  class MockStripe {
    constructor(key, options) {
      assert.equal(key, process.env.STRIPE_SECRET_KEY);
      assert.deepEqual(options, { timeout: 15_000, maxNetworkRetries: 0 });
      this.checkout = { sessions: {
        create: async (...args) => { creates.push(args); return fixture; },
        retrieve: async (...args) => { retrieves.push(args); return fixture; },
      } };
      this.webhooks = localWebhooks;
    }
  }
  const { StripeAdapter } = loadTs('../src/lib/payments/adapters/StripeAdapter.ts', { stripe: MockStripe });
  return { adapter: new StripeAdapter(), creates, retrieves, localWebhooks };
}

function paypalFixture() {
  return { id: 'PAYPAL_ORDER', status: 'COMPLETED', purchase_units: [{
    reference_id: PAYMENT_ID, custom_id: PAYMENT_ID, amount: { value: '25.00', currency_code: 'USD' },
    payments: { captures: [{ status: 'COMPLETED', amount: { value: '25.00', currency_code: 'USD' } }] },
  }] };
}
function tabbyFixture() {
  return { id: 'tabby_payment', status: 'CLOSED', is_test: true, amount: '25.00', currency: 'SAR',
    meta: binding('SAR'), order: { reference_id: PAYMENT_ID }, captures: [{ amount: '25.00' }], refunds: [] };
}
function tamaraFixture() {
  return { order_id: 'tamara_order', order_reference_id: PAYMENT_ID, status: 'fully_captured',
    total_amount: { amount: 25, currency: 'SAR' }, additional_data: binding('SAR'), is_test: true,
    items: [{ reference_id: COURSE_ID, quantity: 1 }], refunds: [], refunded_amount: { amount: 0, currency: 'SAR' } };
}

test('providers fail closed when required credentials or notification secrets are absent', async () => {
  const cases = [
    ['Stripe', 'USD', ['STRIPE_SECRET_KEY', 'STRIPE_WEBHOOK_SECRET']],
    ['PayPal', 'USD', ['PAYPAL_CLIENT_ID', 'PAYPAL_CLIENT_SECRET', 'PAYPAL_WEBHOOK_ID']],
    ['Tabby', 'SAR', ['TABBY_SECRET_KEY', 'TABBY_MERCHANT_CODE', 'TABBY_WEBHOOK_SECRET']],
    ['Tamara', 'SAR', ['TAMARA_MERCHANT_TOKEN', 'TAMARA_NOTIFICATION_TOKEN']],
  ];
  for (const [name, currency, keys] of cases) {
    for (const key of keys) {
      Object.assign(process.env, ENV);
      delete process.env[key];
      const calls = httpMock(() => { throw new Error('No provider request expected'); });
      const adapter = name === 'Stripe' ? stripeHarness().adapter : httpAdapter(name);
      assert.equal((await adapter.createPaymentIntent(25, currency, metadata(currency))).success, false, `${name}:${key}`);
      if (['STRIPE_SECRET_KEY', 'PAYPAL_CLIENT_ID', 'PAYPAL_CLIENT_SECRET', 'TABBY_SECRET_KEY', 'TAMARA_MERCHANT_TOKEN'].includes(key)) {
        assert.equal(await adapter.verifyPayment('transaction_1', expected(currency)), null, `${name}:${key} proof`);
      }
      assert.equal(calls.length, 0);
    }
  }
});

test('Stripe creation binds server identities, amount and idempotency key, and rejects foreign checkout origins or mode', async () => {
  const h = stripeHarness();
  assert.deepEqual(await h.adapter.createPaymentIntent(25, 'USD', metadata()), {
    success: true, transactionId: 'cs_unit_checkout', checkoutUrl: 'https://checkout.stripe.com/c/pay/unit',
  });
  const [payload, options] = h.creates[0];
  assert.deepEqual(options, { idempotencyKey: PAYMENT_ID });
  assert.deepEqual(payload.metadata, binding());
  assert.deepEqual(payload.payment_intent_data.metadata, binding());
  assert.equal(payload.client_reference_id, PAYMENT_ID);
  assert.equal(payload.line_items[0].price_data.unit_amount, 2500);
  for (const changes of [{ url: 'https://checkout.stripe.com.evil.test/pay' }, { url: 'javascript:alert(1)' }, { livemode: true }]) {
    const bad = stripeHarness({ ...stripeFixture(), ...changes });
    assert.equal((await bad.adapter.createPaymentIntent(25, 'USD', metadata())).success, false);
  }
});

test('Stripe proof requires completed captured payment and exact local amount, currency and identity bindings', async () => {
  const good = stripeHarness();
  assert.deepEqual(await good.adapter.verifyPayment('cs_unit_checkout', expected()), proof('cs_unit_checkout'));
  assert.deepEqual(good.retrieves[0], ['cs_unit_checkout', { expand: ['payment_intent.latest_charge'] }]);
  const mutations = [
    value => { value.status = 'open'; },
    value => { value.payment_status = 'unpaid'; },
    value => { value.livemode = true; },
    value => { value.id = 'other_checkout'; },
    value => { value.client_reference_id = 'other_payment'; },
    value => { value.amount_total = 2499; },
    value => { value.currency = 'eur'; },
    value => { value.metadata.userId = 'other_user'; },
    value => { value.metadata.courseId = 'other_course'; },
    value => { value.payment_intent.metadata.paymentId = 'other_payment'; },
    value => { value.payment_intent.amount_received = 2499; },
    value => { value.payment_intent.status = 'requires_capture'; },
    value => { value.payment_intent.latest_charge.amount_captured = 2499; },
    value => { value.payment_intent.latest_charge.disputed = true; },
    value => { value.payment_intent.latest_charge.refunded = true; },
    value => { value.payment_intent.latest_charge.amount_refunded = 1; },
  ];
  for (const mutate of mutations) {
    const fixture = stripeFixture();
    mutate(fixture);
    assert.equal(await stripeHarness(fixture).adapter.verifyPayment('cs_unit_checkout', expected()), null);
  }
});

test('Stripe webhook uses real local SDK signature checks for valid, altered, expired and wrong-mode events', async () => {
  const h = stripeHarness();
  const raw = JSON.stringify({ id: 'evt_unit', type: 'checkout.session.completed', livemode: false, data: { object: { id: 'cs_unit_checkout' } } });
  const header = h.localWebhooks.generateTestHeaderString({ payload: raw, secret: ENV.STRIPE_WEBHOOK_SECRET });
  assert.equal(await h.adapter.verifyWebhook(webhook({ 'stripe-signature': header }), raw), true);
  assert.equal(await h.adapter.verifyWebhook(webhook(), raw), false);
  assert.equal(await h.adapter.verifyWebhook(webhook({ 'stripe-signature': header }), `${raw} `), false);
  for (const options of [{ secret: 'wrong-unit-secret' }, { timestamp: Math.floor(Date.now() / 1000) - 3600 }]) {
    const invalid = h.localWebhooks.generateTestHeaderString({ payload: raw, secret: ENV.STRIPE_WEBHOOK_SECRET, ...options });
    assert.equal(await h.adapter.verifyWebhook(webhook({ 'stripe-signature': invalid }), raw), false);
  }
  const liveRaw = JSON.stringify({ id: 'evt_live_unit', livemode: true, data: { object: {} } });
  const liveHeader = h.localWebhooks.generateTestHeaderString({ payload: liveRaw, secret: ENV.STRIPE_WEBHOOK_SECRET });
  assert.equal(await h.adapter.verifyWebhook(webhook({ 'stripe-signature': liveHeader }), liveRaw), false);
  delete process.env.STRIPE_WEBHOOK_SECRET;
  assert.equal(await h.adapter.verifyWebhook(webhook({ 'stripe-signature': header }), raw), false);
});

test('PayPal creation supports real-length references and compact deterministic request IDs', async () => {
  const calls = httpMock(() => response({ id: 'PAYPAL_ORDER', links: [{ rel: 'approve', href: 'https://www.sandbox.paypal.com/checkoutnow?token=unit' }] }));
  const adapter = httpAdapter('PayPal');
  for (let attempt = 0; attempt < 2; attempt++) {
    assert.equal((await adapter.createPaymentIntent(25, 'USD', metadata())).success, true);
  }
  assert.equal(PAYMENT_ID.length, 73);
  const orders = calls.filter(call => call.url.endsWith('/v2/checkout/orders'));
  assert.equal(orders.length, 2);
  const payload = JSON.parse(orders[0].options.body);
  assert.equal(payload.purchase_units[0].custom_id, PAYMENT_ID);
  assert.equal(payload.purchase_units[0].reference_id, PAYMENT_ID);
  assert.ok(payload.purchase_units[0].custom_id.length <= 127);
  assert.equal(payload.purchase_units[0].amount.value, '25.00');
  const firstKey = orders[0].options.headers['PayPal-Request-Id'];
  assert.ok(firstKey.length <= 38);
  assert.equal(firstKey, orders[1].options.headers['PayPal-Request-Id']);
});

test('PayPal proof accepts captured COMPLETED orders and rejects APPROVED, partial, refunded or mismatched orders', async () => {
  let fixture = paypalFixture();
  httpMock(() => response(fixture));
  const adapter = httpAdapter('PayPal');
  assert.deepEqual(await adapter.verifyPayment('PAYPAL_ORDER', expected()), proof('PAYPAL_ORDER'));
  const mutations = [
    value => { value.status = 'APPROVED'; },
    value => { value.id = 'OTHER_ORDER'; },
    value => { value.purchase_units[0].reference_id = 'other_payment'; },
    value => { value.purchase_units[0].custom_id = 'another_payment'; },
    value => { value.purchase_units[0].amount.value = '24.99'; },
    value => { value.purchase_units[0].amount.currency_code = 'EUR'; },
    value => { value.purchase_units[0].payments.captures = []; },
    value => { value.purchase_units[0].payments.captures[0].status = 'PENDING'; },
    value => { value.purchase_units[0].payments.captures[0].amount.value = '20.00'; },
    value => { value.purchase_units[0].payments.captures[0].amount.currency_code = 'EUR'; },
    value => { value.purchase_units[0].payments.refunds = [{ id: 'refund' }]; },
  ];
  for (const mutate of mutations) {
    fixture = paypalFixture();
    mutate(fixture);
    assert.equal(await adapter.verifyPayment('PAYPAL_ORDER', expected()), null);
  }
});

test('PayPal webhook trusts only its verification API success and forwards the exact registered event/signature', async () => {
  let verified = 'SUCCESS';
  const calls = httpMock(() => response({ verification_status: verified }));
  const adapter = httpAdapter('PayPal');
  const headers = { 'paypal-auth-algo': 'SHA256withRSA', 'paypal-cert-url': 'https://api-m.sandbox.paypal.com/cert/unit',
    'paypal-transmission-id': 'unit-transmission', 'paypal-transmission-sig': 'unit-signature',
    'paypal-transmission-time': '2026-11-09T09:00:00Z' };
  const raw = JSON.stringify({ id: 'EVENT_UNIT', event_type: 'PAYMENT.CAPTURE.COMPLETED' });
  assert.equal(await adapter.verifyWebhook(webhook(headers), raw), true);
  const verification = calls.find(call => call.url.endsWith('/verify-webhook-signature'));
  const sent = JSON.parse(verification.options.body);
  assert.equal(sent.webhook_id, ENV.PAYPAL_WEBHOOK_ID);
  assert.deepEqual(sent.webhook_event, JSON.parse(raw));
  assert.equal(sent.transmission_sig, headers['paypal-transmission-sig']);
  verified = 'FAILURE';
  assert.equal(await adapter.verifyWebhook(webhook(headers), raw), false);
  const before = calls.length;
  assert.equal(await adapter.verifyWebhook(webhook(), raw), false);
  assert.equal(calls.length, before);
  delete process.env.PAYPAL_WEBHOOK_ID;
  assert.equal(await adapter.verifyWebhook(webhook(headers), raw), false);
});

test('Tabby creation binds payment/buyer/course metadata and rejects deceptive checkout URLs', async () => {
  let url = 'https://checkout.tabby.ai/session/unit';
  const calls = httpMock(() => response({ status: 'created', payment: { id: 'tabby_payment' },
    configuration: { available_products: { installments: [{ web_url: url }] } } }));
  const adapter = httpAdapter('Tabby');
  assert.equal((await adapter.createPaymentIntent(25, 'SAR', metadata('SAR'))).success, true);
  const payload = JSON.parse(calls[0].options.body);
  assert.deepEqual(payload.payment.meta, binding('SAR'));
  assert.equal(payload.payment.order.reference_id, PAYMENT_ID);
  assert.equal(payload.payment.amount, '25.00');
  url = 'https://tabby.ai.attacker.test/session';
  assert.equal((await adapter.createPaymentIntent(25, 'SAR', metadata('SAR'))).success, false);
});

test('Tabby proof requires CLOSED captured payments and exact totals, currency, merchant reference and identities', async () => {
  let fixture = tabbyFixture();
  httpMock(() => response(fixture));
  const adapter = httpAdapter('Tabby');
  assert.deepEqual(await adapter.verifyPayment('tabby_payment', expected('SAR')), proof('tabby_payment', 'SAR'));
  fixture.captures = [{ amount: '10.00' }, { amount: '15.00' }];
  assert.deepEqual(await adapter.verifyPayment('tabby_payment', expected('SAR')), proof('tabby_payment', 'SAR'));
  const mutations = [
    value => { value.status = 'AUTHORIZED'; },
    value => { value.id = 'another_payment'; },
    value => { value.is_test = false; },
    value => { value.amount = '24.99'; },
    value => { value.amount = '25.001'; },
    value => { value.currency = 'AED'; },
    value => { value.order.reference_id = 'other_payment'; },
    value => { value.meta.paymentId = 'other_payment'; },
    value => { value.meta.userId = 'other_user'; },
    value => { value.meta.courseId = 'other_course'; },
    value => { value.captures = []; },
    value => { value.captures = [{ amount: '24.99' }]; },
    value => { value.refunds = [{ id: 'refund' }]; },
  ];
  for (const mutate of mutations) {
    fixture = tabbyFixture();
    mutate(fixture);
    assert.equal(await adapter.verifyPayment('tabby_payment', expected('SAR')), null);
  }
});

test('Tabby webhook compares the configured secret exactly and rejects missing, invalid or oversized signatures', async () => {
  const adapter = httpAdapter('Tabby');
  assert.equal(await adapter.verifyWebhook(webhook({ 'X-Auth-Key': ENV.TABBY_WEBHOOK_SECRET }), '{}'), true);
  for (const headers of [{}, { 'X-Auth-Key': 'wrong-secret' }, { 'X-Auth-Key': 'a'.repeat(4097) }]) {
    assert.equal(await adapter.verifyWebhook(webhook(headers), '{}'), false);
  }
  process.env.TABBY_WEBHOOK_HEADER = 'X-Custom-Provider-Secret';
  assert.equal(await adapter.verifyWebhook(webhook({ 'X-Auth-Key': ENV.TABBY_WEBHOOK_SECRET }), '{}'), false);
  assert.equal(await adapter.verifyWebhook(webhook({ 'X-Custom-Provider-Secret': ENV.TABBY_WEBHOOK_SECRET }), '{}'), true);
  delete process.env.TABBY_WEBHOOK_SECRET;
  assert.equal(await adapter.verifyWebhook(webhook({ 'X-Custom-Provider-Secret': ENV.TABBY_WEBHOOK_SECRET }), '{}'), false);
});

test('Tamara creation binds server references, buyer identities and trusted notification/checkout URLs', async () => {
  let url = 'https://checkout-sandbox.tamara.co/unit';
  const calls = httpMock(() => response({ order_id: 'tamara_order', checkout_url: url }));
  const adapter = httpAdapter('Tamara');
  assert.equal((await adapter.createPaymentIntent(25, 'SAR', metadata('SAR'))).success, true);
  const payload = JSON.parse(calls[0].options.body);
  assert.equal(payload.order_reference_id, PAYMENT_ID);
  assert.deepEqual(payload.additional_data, binding('SAR'));
  assert.equal(payload.items[0].reference_id, COURSE_ID);
  assert.deepEqual(payload.total_amount, { amount: 25, currency: 'SAR' });
  assert.equal(payload.merchant_url.notification, 'https://academy.test/api/webhooks/payments/tamara');
  url = 'https://tamara.co.attacker.test/checkout';
  assert.equal((await adapter.createPaymentIntent(25, 'SAR', metadata('SAR'))).success, false);
});

test('Tamara proof accepts only fully_captured and rejects authorisation, mismatched identities, totals, currency or refunds', async () => {
  let fixture = tamaraFixture();
  httpMock(() => response(fixture));
  const adapter = httpAdapter('Tamara');
  assert.deepEqual(await adapter.verifyPayment('tamara_order', expected('SAR')), proof('tamara_order', 'SAR'));
  const mutations = [
    value => { value.status = 'approved'; },
    value => { value.status = 'authorised'; },
    value => { value.status = 'AUTHORISED'; },
    value => { value.order_id = 'other_order'; },
    value => { value.order_reference_id = 'other_payment'; },
    value => { value.total_amount.amount = 24.99; },
    value => { value.total_amount.currency = 'AED'; },
    value => { value.additional_data.paymentId = 'other_payment'; },
    value => { value.additional_data.userId = 'other_user'; },
    value => { value.items[0].reference_id = 'other_course'; },
    value => { value.items[0].quantity = 2; },
    value => { value.is_test = false; },
    value => { value.refunds = [{ id: 'refund' }]; },
    value => { value.refunded_amount.amount = 1; },
    value => { value.canceled_amount = { amount: 1, currency: 'SAR' }; },
  ];
  for (const mutate of mutations) {
    fixture = tamaraFixture();
    mutate(fixture);
    assert.equal(await adapter.verifyPayment('tamara_order', expected('SAR')), null);
  }
});

test('Tamara notification tokens require a valid unexpired HS256 signature and numeric expiration', async () => {
  const adapter = httpAdapter('Tamara');
  const sign = (claims = {}, options = {}, secret = ENV.TAMARA_NOTIFICATION_TOKEN) =>
    jwt.sign(claims, secret, { algorithm: 'HS256', ...options });
  const valid = sign({}, { expiresIn: '5m' });
  assert.equal(await adapter.verifyWebhook(webhook({ Authorization: `Bearer ${valid}` }), '{}'), true);
  const query = `https://academy.test/api/webhooks/payments/tamara?tamaraToken=${encodeURIComponent(valid)}`;
  assert.equal(await adapter.verifyWebhook(webhook({}, query), '{}'), true);
  const unsigned = `${Buffer.from(JSON.stringify({ alg: 'none', typ: 'JWT' })).toString('base64url')}.${Buffer.from(JSON.stringify({ exp: Math.floor(Date.now() / 1000) + 60 })).toString('base64url')}.`;
  const invalid = [
    'invalid-token', sign({ exp: Math.floor(Date.now() / 1000) - 60 }), sign(),
    sign({}, { expiresIn: '5m', algorithm: 'HS384' }), sign({}, { expiresIn: '5m' }, 'wrong-unit-secret'), unsigned,
  ];
  for (const token of invalid) assert.equal(await adapter.verifyWebhook(webhook({ Authorization: `Bearer ${token}` }), '{}'), false);
  assert.equal(await adapter.verifyWebhook(webhook(), '{}'), false);
  delete process.env.TAMARA_NOTIFICATION_TOKEN;
  assert.equal(await adapter.verifyWebhook(webhook({ Authorization: `Bearer ${valid}` }), '{}'), false);
});

test('all online adapters reject request amount/currency mismatches before provider calls', async () => {
  for (const [name, currency] of [['Stripe', 'USD'], ['PayPal', 'USD'], ['Tabby', 'SAR'], ['Tamara', 'SAR']]) {
    const calls = httpMock(() => { throw new Error('Mismatched request must not contact provider'); });
    const h = name === 'Stripe' ? stripeHarness() : null;
    const adapter = h?.adapter ?? httpAdapter(name);
    for (const [amount, submittedCurrency, data] of [
      [24.99, currency, metadata(currency)], [NaN, currency, metadata(currency)],
      [25, currency, { ...metadata(currency), amountMinor: 1 }],
      [25, currency, { ...metadata(currency), currency: 'EUR' }], [25, 'EUR', metadata(currency)],
    ]) assert.equal((await adapter.createPaymentIntent(amount, submittedCurrency, data)).success, false, name);
    assert.equal(calls.length, 0);
    if (h) assert.equal(h.creates.length, 0);
  }
});

test('HTTP provider verification errors and malformed responses produce no payment proof', async () => {
  for (const [name, currency, id] of [['PayPal', 'USD', 'PAYPAL_ORDER'], ['Tabby', 'SAR', 'tabby_payment'], ['Tamara', 'SAR', 'tamara_order']]) {
    for (const mode of ['network-error', 'http-error', 'bad-json', 'wrong-shape']) {
      httpMock(() => {
        if (mode === 'network-error') throw new Error('Simulated provider outage');
        if (mode === 'http-error') return response({ error: 'denied' }, 401);
        if (mode === 'bad-json') return new Response('invalid-json', { status: 200 });
        return response([]);
      });
      assert.equal(await httpAdapter(name).verifyPayment(id, expected(currency)), null, `${name}:${mode}`);
    }
  }
});
