/* eslint-disable @typescript-eslint/no-require-imports -- Node test runner. */
const assert = require('node:assert/strict');
const test = require('node:test');
const { loadTs } = require('./load-ts.cjs');

// Review cycle (src/lib/course-review.ts): DRAFT/REJECTED -submit-> PENDING -staff-> PUBLISHED.
const OWNER_ID = 'teacher-owner';
const PRICES = { price: 40, priceSYP: 500000 };

function harness({ role = 'INSTRUCTOR', userId = OWNER_ID, status = 'DRAFT', raceTo } = {}) {
  const course = { id: 'course-1', instructorId: OWNER_ID, status, price: 99, priceSYP: 990000 };
  const writes = [];
  let invalidations = 0;
  const mocks = {
    '@/lib/rbac': {
      requireRoleApi: async allowed => (role === 'OWNER' || allowed.includes(role))
        ? { authorized: true, role, session: { user: { id: userId, role } } }
        : { authorized: false, errorResponse: Response.json({ error: 'غير مصرح' }, { status: 403 }) },
    },
    '@/lib/course-search': { invalidateCatalogueSearch: () => { invalidations++; } },
    '@/lib/db': { prisma: { course: {
      findUnique: async ({ where }) => (where.id === course.id ? { instructorId: course.instructorId, status: course.status } : null),
      // A moderation change between the read and the write (raceTo) makes the conditional update miss.
      updateMany: async ({ where, data }) => {
        if (raceTo) course.status = raceTo;
        if (where.id !== course.id || where.status !== course.status) return { count: 0 };
        writes.push(data); Object.assign(course, data); return { count: 1 };
      },
    } } },
  };
  const publish = loadTs('../src/app/api/courses/[id]/publish/route.ts', mocks).POST;
  const submit = loadTs('../src/app/api/courses/[id]/submit/route.ts', mocks).POST;
  const resubmit = loadTs('../src/app/api/courses/[id]/resubmit/route.ts', mocks).POST;
  const call = (handler, id = 'course-1', body) => handler(new Request('https://academy.test/x', {
    method: 'POST', ...(body === undefined ? {} : { headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) }),
  }), { params: Promise.resolve({ id }) });
  return { course, writes, get invalidations() { return invalidations; },
    publish: (id, body) => call(publish, id, body), submit: id => call(submit, id), resubmit: id => call(resubmit, id) };
}

test('an instructor can never publish, their own course included, in any state', async () => {
  for (const status of ['DRAFT', 'PENDING', 'REJECTED']) {
    const h = harness({ status });
    const res = await h.publish(undefined, PRICES);
    assert.equal(res.status, 403, status);
    assert.equal(h.course.status, status);
    assert.equal(h.writes.length, 0);
    assert.equal(h.invalidations, 0);
  }
});

test('administrators and the owner publish only with explicitly stated prices', async () => {
  for (const role of ['ADMIN', 'OWNER']) {
    for (const status of ['DRAFT', 'PENDING', 'REJECTED']) {
      // No price, an empty price, half a price or an invalid one: refused, nothing written.
      for (const body of [undefined, {}, { price: '', priceSYP: '' }, { price: 40 }, { price: -1, priceSYP: 0 }, { price: 'abc', priceSYP: 1 }]) {
        const h = harness({ role, userId: 'staff-1', status });
        assert.equal((await h.publish(undefined, body)).status, 400, `${role} ${status} ${JSON.stringify(body)}`);
        assert.equal(h.course.status, status);
        assert.equal(h.writes.length, 0);
      }
      const h = harness({ role, userId: 'staff-1', status });
      assert.equal((await h.publish(undefined, PRICES)).status, 200, `${role} ${status}`);
      assert.deepEqual(h.writes, [{ status: 'PUBLISHED', ...PRICES }]);   // the proposed 99 is not kept
      assert.equal(h.invalidations, 1);
    }
  }
  // Explicit zero is a deliberate free course.
  const free = harness({ role: 'ADMIN', userId: 'staff-1', status: 'PENDING' });
  assert.equal((await free.publish(undefined, { price: 0, priceSYP: '0' })).status, 200);
  assert.deepEqual(free.writes, [{ status: 'PUBLISHED', price: 0, priceSYP: 0 }]);
});

test('an instructor submits a draft for review, and resubmits a rejected course; never to published', async () => {
  const h = harness({ status: 'DRAFT' });
  assert.equal((await h.submit()).status, 200);
  assert.equal(h.course.status, 'PENDING');
  assert.equal((await h.publish(undefined, PRICES)).status, 403);  // still waiting for the administration
  assert.equal((await h.submit()).status, 200);                     // repeat is harmless
  assert.equal(h.course.status, 'PENDING');

  const rejected = harness({ status: 'REJECTED' });
  assert.equal((await rejected.resubmit()).status, 200);            // Phase 2.1 alias, same handler
  assert.equal(rejected.course.status, 'PENDING');
  assert.deepEqual(rejected.writes, [{ status: 'PENDING' }]);       // only the status, never prices
});

test('a published course is not sent back by submit; strangers and students are refused', async () => {
  assert.equal((await harness({ status: 'PUBLISHED' }).submit()).status, 409);
  assert.equal((await harness({ userId: 'another-teacher', status: 'REJECTED' }).submit()).status, 403);
  assert.equal((await harness({ userId: 'another-teacher', status: 'DRAFT' }).publish(undefined, PRICES)).status, 403);
  assert.equal((await harness({ role: 'STUDENT', userId: 's1' }).publish(undefined, PRICES)).status, 403);
  assert.equal((await harness({ role: 'STUDENT', userId: 's1', status: 'REJECTED' }).submit()).status, 403);
  assert.equal((await harness().publish('missing', PRICES)).status, 404);
  assert.equal((await harness().submit('missing')).status, 404);
});

test('a moderation change made at the same moment wins over publish and submit', async () => {
  const h = harness({ role: 'ADMIN', userId: 'staff-1', status: 'PENDING', raceTo: 'REJECTED' });
  assert.equal((await h.publish(undefined, PRICES)).status, 409);
  assert.equal(h.course.status, 'REJECTED');
  const s = harness({ status: 'DRAFT', raceTo: 'PUBLISHED' });
  assert.equal((await s.submit()).status, 409);
  assert.equal(s.course.status, 'PUBLISHED');
});
