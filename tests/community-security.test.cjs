/* eslint-disable @typescript-eslint/no-require-imports -- Node test runner. */
const assert = require('node:assert/strict');
const test = require('node:test');
const { loadTs } = require('./load-ts.cjs');

const USERS = {
  author: { id: 'u-author', role: 'STUDENT', name: 'كاتب' },
  other: { id: 'u-other', role: 'STUDENT', name: 'آخر' },
  admin: { id: 'u-admin', role: 'ADMIN', name: 'مدير' },
  owner: { id: 'u-owner', role: 'OWNER', name: 'مالك' },
};

class RequestUserError extends Error { constructor(status, message) { super(message); this.status = status; } }

/** In-memory community + the real routes, rate limiter and community helpers. */
function harness({ as = 'author', posts = 1, failWith } = {}) {
  const state = { posts: [], comments: [], writes: 0 };
  for (let i = 0; i < posts; i++) {
    state.posts.push({ id: `p${i}`, userId: USERS.author.id, title: 't', content: 'c', upvotes: 0, createdAt: new Date(Date.UTC(2026, 0, 1, 0, i)) });
  }
  state.comments.push({ id: 'c0', postId: 'p0', userId: USERS.author.id, content: 'hi', createdAt: new Date() });
  const fail = () => { if (failWith) throw new Error(failWith); };
  const withUser = row => ({ ...row, user: { name: 'x', role: 'STUDENT' }, _count: { comments: state.comments.filter(c => c.postId === row.id).length } });
  const prisma = {
    communityPost: {
      findMany: async ({ where, take }) => { fail(); return state.posts.filter(p => !where?.createdAt || p.createdAt < where.createdAt.lt)
        .sort((a, b) => b.createdAt - a.createdAt).slice(0, take).map(withUser); },
      findUnique: async ({ where }) => { fail(); return state.posts.find(p => p.id === where.id) ?? null; },
      create: async ({ data }) => { fail(); state.writes++; const row = { id: `p${state.posts.length}`, upvotes: 0, createdAt: new Date(), ...data }; state.posts.push(row); return withUser(row); },
      update: async ({ where, data }) => { state.writes++; const p = state.posts.find(x => x.id === where.id); p.upvotes += data.upvotes.increment; return p; },
      updateMany: async ({ where, data }) => { const p = state.posts.find(x => x.id === where.id && x.upvotes > where.upvotes.gt); if (!p) return { count: 0 }; state.writes++; p.upvotes -= data.upvotes.decrement; return { count: 1 }; },
      deleteMany: async ({ where }) => { state.writes++; state.posts = state.posts.filter(p => p.id !== where.id); state.comments = state.comments.filter(c => c.postId !== where.id); return { count: 1 }; },
    },
    communityComment: {
      findMany: async ({ where }) => state.comments.filter(c => c.postId === where.postId).map(c => ({ ...c, user: { name: 'x', role: 'STUDENT' } })),
      findUnique: async ({ where }) => state.comments.find(c => c.id === where.id) ?? null,
      create: async ({ data }) => { state.writes++; const row = { id: `c${state.comments.length}`, createdAt: new Date(), ...data }; state.comments.push(row); return { ...row, user: { name: 'x' } }; },
      deleteMany: async ({ where }) => { state.writes++; state.comments = state.comments.filter(c => c.id !== where.id); return { count: 1 }; },
    },
  };
  const rate = loadTs('../src/lib/rate-limit.ts');
  rate.resetRateLimits();
  const requests = [];
  const mocks = {
    '@/lib/db': { prisma },
    '@/lib/rate-limit': rate,
    // Stands in for the real helper (tested in request-user.test.cjs): session or bearer, active and not banned.
    '@/lib/request-user': {
      RequestUserError,
      requireRequestUser: async req => {
        requests.push(req.method);
        if (as === null) throw new RequestUserError(401, 'يرجى تسجيل الدخول');
        if (as === 'banned') throw new RequestUserError(401, 'يرجى تسجيل الدخول');
        return USERS[as];
      },
    },
  };
  mocks['@/lib/community'] = loadTs('../src/lib/community.ts', mocks);
  const routes = {
    feed: loadTs('../src/app/api/community/route.ts', mocks),
    posts: loadTs('../src/app/api/community/posts/route.ts', mocks),
    comments: loadTs('../src/app/api/community/comments/route.ts', mocks),
    postComments: loadTs('../src/app/api/community/[id]/comments/route.ts', mocks),
    like: loadTs('../src/app/api/community/[id]/like/route.ts', mocks),
    post: loadTs('../src/app/api/community/[id]/route.ts', mocks),
    comment: loadTs('../src/app/api/community/comments/[commentId]/route.ts', mocks),
  };
  return { state, routes, requests };
}
const req = (method, body, url = 'https://academy.test/api/community') => new Request(url, {
  method, headers: { 'Content-Type': 'application/json' }, ...(body === undefined ? {} : { body: JSON.stringify(body) }),
});
const p = id => ({ params: Promise.resolve({ id }) });
const c = commentId => ({ params: Promise.resolve({ commentId }) });

test('anonymous and banned members cannot post, comment, like or delete; reading stays public', async () => {
  for (const as of [null, 'banned']) {
    const h = harness({ as });
    const statuses = [
      (await h.routes.feed.POST(req('POST', { content: 'x' }))).status,
      (await h.routes.posts.POST(req('POST', { title: 't', content: 'x' }))).status,
      (await h.routes.comments.POST(req('POST', { postId: 'p0', content: 'x' }))).status,
      (await h.routes.postComments.POST(req('POST', { content: 'x' }), p('p0'))).status,
      (await h.routes.like.POST(req('POST', { liked: true }), p('p0'))).status,
      (await h.routes.post.DELETE(req('DELETE'), p('p0'))).status,
      (await h.routes.comment.DELETE(req('DELETE'), c('c0'))).status,
    ];
    assert.deepEqual([...new Set(statuses)], [401], String(as));
    assert.equal(h.state.writes, 0);
    assert.equal((await h.routes.feed.GET(req('GET'))).status, 200);
  }
});

test('posts and comments are validated: required, plain strings, bounded length', async () => {
  const h = harness();
  for (const body of [{}, { content: '' }, { content: '   ' }, { content: 5 }, { content: ['x'] }, { content: 'x'.repeat(5001) }, { content: 'ok', title: 'x'.repeat(151) }]) {
    assert.equal((await h.routes.feed.POST(req('POST', body))).status, 400, JSON.stringify(body).slice(0, 40));
  }
  assert.equal((await h.routes.posts.POST(req('POST', { content: 'no title' }))).status, 400);
  assert.equal((await h.routes.postComments.POST(req('POST', { content: 'x'.repeat(2001) }), p('p0'))).status, 400);
  assert.equal((await h.routes.comments.POST(req('POST', { postId: { $ne: 1 }, content: 'x' }))).status, 400);
  assert.equal(h.state.writes, 0);
  const ok = await h.routes.feed.POST(req('POST', { content: '  <script>alert(1)</script> نص  ' }));
  assert.equal(ok.status, 200);
  // Stored as plain text (React escapes it on display); trimmed, never interpreted.
  assert.equal((await ok.json()).content, '<script>alert(1)</script> نص');
});

test('commenting on or liking a missing post answers 404, not a server error', async () => {
  const h = harness();
  assert.equal((await h.routes.comments.POST(req('POST', { postId: 'missing', content: 'x' }))).status, 404);
  assert.equal((await h.routes.postComments.POST(req('POST', { content: 'x' }), p('missing'))).status, 404);
  assert.equal((await h.routes.like.POST(req('POST', { liked: true }), p('missing'))).status, 404);
  assert.equal(h.state.writes, 0);
});

test('likes: boolean only, and the counter never goes below zero', async () => {
  const h = harness();
  assert.equal((await h.routes.like.POST(req('POST', { liked: 'yes' }), p('p0'))).status, 400);
  for (let i = 0; i < 3; i++) assert.equal((await (await h.routes.like.POST(req('POST', { liked: false }), p('p0'))).json()).upvotes, 0);
  assert.equal((await (await h.routes.like.POST(req('POST', { liked: true }), p('p0'))).json()).upvotes, 1);
  assert.equal((await (await h.routes.like.POST(req('POST', { liked: false }), p('p0'))).json()).upvotes, 0);
});

test('only the author, an administrator or the owner can delete a post or comment (no IDOR)', async () => {
  const other = harness({ as: 'other' });
  assert.equal((await other.routes.post.DELETE(req('DELETE'), p('p0'))).status, 403);
  assert.equal((await other.routes.comment.DELETE(req('DELETE'), c('c0'))).status, 403);
  assert.equal(other.state.posts.length, 1);
  assert.equal(other.state.comments.length, 1);
  for (const as of ['author', 'admin', 'owner']) {
    const h = harness({ as });
    assert.equal((await h.routes.comment.DELETE(req('DELETE'), c('c0'))).status, 200, as);
    assert.equal((await h.routes.post.DELETE(req('DELETE'), p('p0'))).status, 200, as);
    assert.equal(h.state.posts.length, 0);
  }
  assert.equal((await harness({ as: 'admin' }).routes.post.DELETE(req('DELETE'), p('missing'))).status, 404);
});

test('each account is rate-limited when writing', async () => {
  const h = harness();
  const statuses = [];
  for (let i = 0; i < 10; i++) statuses.push((await h.routes.feed.POST(req('POST', { content: `post ${i}` }))).status);
  assert.equal(statuses.filter(s => s === 200).length, 8);
  assert.equal(statuses.at(-1), 429);
});

test('feeds are paged (30 newest, then `before`), never the whole table', async () => {
  const h = harness({ posts: 45 });
  const first = await (await h.routes.feed.GET(req('GET'))).json();
  assert.equal(first.length, 30);
  const next = await (await h.routes.feed.GET(req('GET', undefined, `https://academy.test/api/community?before=${encodeURIComponent(first.at(-1).createdAt)}`))).json();
  assert.equal(next.length, 15);
  assert.equal(new Set([...first, ...next].map(x => x.id)).size, 45);
  assert.equal((await (await h.routes.feed.GET(req('GET', undefined, 'https://academy.test/api/community?limit=500'))).json()).length, 45 > 50 ? 50 : 45);
  assert.equal((await (await h.routes.posts.GET(req('GET'))).json()).length, 30);
});

test('server errors never expose internal details', async t => {
  t.mock.method(console, 'error', () => {});
  const h = harness({ failWith: 'SECRET_DATABASE_DETAIL at host db.internal' });
  for (const res of [await h.routes.feed.GET(req('GET')), await h.routes.posts.GET(req('GET')), await h.routes.feed.POST(req('POST', { content: 'x' }))]) {
    assert.equal(res.status, 500);
    assert.doesNotMatch(JSON.stringify(await res.json()), /SECRET|internal/);
  }
});
