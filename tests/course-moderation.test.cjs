/* eslint-disable @typescript-eslint/no-require-imports -- Node test runner. */
const assert = require('node:assert/strict');
const test = require('node:test');
const { loadTs } = require('./load-ts.cjs');

const OWNER_ID = 'teacher-owner';

function harness({ role = 'INSTRUCTOR', userId = OWNER_ID, status = 'PUBLISHED', raceTo } = {}) {
  const course = { id: 'course-1', instructorId: OWNER_ID, status };
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
  const resubmit = loadTs('../src/app/api/courses/[id]/resubmit/route.ts', mocks).POST;
  const call = (handler, id = 'course-1') => handler(new Request('https://academy.test/x', { method: 'POST' }), { params: Promise.resolve({ id }) });
  return { course, writes, get invalidations() { return invalidations; },
    publish: id => call(publish, id), resubmit: id => call(resubmit, id) };
}

test('an instructor cannot publish a course the administration rejected or put under review', async () => {
  for (const status of ['REJECTED', 'PENDING']) {
    const h = harness({ status });
    const res = await h.publish();
    assert.equal(res.status, 409, status);
    assert.equal(h.course.status, status);
    assert.deepEqual(h.writes, []);
  }
});

test('administrators and the owner keep the moderation decision: they can publish any course', async () => {
  for (const role of ['ADMIN', 'OWNER']) {
    for (const status of ['REJECTED', 'PENDING']) {
      const h = harness({ role, userId: 'staff-1', status });
      assert.equal((await h.publish()).status, 200, `${role} ${status}`);
      assert.equal(h.course.status, 'PUBLISHED');
      assert.equal(h.invalidations, 1);
    }
  }
});

test('a rejected course is resubmitted for review (PENDING), never published by the instructor', async () => {
  const h = harness({ status: 'REJECTED' });
  assert.equal((await h.resubmit()).status, 200);
  assert.equal(h.course.status, 'PENDING');
  assert.equal((await h.publish()).status, 409);           // still waiting for the administration
  assert.equal(h.course.status, 'PENDING');
  assert.equal((await h.resubmit()).status, 200);          // repeat is harmless
  assert.equal(h.writes.length, 1);
  // Only rejected courses can be resubmitted.
  assert.equal((await harness({ status: 'PUBLISHED' }).resubmit()).status, 409);
});

test('other instructors, students and missing courses are refused', async () => {
  assert.equal((await harness({ userId: 'another-teacher', status: 'REJECTED' }).resubmit()).status, 403);
  assert.equal((await harness({ userId: 'another-teacher', status: 'PENDING' }).publish()).status, 403);
  assert.equal((await harness({ role: 'STUDENT', userId: 's1' }).publish()).status, 403);
  assert.equal((await harness({ role: 'STUDENT', userId: 's1', status: 'REJECTED' }).resubmit()).status, 403);
  assert.equal((await harness().publish('missing')).status, 404);
});

test('a moderation change made at the same moment wins over the publish request', async () => {
  const h = harness({ role: 'ADMIN', userId: 'staff-1', status: 'PENDING', raceTo: 'REJECTED' });
  assert.equal((await h.publish()).status, 409);
  assert.equal(h.course.status, 'REJECTED');
});
