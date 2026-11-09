/* eslint-disable @typescript-eslint/no-require-imports -- Node's CommonJS test runner. */
const assert = require('node:assert/strict');
const test = require('node:test');
const { loadTs } = require('./load-ts.cjs');

const USER = { id: 'student-1', role: 'STUDENT' };
const TARGET = 'target-from-async-params';
const params = () => ({ params: new Promise(resolve => queueMicrotask(() => resolve({ id: TARGET }))) });
const request = body => new Request('https://academy.test/api/social', {
  method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
});

function harness({ session = { user: USER }, parent = null } = {}) {
  const calls = [];
  const record = (name, result) => async args => {
    calls.push({ name, args });
    return result;
  };
  const comment = { id: 'created-comment', content: 'Useful explanation' };
  const authOptions = {};
  const mocks = {
    '@/lib/db': { prisma: {
      communityComment: {
        findMany: record('community.list', [{ id: 'community-comment' }]),
        create: record('community.create', comment),
      },
      communityPost: { update: record('community.like', { upvotes: 7 }) },
      shortComment: {
        findMany: record('short.list', [{ id: 'short-comment', replies: [] }]),
        findUnique: record('short.parent', parent),
        create: record('short.create', comment),
      },
      short: { update: record('short.like', { likes: 9 }) },
    } },
    '@/lib/auth': { authOptions },
    'next-auth': { getServerSession: async options => {
      assert.equal(options, authOptions);
      return session;
    } },
  };
  return { calls, comment,
    communityComments: loadTs('../src/app/api/community/[id]/comments/route.ts', mocks),
    communityLike: loadTs('../src/app/api/community/[id]/like/route.ts', mocks).POST,
    shortComments: loadTs('../src/app/api/shorts/[id]/comments/route.ts', mocks),
    shortLike: loadTs('../src/app/api/shorts/[id]/like/route.ts', mocks).POST,
  };
}

test('community comments resolve asynchronous post params while preserving public reading and chronological author details', async () => {
  const h = harness({ session: null });
  const response = await h.communityComments.GET(new Request('https://academy.test/api/community/post/comments'), params());
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), [{ id: 'community-comment' }]);
  assert.deepEqual(h.calls, [{ name: 'community.list', args: {
    where: { postId: TARGET }, include: { user: { select: { name: true, role: true } } }, orderBy: { createdAt: 'asc' },
  } }]);
});

test('community comment creation associates the resolved post and authenticated user', async () => {
  const h = harness();
  const response = await h.communityComments.POST(request({ content: 'Useful explanation' }), params());
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), h.comment);
  assert.equal(h.calls.length, 1);
  assert.deepEqual(h.calls[0], { name: 'community.create', args: {
    data: { content: 'Useful explanation', postId: TARGET, userId: USER.id },
    include: { user: { select: { name: true, role: true } } },
  } });
});

test('community likes and unlikes target the resolved post and preserve counter directions', async () => {
  for (const liked of [true, false]) {
    const h = harness();
    const response = await h.communityLike(request({ liked }), params());
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { upvotes: 7 });
    assert.deepEqual(h.calls, [{ name: 'community.like', args: {
      where: { id: TARGET }, data: { upvotes: { increment: liked ? 1 : -1 } },
    } }]);
  }
});

test('short comment reading resolves the short ID and retains top-level filtering and reply ordering', async () => {
  const h = harness({ session: null });
  const response = await h.shortComments.GET(new Request('https://academy.test/api/shorts/short/comments'), params());
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), [{ id: 'short-comment', replies: [] }]);
  assert.equal(h.calls.length, 1);
  const { name, args } = h.calls[0];
  assert.equal(name, 'short.list');
  assert.deepEqual(args.where, { shortId: TARGET, parentId: null });
  assert.deepEqual(args.orderBy, { createdAt: 'desc' });
  assert.deepEqual(args.include.user.select, { name: true, image: true, role: true });
  assert.deepEqual(args.include.replies.orderBy, { createdAt: 'asc' });
  assert.deepEqual(args.include.replies.include.user.select, args.include.user.select);
});

test('short reply creation retains parent flattening and associates the resolved short and current user', async () => {
  const h = harness({ parent: { id: 'nested-reply', parentId: 'root-comment' } });
  const response = await h.shortComments.POST(request({ content: 'Useful explanation', parentId: 'nested-reply' }), params());
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { success: true, comment: h.comment, isReply: true });
  assert.deepEqual(h.calls.map(call => call.name), ['short.parent', 'short.create']);
  assert.deepEqual(h.calls[0].args, { where: { id: 'nested-reply' } });
  assert.deepEqual(h.calls[1].args.data, {
    content: 'Useful explanation', shortId: TARGET, userId: USER.id, parentId: 'root-comment',
  });
});

test('short liking resolves the target ID and preserves the existing increment and response', async () => {
  const h = harness();
  const response = await h.shortLike(request({}), params());
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { success: true, likes: 9 });
  assert.deepEqual(h.calls, [{ name: 'short.like', args: { where: { id: TARGET }, data: { likes: { increment: 1 } } } }]);
});

test('all four mutations reject missing sessions and missing session users before database writes', async () => {
  for (const session of [null, {}]) {
    const h = harness({ session });
    for (const route of [h.communityComments.POST, h.communityLike, h.shortComments.POST, h.shortLike]) {
      const response = await route(request({ content: 'Not allowed', liked: true, parentId: 'foreign-comment' }), params());
      assert.equal(response.status, 401);
    }
    assert.deepEqual(h.calls, []);
  }
});

test('both comment handlers retain empty-content rejection before parent lookup or creation', async () => {
  const h = harness();
  for (const route of [h.communityComments.POST, h.shortComments.POST]) {
    const response = await route(request({ content: '', parentId: 'some-parent' }), params());
    assert.equal(response.status, 400);
  }
  assert.deepEqual(h.calls, []);
});
