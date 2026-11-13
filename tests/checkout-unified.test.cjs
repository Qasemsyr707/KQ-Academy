/* eslint-disable @typescript-eslint/no-require-imports -- Node's CommonJS test runner. */
const assert = require('node:assert/strict');
const { test, beforeEach, afterEach } = require('node:test');
const { loadTs } = require('./load-ts.cjs');

// Unit checks for the unified (guest + member) checkout. No network or real
// database: Prisma, next-auth and the session are local fakes.
const ENV_KEYS = ['NODE_ENV', 'NEXT_PUBLIC_APP_URL', 'STRIPE_SECRET_KEY', 'STRIPE_WEBHOOK_SECRET'];
let savedEnv;
beforeEach(() => {
  savedEnv = Object.fromEntries(ENV_KEYS.map(key => [key, process.env[key]]));
  for (const key of ENV_KEYS) delete process.env[key];
  process.env.NODE_ENV = 'test';
});
afterEach(() => {
  for (const key of ENV_KEYS) {
    if (savedEnv[key] === undefined) delete process.env[key];
    else process.env[key] = savedEnv[key];
  }
});

const { safeCallbackPath, authHref } = loadTs('../src/lib/safe-redirect.ts');

test('post-login destinations accept only same-site relative paths', () => {
  assert.equal(safeCallbackPath('/checkout?courseId=abc123'), '/checkout?courseId=abc123');
  assert.equal(safeCallbackPath('/courses/x#reviews'), '/courses/x#reviews');
  for (const hostile of [
    '//evil.example', '/\\evil.example', '\\\\evil.example', 'https://evil.example/checkout', 'http:/evil.example',
    'javascript:alert(1)', '/api/checkout/gateway', '', ' /checkout', '/check\nout', `/${'a'.repeat(600)}`, null, undefined, 42,
  ]) {
    assert.equal(safeCallbackPath(hostile), null, `rejects ${JSON.stringify(hostile)}`);
  }
});

test('auth links carry an encoded, validated return path', () => {
  assert.equal(authHref('/login', '/checkout?courseId=abc'), '/login?callbackUrl=%2Fcheckout%3FcourseId%3Dabc');
  assert.equal(authHref('/register', '//evil.example'), '/register');
  assert.equal(authHref('/login', null), '/login');
});

function settingsDb(settings) {
  return { prisma: { setting: { findMany: async () => settings } } };
}

test('only gateways the purchase endpoint would accept are offered', async () => {
  const load = settings => loadTs('../src/lib/payments/public-checkout.ts', { '@/lib/db': settingsDb(settings) }).availableCheckoutMethods();

  assert.deepEqual(await load([]), ['WALLET', 'MANUAL'], 'Stripe needs keys; PayPal/Tabby/Tamara stay disabled');
  assert.deepEqual(await load([{ key: 'ENABLE_MANUAL', value: 'false' }]), ['WALLET'], 'admin switch is respected');
  assert.deepEqual(await load([{ key: 'ENABLE_PAYPAL', value: 'true' }, { key: 'ENABLE_TABBY', value: 'true' }]), ['WALLET', 'MANUAL'],
    'switching on an unsupported provider cannot expose it');

  Object.assign(process.env, {
    NEXT_PUBLIC_APP_URL: 'https://academy.test', STRIPE_SECRET_KEY: 'sk_test_unit', STRIPE_WEBHOOK_SECRET: 'whsec_unit',
  });
  assert.deepEqual(await load([]), ['STRIPE', 'WALLET', 'MANUAL'], 'fully configured Stripe is offered first');
  assert.deepEqual(await load([{ key: 'ENABLE_STRIPE', value: 'false' }]), ['WALLET', 'MANUAL']);
});

const COURSE = { id: 'course_1', title: 'Course', price: 25, priceSYP: 250000, thumbnail: null, instructor: { name: 'Teacher' } };

function previewHarness({ course = COURSE, session = null, enrolled = false, fail = false } = {}) {
  const calls = { course: [], enrollment: [] };
  const route = loadTs('../src/app/api/checkout/preview/route.ts', {
    '@/lib/db': { prisma: {
      course: { findFirst: async args => { calls.course.push(args); if (fail) throw new Error('db down'); return course; } },
      enrollment: { findUnique: async args => { calls.enrollment.push(args); return enrolled ? { id: 'e1' } : null; } },
    } },
    'next-auth': { getServerSession: async () => session },
    '@/lib/auth': { authOptions: {} },
    '@/lib/payments/public-checkout': { availableCheckoutMethods: async () => ['WALLET', 'MANUAL'] },
  });
  const get = id => route.GET(new Request(`https://academy.test/api/checkout/preview${id === undefined ? '' : `?courseId=${id}`}`));
  return { get, calls };
}

test('guests receive the same public checkout summary without private data', async () => {
  const h = previewHarness();
  const res = await h.get('course_1');
  assert.equal(res.status, 200);
  assert.match(res.headers.get('cache-control'), /no-store/);
  const body = await res.json();
  assert.deepEqual(body, { course: COURSE, methods: ['WALLET', 'MANUAL'], viewer: { authenticated: false, enrolled: false } });
  assert.deepEqual(h.calls.course[0].where, { id: 'course_1', status: 'PUBLISHED' }, 'only published courses are sellable');
  assert.equal(h.calls.enrollment.length, 0, 'no enrolment lookup for guests');
  assert.equal('wallet' in body, false, 'wallet balances never leave the authenticated endpoint');
});

test('signed-in customers see their enrolment state', async () => {
  const member = previewHarness({ session: { user: { id: 'user_1' } }, enrolled: true });
  const body = await (await member.get('course_1')).json();
  assert.deepEqual(body.viewer, { authenticated: true, enrolled: true });
  assert.deepEqual(member.calls.enrollment[0].where, { userId_courseId: { userId: 'user_1', courseId: 'course_1' } });

  const buyer = previewHarness({ session: { user: { id: 'user_2' } }, enrolled: false });
  assert.deepEqual((await (await buyer.get('course_1')).json()).viewer, { authenticated: true, enrolled: false });
});

test('invalid, hidden and failing lookups return clear statuses', async () => {
  assert.equal((await previewHarness().get(undefined)).status, 400);
  assert.equal((await previewHarness().get('%20course_1')).status, 400, 'untrimmed id');
  assert.equal((await previewHarness().get('x'.repeat(201))).status, 400, 'overlong id');
  assert.equal((await previewHarness({ course: null }).get('course_1')).status, 404);
  const original = console.error;
  console.error = () => {};
  try {
    assert.equal((await previewHarness({ fail: true }).get('course_1')).status, 503);
  } finally {
    console.error = original;
  }
});
