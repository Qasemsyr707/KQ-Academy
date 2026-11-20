/* eslint-disable @typescript-eslint/no-require-imports -- Node test runner. */
// Pins the publication rule; the temporary curriculum switch is tested in catalogue-search.test.cjs.
process.env.KQ_HIDE_CURRICULUM = 'false';
const assert = require('node:assert/strict');
const test = require('node:test');
const { loadTs } = require('./load-ts.cjs');
const checkoutContext = loadTs('../src/lib/payments/checkout-context.ts');
class RequestUserError extends Error {}

test('checkout information cannot reveal an unpublished title or price', async () => {
  for (const status of ['PENDING', 'REJECTED', 'UNPUBLISHED']) {
    let walletReads = 0;
    const GET = loadTs('../src/app/api/checkout/info/route.ts', {
      '@/lib/request-user': { RequestUserError, requireRequestUser: async () => ({ id: 'student' }) },
      '@/lib/payments/checkout-context': checkoutContext,
      './checkout-context': checkoutContext,
      '@/lib/db': { prisma: {
        course: { findFirst: async query => {
          assert.deepEqual(query.where, { id: 'course', status: 'PUBLISHED' });
          return status === query.where.status ? { title: 'PRIVATE_DRAFT', price: 123 } : null;
        } },
        user: { findUnique: async () => { walletReads++; return {}; } },
      } },
    }).GET;
    const response = await GET(new Request('https://academy.test/api/checkout/info?courseId=course'));
    assert.equal(response.status, 404);
    assert.doesNotMatch(await response.text(), /PRIVATE_DRAFT|123/);
    assert.equal(walletReads, 0);
  }
});
