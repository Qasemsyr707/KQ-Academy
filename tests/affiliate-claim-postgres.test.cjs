/* eslint-disable @typescript-eslint/no-require-imports -- Node test runner. */
const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
const { test } = require('node:test');
const { loadTs } = require('./load-ts.cjs');
const { testDatabaseUrl, createTestPrisma } = require('./helpers/security-postgres.cjs');

// No application DATABASE_URL fallback, schema creation, migrations, or provider
// calls. The operator must explicitly prepare an isolated disposable database.
const databaseUrl = testDatabaseUrl();
const skip = databaseUrl ? false : 'KQ_SECURITY_TEST_DATABASE_URL absent; real PostgreSQL concurrency is not verified';

function service(db) {
  return loadTs('../src/lib/payments/affiliate-claim.ts', {
    '@/lib/db': { prisma: db },
  }).claimAffiliateEarnings;
}

async function fixture(t) {
  const db = createTestPrisma();
  const suffix = randomUUID();
  const owner = `affiliate-owner-${suffix}`;
  const buyer = `affiliate-buyer-${suffix}`;
  const other = `affiliate-other-${suffix}`;
  const users = [owner, buyer, other];
  t.after(async () => {
    try {
      // Delete only records associated with this fixture's unique identities.
      await db.walletTransaction.deleteMany({ where: { userId: { in: users } } });
      await db.affiliateEarning.deleteMany({ where: { ownerId: { in: users } } });
      await db.user.deleteMany({ where: { id: { in: users } } });
    } finally {
      await db.$disconnect();
    }
  });
  await db.user.createMany({ data: users.map(id => ({
    id, name: 'Isolated security fixture', email: `${id}@example.invalid`,
    password: 'not-an-authentication-fixture', walletUSD: 10,
  })) });
  const earnings = [
    { id: `first-${suffix}`, ownerId: owner, buyerId: buyer, amount: 7.125, status: 'PENDING' },
    { id: `second-${suffix}`, ownerId: owner, buyerId: buyer, amount: 2.5, status: 'PENDING' },
    { id: `paid-${suffix}`, ownerId: owner, buyerId: buyer, amount: 100, status: 'PAID' },
    { id: `other-${suffix}`, ownerId: other, buyerId: buyer, amount: 200, status: 'PENDING' },
  ];
  await db.affiliateEarning.createMany({ data: earnings });
  return { db, owner, other, earnings, total: 9.625 };
}

test('PostgreSQL: overlapping affiliate claims credit exactly their claimed rows once', { skip, timeout: 30000 }, async t => {
  const { db, owner, other, earnings, total } = await fixture(t);
  // Independent clients guarantee separate connections even if each pool has
  // connection_limit=1. The barrier makes both first transactions read PENDING.
  const contenders = [createTestPrisma(), createTestPrisma()];
  t.after(async () => { await Promise.all(contenders.map(client => client.$disconnect())); });
  let reads = 0;
  let release;
  const bothRead = new Promise(resolve => { release = resolve; });
  const barrierTimeout = setTimeout(() => release(), 5000);
  t.after(() => clearTimeout(barrierTimeout));
  const claimers = contenders.map(client => service({
    $transaction: (operation, options) => {
      assert.equal(options.isolationLevel, 'Serializable');
      return client.$transaction(async tx => operation({
        ...tx,
        affiliateEarning: {
          ...tx.affiliateEarning,
          findMany: async query => {
            const rows = await tx.affiliateEarning.findMany(query);
            if (reads < 2) {
              reads++;
              if (reads === 2) { clearTimeout(barrierTimeout); release(); }
              await bothRead;
              assert.equal(reads, 2, 'both concurrent transactions must read before either claims');
            }
            return rows;
          },
        },
      }), options);
    },
  }));
  const results = await Promise.allSettled(claimers.map(claim => claim(owner)));
  assert.equal(reads, 2);
  const success = results.filter(result => result.status === 'fulfilled');
  const denied = results.filter(result => result.status === 'rejected');
  assert.deepEqual(success.map(result => result.value), [total]);
  assert.equal(denied.length, 1);
  assert.ok([400, 409].includes(denied[0].reason.status));
  const replay = await Promise.allSettled(Array.from({ length: 4 }, () => service(db)(owner)));
  assert.ok(replay.every(result => result.status === 'rejected' && result.reason.status === 400));
  assert.equal((await db.user.findUniqueOrThrow({ where: { id: owner } })).walletUSD, 10 + total);
  const ledger = await db.walletTransaction.findMany({ where: { userId: owner } });
  assert.equal(ledger.length, 1);
  assert.equal(ledger[0].amount, total);
  assert.equal(ledger[0].provider, 'AFFILIATE');
  assert.equal(ledger[0].status, 'APPROVED');
  assert.equal(await db.affiliateEarning.count({ where: { ownerId: owner, status: 'PAID' } }), 3);
  assert.equal((await db.affiliateEarning.findUniqueOrThrow({ where: { id: earnings[3].id } })).status, 'PENDING');
  assert.equal((await db.user.findUniqueOrThrow({ where: { id: other } })).walletUSD, 10);
});

test('PostgreSQL: ledger constraint failure rolls back the claim and wallet credit together', { skip, timeout: 30000 }, async t => {
  const { db, owner, total } = await fixture(t);
  let injected = false;
  const failingClaim = service({
    $transaction: (operation, options) => db.$transaction(tx => operation({
      ...tx,
      walletTransaction: {
        ...tx.walletTransaction,
        create: ({ data }) => {
          injected = true;
          // Trigger an actual PostgreSQL foreign-key violation after the real
          // UPDATE statements. This is not a mocked transaction rollback.
          return tx.walletTransaction.create({ data: { ...data, userId: `missing-${randomUUID()}` } });
        },
      },
    }), options),
  });
  await assert.rejects(failingClaim(owner), error => error.code === 'P2003');
  assert.equal(injected, true);
  assert.equal((await db.user.findUniqueOrThrow({ where: { id: owner } })).walletUSD, 10);
  assert.equal(await db.affiliateEarning.count({ where: { ownerId: owner, status: 'PENDING' } }), 2);
  assert.equal(await db.walletTransaction.count({ where: { userId: owner } }), 0);
  assert.equal(await service(db)(owner), total);
  assert.equal((await db.user.findUniqueOrThrow({ where: { id: owner } })).walletUSD, 10 + total);
});
