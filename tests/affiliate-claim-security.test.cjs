/* eslint-disable @typescript-eslint/no-require-imports -- Node test runner. */
const assert = require('node:assert/strict');
const { test } = require('node:test');
const jwt = require('jsonwebtoken');
const { loadTs } = require('./load-ts.cjs');
const { testDatabaseUrl } = require('./helpers/security-postgres.cjs');

function harness(options = {}) {
  let state = { earnings: [
    { id: 'first', ownerId: 'affiliate', amount: 12.345, status: 'PENDING' },
    { id: 'second', ownerId: 'affiliate', amount: 2, status: 'PENDING' },
    { id: 'paid', ownerId: 'affiliate', amount: 500, status: 'PAID' },
    { id: 'other', ownerId: 'other', amount: 800, status: 'PENDING' },
  ], walletUSD: 10, ledger: [] };
  let queue = Promise.resolve();
  let attempts = 0;
  const observed = [];
  const matches = (row, where) => row.ownerId === where.ownerId && row.status === where.status
    && (!where.id || where.id.in.includes(row.id));
  const db = {
    user: { findUnique: async ({ where }) => {
      observed.push(['identity', where.id]);
      return options.deleted ? null : { id: where.id, role: 'STUDENT', isBanned: !!options.banned, email: 'private@example.test', name: 'Affiliate', phone: null };
    } },
    $transaction: async (fn, configuration) => {
      assert.equal(configuration.isolationLevel, 'Serializable');
      attempts++;
      if (options.conflictOnce && attempts === 1) throw Object.assign(new Error('serialization conflict'), { code: 'P2034' });
      const previous = queue;
      let release;
      queue = new Promise(resolve => { release = resolve; });
      await previous;
      const working = structuredClone(state);
      const tx = {
        affiliateEarning: {
          findMany: async ({ where, select }) => {
            assert.deepEqual(select, { id: true, amount: true });
            observed.push(['read', where.ownerId]);
            const rows = working.earnings.filter(row => matches(row, where));
            if (Object.hasOwn(options, 'invalidAmount')) rows[0].amount = options.invalidAmount;
            if (options.newEarningAfterRead) working.earnings.push({ id: 'late', ownerId: 'affiliate', amount: 99, status: 'PENDING' });
            return rows.map(({ id, amount }) => ({ id, amount }));
          },
          updateMany: async ({ where, data }) => {
            observed.push(['claim', where]);
            const rows = working.earnings.filter(row => matches(row, where));
            const claimed = options.partialClaim ? rows.slice(0, 1) : rows;
            claimed.forEach(row => Object.assign(row, data));
            return { count: claimed.length };
          },
        },
        user: { update: async ({ where, data }) => {
          assert.equal(where.id, 'affiliate');
          working.walletUSD += data.walletUSD.increment;
        } },
        walletTransaction: { create: async ({ data }) => {
          if (options.failLedger) throw new Error('private database detail');
          working.ledger.push(data);
        } },
      };
      try { const result = await fn(tx); state = working; return result; } finally { release(); }
    },
  };
  const mocks = {
    '@/lib/db': { prisma: db },
    '@/lib/auth': { authOptions: {} },
    'next-auth': { getServerSession: async () => options.anonymous ? null : { user: { id: 'affiliate', role: 'OWNER' } } },
  };
  const context = loadTs('../src/lib/payments/checkout-context.ts', mocks);
  mocks['./checkout-context'] = mocks['@/lib/payments/checkout-context'] = context;
  mocks['@/lib/request-user'] = loadTs('../src/lib/request-user.ts', mocks);
  const service = loadTs('../src/lib/payments/affiliate-claim.ts', mocks);
  mocks['@/lib/payments/affiliate-claim'] = service;
  const route = loadTs('../src/app/api/affiliate/claim/route.ts', mocks).POST;
  return { route, claim: service.claimAffiliateEarnings, observed, get state() { return state; }, get attempts() { return attempts; } };
}

function environment(t) {
  const keys = ['NEXTAUTH_SECRET', 'NEXTAUTH_URL', 'NEXT_PUBLIC_APP_URL'];
  const original = Object.fromEntries(keys.map(key => [key, process.env[key]]));
  process.env.NEXTAUTH_SECRET = 'affiliate-test-secret-only';
  process.env.NEXTAUTH_URL = 'https://academy.test';
  delete process.env.NEXT_PUBLIC_APP_URL;
  t.after(() => { for (const key of keys) { if (original[key] === undefined) delete process.env[key]; else process.env[key] = original[key]; } });
}
const request = (headers = { Origin: 'https://academy.test' }, body) => new Request('https://academy.test/api/affiliate/claim', {
  method: 'POST', headers, ...(body ? { body: JSON.stringify(body) } : {}),
});

test('bodyless same-origin claim preserves commissions and ignores forged owner/amount', async t => {
  environment(t);
  const h = harness();
  const response = await h.route(request({ Origin: 'https://academy.test' }, { userId: 'other', amount: 999999 }));
  assert.equal(response.status, 200);
  assert.equal((await response.json()).amount, 14.345);
  assert.equal(response.headers.get('Cache-Control'), 'private, no-store');
  assert.equal(h.state.walletUSD, 24.345);
  assert.deepEqual(h.state.ledger, [{ userId: 'affiliate', amount: 14.345, currency: 'USD', type: 'DEPOSIT', status: 'APPROVED', provider: 'AFFILIATE' }]);
  assert.equal(h.state.earnings.find(row => row.id === 'other').status, 'PENDING');
  assert.equal((await h.route(request())).status, 400);
  assert.equal(h.state.walletUSD, 24.345);
});

test('concurrent claim model credits and records the same earnings only once', async () => {
  const h = harness();
  const results = await Promise.allSettled(Array.from({ length: 8 }, () => h.claim('affiliate')));
  assert.equal(results.filter(result => result.status === 'fulfilled').length, 1);
  assert.ok(results.filter(result => result.status === 'rejected').every(result => result.reason.status === 400));
  assert.equal(h.state.walletUSD, 24.345);
  assert.equal(h.state.ledger.length, 1);
});

test('partial claim or failed ledger rolls back claim and credit; new earnings remain pending', async () => {
  for (const options of [{ partialClaim: true }, { failLedger: true }, { invalidAmount: -1 }, { invalidAmount: 0 }, { invalidAmount: NaN }, { invalidAmount: Infinity }]) {
    const h = harness(options);
    await assert.rejects(h.claim('affiliate'));
    assert.equal(h.state.walletUSD, 10);
    assert.equal(h.state.ledger.length, 0);
    assert.equal(h.state.earnings.find(row => row.id === 'first').status, 'PENDING');
  }
  const h = harness({ newEarningAfterRead: true });
  assert.equal(await h.claim('affiliate'), 14.345);
  assert.equal(h.state.earnings.find(row => row.id === 'late').status, 'PENDING');
  assert.deepEqual(h.observed.find(event => event[0] === 'claim')[1].id.in, ['first', 'second']);
});

test('serialization conflicts retry the whole claim and failed responses hide database details', async t => {
  environment(t);
  const retry = harness({ conflictOnce: true });
  assert.equal(await retry.claim('affiliate'), 14.345);
  assert.equal(retry.attempts, 2);
  const failed = harness({ failLedger: true });
  const response = await failed.route(request());
  assert.equal(response.status, 500);
  assert.doesNotMatch(await response.text(), /private database/);
});

test('claim requires verified current identity and explicit same-origin cookie requests', async t => {
  environment(t);
  for (const options of [{ anonymous: true }, { banned: true }, { deleted: true }]) {
    const h = harness(options);
    assert.equal((await h.route(request())).status, 401);
    assert.equal(h.attempts, 0);
  }
  for (const headers of [{}, { Origin: 'null' }, { Origin: 'https://evil.test' }, { Origin: 'https://academy.test.evil.test' }]) {
    const h = harness();
    assert.equal((await h.route(request(headers))).status, 403);
    assert.equal(h.attempts, 0);
  }
  const signed = jwt.sign({ id: 'affiliate', role: 'OWNER' }, process.env.NEXTAUTH_SECRET, { expiresIn: '1h' });
  assert.equal((await harness({ anonymous: true }).route(request({ Authorization: `Bearer ${signed}` }))).status, 200);
  for (const authorization of ['Bearer forged', 'Basic something', '']) {
    const h = harness();
    const response = await h.route(request({ Authorization: authorization }));
    assert.ok([401, 403].includes(response.status));
    assert.equal(h.attempts, 0);
  }
  delete process.env.NEXTAUTH_SECRET;
  assert.equal((await harness().route(request())).status, 503);
});

test('PostgreSQL test guard refuses production databases, remote hosts and connection overrides', () => {
  assert.equal(testDatabaseUrl(null), null);
  assert.equal(testDatabaseUrl('postgresql://test:secret@127.0.0.1:55432/kq_security_test_unit'), 'postgresql://test:secret@127.0.0.1:55432/kq_security_test_unit');
  for (const url of [
    'postgresql://test:secret@production.example/kq_security_test_unit',
    'postgresql://test:secret@127.0.0.1/kqacademy',
    'postgresql://test:secret@127.0.0.1/kq_security_test_unit?host=production.example',
    'postgresql://test:secret@127.0.0.1/kq_security_test_unit?options=anything',
    'postgresql://test:secret@127.0.0.1/kq_security_test_unit?schema=production',
    'https://test:secret@localhost/kq_security_test_unit',
  ]) assert.throws(() => testDatabaseUrl(url));
});

test('PostgreSQL test guard never falls back to the application DATABASE_URL', t => {
  const originalTest = process.env.KQ_SECURITY_TEST_DATABASE_URL;
  const originalApplication = process.env.DATABASE_URL;
  t.after(() => {
    if (originalTest === undefined) delete process.env.KQ_SECURITY_TEST_DATABASE_URL;
    else process.env.KQ_SECURITY_TEST_DATABASE_URL = originalTest;
    if (originalApplication === undefined) delete process.env.DATABASE_URL;
    else process.env.DATABASE_URL = originalApplication;
  });
  delete process.env.KQ_SECURITY_TEST_DATABASE_URL;
  process.env.DATABASE_URL = 'postgresql://test:secret@production.example/kqacademy';
  assert.equal(testDatabaseUrl(), null);
});
