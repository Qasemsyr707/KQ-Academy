/* eslint-disable @typescript-eslint/no-require-imports -- Node test runner. */
const assert = require('node:assert/strict');
const { test } = require('node:test');
const { loadTs } = require('./load-ts.cjs');

function harness(options = {}) {
  let state = { user: { walletUSD: options.balance ?? 100, walletSYP: 0, points: 200 },
    enrollments: [], payments: [], bundles: [], subscriptions: [], transactions: options.transaction ? [options.transaction] : [] };
  let queue = Promise.resolve();
  const calls = [];
  class RequestUserError extends Error { constructor(status) { super('Denied'); this.status = status; } }
  function database(working) {
    const create = name => async ({ data }) => {
      if (options.failCreate) throw new Error('private database error');
      const entry = { id: `${name}-${working[name].length}`, ...data }; working[name].push(entry); return entry;
    };
    const match = (record, where) => Object.entries(where).every(([key, value]) => record[key] === value);
    return {
      setting: { findUnique: async () => options.disabled ? { value: 'false' } : null },
      course: { findUnique: async ({ where }) => ({ id: where.id, price: 25, priceSYP: 300000, status: 'PUBLISHED' }) },
      coupon: { findUnique: async () => null },
      enrollment: {
        findUnique: async ({ where }) => working.enrollments.find(e => match(e, where.userId_courseId)) ?? null,
        upsert: async ({ where, create: data, update }) => {
          const existing = working.enrollments.find(e => match(e, where.userId_courseId));
          if (existing) { Object.assign(existing, update); return existing; }
          const entry = { progress: 0, ...data }; working.enrollments.push(entry); return entry;
        },
      },
      user: {
        updateMany: async ({ where, data }) => {
          calls.push({ where, data }); assert.equal(where.id, 'buyer');
          for (const field of ['walletUSD', 'walletSYP', 'points']) {
            if (where[field]?.gte !== undefined && working.user[field] < where[field].gte) return { count: 0 };
          }
          for (const [field, change] of Object.entries(data)) working.user[field] += (change.increment ?? 0) - (change.decrement ?? 0);
          return { count: 1 };
        },
        update: async ({ where, data }) => { assert.equal(where.id, 'buyer'); for (const [field, change] of Object.entries(data)) working.user[field] += change.increment; },
        findUnique: async () => working.user,
      },
      payment: { create: create('payments') },
      courseBundle: { findUnique: async () => ({ id: 'bundle', price: 30, courses: [{ courseId: 'course' }, { courseId: 'other-course' }] }) },
      bundlePayment: { findFirst: async ({ where }) => working.bundles.find(e => match(e, where)) ?? null, create: create('bundles') },
      subscriptionPlan: { findUnique: async () => ({ id: 'plan', name: 'Plan', priceMonthly: 20, priceYearly: 200 }) },
      userSubscription: { findFirst: async () => working.subscriptions[0] ?? null, create: create('subscriptions') },
      walletTransaction: {
        create: create('transactions'),
        findUnique: async ({ where }) => working.transactions.find(e => e.id === where.id) ?? null,
        updateMany: async ({ where, data }) => { const entry = working.transactions.find(e => match(e, where)); if (!entry) return { count: 0 }; Object.assign(entry, data); return { count: 1 }; },
      },
    };
  }
  const mocks = {
    '@/lib/request-user': { RequestUserError, requireRequestUser: async (_req, roles) => {
      const role = options.role ?? 'STUDENT';
      if (options.denied) throw new RequestUserError(401);
      if (roles && !roles.includes(role)) throw new RequestUserError(403);
      return { id: 'buyer', role };
    } },
    '@/lib/db': { prisma: { walletTransaction: { create: async args => database(state).walletTransaction.create(args) } } },
    '@/lib/payments/transactions': { withPaymentTransaction: async fn => {
      const previous = queue; let release; queue = new Promise(resolve => { release = resolve; }); await previous;
      const working = structuredClone(state);
      try { const result = await fn(database(working)); state = working; return result; } finally { release(); }
    } },
  };
  mocks['@/lib/payments/checkout-context'] = loadTs('../src/lib/payments/checkout-context.ts', mocks);
  mocks['./checkout-context'] = mocks['@/lib/payments/checkout-context'];
  return { get state() { return state; }, calls, routes: Object.fromEntries(Object.entries({
    course: 'checkout/wallet', bundle: 'checkout/bundle', subscription: 'checkout/subscription',
    approve: 'admin/wallet/approve', points: 'wallet', withdraw: 'wallet/withdraw', deposit: 'wallet/deposit',
  }).map(([key, path]) => [key, loadTs(`../src/app/api/${path}/route.ts`, mocks).POST])) };
}
const request = body => new Request('https://academy.test/api/wallet', {
  method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
});

test('concurrent course, bundle and subscription retries debit only once and preserve progress', async () => {
  for (const [kind, body, expected] of [
    ['course', { courseId: 'course', paymentCurrency: 'USD' }, 75],
    ['bundle', { bundleId: 'bundle', paymentMethod: 'WALLET' }, 70],
    ['subscription', { planId: 'plan', period: 'MONTHLY', paymentMethod: 'WALLET' }, 80],
  ]) {
    const h = harness(); const results = await Promise.all([h.routes[kind](request(body)), h.routes[kind](request(body))]);
    assert.ok(results.every(r => r.status === 200)); assert.equal(h.state.user.walletUSD, expected);
    assert.equal(h.calls.length, 1);
    if (kind === 'course') {
      h.state.enrollments[0].progress = 67;
      assert.equal((await h.routes.course(request(body))).status, 200); assert.equal(h.state.enrollments[0].progress, 67);
    }
  }
});

test('conditional debits prevent concurrent overspending across purchases and withdrawals', async () => {
  const h = harness({ balance: 30 });
  const responses = await Promise.all([
    h.routes.course(request({ courseId: 'course', paymentCurrency: 'USD' })),
    h.routes.withdraw(request({ amount: 25, currency: 'USD', provider: 'bank' })),
  ]);
  assert.deepEqual(responses.map(r => r.status).sort(), [200, 400]); assert.equal(h.state.user.walletUSD, 5);
  assert.equal(h.state.transactions.length, 1);
});

test('negative, nonfinite, fractional points, unknown currencies and fake payment methods cannot mint credit', async () => {
  for (const [kind, body] of [
    ['points', { pointsToConvert: -100 }], ['points', { pointsToConvert: 100.5 }],
    ['withdraw', { amount: -1, currency: 'USD', provider: 'bank' }], ['withdraw', { amount: 10, currency: 'INVALID', provider: 'bank' }],
    ['deposit', { amount: 'Infinity', currency: 'USD', receiptImage: 'fake' }],
    ['bundle', { bundleId: 'bundle', paymentMethod: 'FREE' }],
    ['subscription', { planId: 'plan', period: 'FREE', paymentMethod: 'WALLET' }],
  ]) {
    const h = harness(); assert.equal((await h.routes[kind](request(body))).status, 400);
    assert.equal(h.state.user.walletUSD, 100); assert.deepEqual(h.state.transactions, []);
  }
});

test('concurrent point conversions cannot spend the same points twice', async () => {
  const h = harness(); const responses = await Promise.all([h.routes.points(request({ pointsToConvert: 200 })), h.routes.points(request({ pointsToConvert: 200 }))]);
  assert.deepEqual(responses.map(r => r.status).sort(), [200, 400]); assert.equal(h.state.user.points, 0);
  assert.equal(h.state.user.walletUSD, 102); assert.equal(h.state.transactions.length, 1);
});

test('admin deposit approval and withdrawal rejection credit the stored owner once', async () => {
  for (const [type, action] of [['DEPOSIT', 'APPROVE'], ['WITHDRAW', 'REJECT']]) {
    const h = harness({ role: 'ADMIN', transaction: { id: 'entry', userId: 'buyer', amount: 10, currency: 'USD', type, status: 'PENDING' } });
    const body = { transactionId: 'entry', action, userId: 'victim', amount: 9999 };
    const responses = await Promise.all([h.routes.approve(request(body)), h.routes.approve(request(body))]);
    assert.ok(responses.every(r => r.status === 200)); assert.equal(h.state.user.walletUSD, 110);
    const opposite = action === 'APPROVE' ? 'REJECT' : 'APPROVE';
    assert.equal((await h.routes.approve(request({ transactionId: 'entry', action: opposite }))).status, 409);
    assert.equal(h.state.user.walletUSD, 110);
  }
  const denied = harness(); assert.equal((await denied.routes.approve(request({ transactionId: 'entry', action: 'APPROVE' }))).status, 403);
});

test('failed financial writes roll back debit and pending deposits never credit a balance', async () => {
  const failing = harness({ failCreate: true });
  const response = await failing.routes.course(request({ courseId: 'course', paymentCurrency: 'USD' }));
  assert.equal(response.status, 500); assert.doesNotMatch(await response.text(), /private database/);
  assert.equal(failing.state.user.walletUSD, 100); assert.equal(failing.state.enrollments.length, 0);
  const pending = harness(); assert.equal((await pending.routes.deposit(request({ amount: 20, currency: 'USD', userId: 'victim', receiptImage: 'data:image/png;base64,AAAA' }))).status, 200);
  assert.equal(pending.state.transactions[0].status, 'PENDING'); assert.equal(pending.state.transactions[0].userId, 'buyer');
  assert.equal(pending.state.user.walletUSD, 100);
});
