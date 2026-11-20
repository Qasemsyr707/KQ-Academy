const assert = require('node:assert/strict');
const test = require('node:test');
const { loadTs } = require('./load-ts.cjs');

const LIVE = { title: 'Old', description: 'Old description', thumbnail: null, previewVideoUrl: null, includes: null, category: 'البرمجة', price: 10, priceSYP: 100000 };
class RequestUserError extends Error { constructor(status, message) { super(message); this.status = status; } }

function harness({ reviewer = { id: 'admin', role: 'ADMIN' }, request = {}, course = {} } = {}) {
  const state = {
    request: { id: 'req', courseId: 'course', instructorId: 'teacher', status: 'PENDING', changes: { title: 'New', price: 20 }, previous: { title: 'Old', price: 10 }, ...request },
    course: { id: 'course', ...LIVE, ...course },
    notifications: [], courseUpdates: [],
  };
  const tx = {
    $queryRaw: async () => [{ id: 'x' }],
    courseChangeRequest: {
      findUniqueOrThrow: async () => ({ ...state.request }),
      update: async ({ data }) => { Object.assign(state.request, data); },
    },
    course: {
      findUnique: async () => ({ ...state.course }),
      update: async ({ data }) => { state.courseUpdates.push(data); Object.assign(state.course, data); },
    },
    notification: { create: async ({ data }) => { state.notifications.push(data); } },
  };
  const prisma = { courseChangeRequest: { findUnique: async () => ({ changes: state.request.changes }) }, $transaction: async fn => fn(tx) };
  const mocks = {
    '@/lib/db': { prisma },
    '@/lib/request-user': { RequestUserError, requireRequestUser: async () => reviewer },
    '@/lib/bunny-upload-server': { assertBunnyVideoReady: async () => {}, BunnyServerError: class extends Error {} },
  };
  const route = loadTs('../src/app/api/admin/course-requests/[requestId]/route.ts', mocks);
  const decide = body => route.POST(new Request('https://academy.test/x', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) }), { params: Promise.resolve({ requestId: 'req' }) });
  return { state, decide };
}

test('parseChangeRequest keeps only changed, validated fields and records the live values', () => {
  const { parseChangeRequest } = loadTs('../src/lib/course-change-request.ts', { '@/lib/db': { prisma: {} }, './db': { prisma: {} } });
  const { changes, previous } = parseChangeRequest({ ...LIVE, title: 'New', price: '25.5', description: 'Old description', includes: [] }, LIVE);
  assert.deepEqual(changes, { title: 'New', price: 25.5 });
  assert.deepEqual(previous, { title: 'Old', price: 10 });
  assert.throws(() => parseChangeRequest({ ...LIVE }, LIVE), /لم تغيّر/);
  assert.throws(() => parseChangeRequest({ price: -1 }, LIVE), /غير صالح/);
  assert.throws(() => parseChangeRequest({ priceSYP: 'abc' }, LIVE), /غير صالح/);
  assert.throws(() => parseChangeRequest({ status: 'PUBLISHED' }, LIVE), e => e.status === 403);
  assert.throws(() => parseChangeRequest({ instructorId: 'other' }, LIVE), e => e.status === 403);
});

test('approval applies exactly the requested fields and notifies the instructor', async () => {
  const h = harness();
  const response = await h.decide({ decision: 'APPROVE' });
  assert.equal(response.status, 200);
  assert.deepEqual(h.state.courseUpdates, [{ title: 'New', price: 20 }]);
  assert.equal(h.state.request.status, 'APPROVED');
  assert.equal(h.state.request.reviewerId, 'admin');
  assert.ok(h.state.request.reviewedAt instanceof Date);
  assert.equal(h.state.notifications[0].userId, 'teacher');
});

test('a repeated approval is refused and does not write again', async () => {
  const h = harness({ request: { status: 'APPROVED' } });
  assert.equal((await h.decide({ decision: 'APPROVE' })).status, 409);
  assert.equal(h.state.courseUpdates.length, 0);
});

test('rejection requires a reason and leaves the live course untouched', async () => {
  const h = harness();
  assert.equal((await h.decide({ decision: 'REJECT' })).status, 400);
  const response = await h.decide({ decision: 'REJECT', reason: 'السعر غير مناسب' });
  assert.equal(response.status, 200);
  assert.equal(h.state.courseUpdates.length, 0);
  assert.equal(h.state.course.title, 'Old');
  assert.equal(h.state.request.status, 'REJECTED');
  assert.match(h.state.notifications[0].message, /السعر غير مناسب/);
});

test('reviewers cannot decide their own request', async () => {
  const h = harness({ reviewer: { id: 'teacher', role: 'ADMIN' } });
  assert.equal((await h.decide({ decision: 'APPROVE' })).status, 403);
  assert.equal(h.state.courseUpdates.length, 0);
});

test('a course changed since the request is not overwritten', async () => {
  const h = harness({ course: { title: 'Changed by admin' } });
  assert.equal((await h.decide({ decision: 'APPROVE' })).status, 409);
  assert.equal(h.state.courseUpdates.length, 0);
  assert.equal(h.state.request.status, 'PENDING');
});

test('invalid decisions are refused', async () => {
  const h = harness();
  assert.equal((await h.decide({ decision: 'PUBLISH' })).status, 400);
});
