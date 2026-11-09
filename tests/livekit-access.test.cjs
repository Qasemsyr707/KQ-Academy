/* eslint-disable @typescript-eslint/no-require-imports -- Node's CommonJS test runner. */
const assert = require('node:assert/strict');
const { test, before, after } = require('node:test');
const { loadTs } = require('./load-ts.cjs');

const USER = { id: 'student-1', role: 'STUDENT', name: 'Current student', email: 'student@academy.test', phone: null };
const COURSE = { id: 'course-1', instructorId: 'teacher-1', status: 'PUBLISHED', price: 40, priceSYP: 400000 };
const CLASS = { id: 'class-1', instructorId: 'teacher-1', status: 'live', course: COURSE };
const ROOM = 'room-course-lesson';
const STUDY = 'study-room-1';
const routes = [
  { file: '../src/app/api/livekit/route.ts', path: '/api/livekit', query: { room: `live_${CLASS.id}` } },
  { file: '../src/app/api/livekit/token/route.ts', path: '/api/livekit/token', query: { room: `live_${CLASS.id}` } },
  { file: '../src/app/api/live/token/route.ts', path: '/api/live/token', query: { id: CLASS.id } },
];

const originalEnvironment = {};
before(() => {
  for (const key of ['LIVEKIT_API_KEY', 'LIVEKIT_API_SECRET']) {
    originalEnvironment[key] = process.env[key];
    process.env[key] = `test-only-${key.toLowerCase()}`;
  }
});
after(() => {
  for (const [key, value] of Object.entries(originalEnvironment)) {
    if (value === undefined) delete process.env[key]; else process.env[key] = value;
  }
});

function harness(config = {}) {
  const user = { ...USER, ...config.user };
  const calls = [];
  const issued = [];
  class RequestUserError extends Error { constructor(status, message) { super(message); this.status = status; } }
  const record = (name, run) => async args => {
    calls.push({ name, args });
    if (config.databaseError) throw new Error('internal database credentials must not appear');
    return run(args);
  };
  const mocks = {
    '@/lib/request-user': {
      RequestUserError,
      requireRequestUser: async req => {
        calls.push({ name: 'auth', args: { url: req.url } });
        if (config.authStatus) throw new RequestUserError(config.authStatus, 'يرجى التحقق من صلاحية الحساب');
        return user;
      },
    },
    '@/lib/auth': { authOptions: {} },
    'next-auth': { getServerSession: async () => { throw new Error('route must use current request-user authorization'); } },
    '@/lib/db': { prisma: {
      liveClass: { findUnique: record('liveClass', ({ where }) => where.id === CLASS.id
        ? (config.liveClass === undefined ? CLASS : config.liveClass) : null) },
      lesson: { findMany: record('lesson', ({ where, take }) => {
        assert.equal(take, 2, 'ambiguous room mappings must be detected');
        return where.liveRoomName === ROOM ? (config.lessons ?? [{ isLive: true, liveRoomName: ROOM,
          chapter: { isFree: !!config.freeChapter, course: { ...COURSE, ...config.course } } }]) : [];
      }) },
      studyRoom: { findUnique: record('studyRoom', ({ where }) => where.id === STUDY || config.studyRoomCollision
        ? { id: where.id } : null) },
      enrollment: { findUnique: record('enrollment', ({ where }) => {
        assert.equal(where.userId_courseId.userId, user.id);
        assert.equal(where.userId_courseId.courseId, COURSE.id);
        return config.enrolled ? { id: 'enrollment-1' } : null;
      }) },
    } },
    'livekit-server-sdk': {
      TrackSource: { MICROPHONE: 2 },
      AccessToken: class {
        constructor(key, secret, options) {
          assert.equal(key, process.env.LIVEKIT_API_KEY);
          assert.equal(secret, process.env.LIVEKIT_API_SECRET);
          this.record = { options, grants: [] };
          issued.push(this.record);
        }
        addGrant(grant) { this.record.grants.push(grant); }
        async toJwt() { return 'test-signed-room-token'; }
      },
    },
  };
  return {
    calls, issued,
    call: async (spec = routes[0], query = {}) => {
      const params = new URLSearchParams({ ...spec.query, username: 'forged-owner', role: 'ADMIN', canPublish: 'true', ...query });
      return loadTs(spec.file, mocks).GET(new Request(`https://academy.test${spec.path}?${params}`));
    },
  };
}

function assertPrivate(response) {
  assert.equal(response.headers.get('cache-control'), 'private, no-store');
  assert.equal(response.headers.get('vary'), 'Cookie, Authorization');
}

test('every LiveKit token route denies anonymous, banned and unconfigured-auth requests before room lookup or signing', async () => {
  for (const status of [401, 403, 503]) {
    for (const route of routes) {
      const h = harness({ authStatus: status });
      const response = await h.call(route);
      assert.equal(response.status, status);
      assertPrivate(response);
      assert.deepEqual(h.calls.map(call => call.name), ['auth']);
      assert.deepEqual(h.issued, []);
    }
  }
});

test('all token aliases deny a non-enrolled viewer and cannot fall through to a study-room grant', async () => {
  for (const route of routes) {
    const h = harness({ studyRoomCollision: true });
    const response = await h.call(route);
    assert.equal(response.status, 403);
    assertPrivate(response);
    assert.deepEqual(h.calls.map(call => call.name), ['auth', 'liveClass', 'enrollment']);
    assert.deepEqual(h.issued, []);
  }
});

test('all token aliases give an enrolled viewer subscription without media publishing, using the verified identity', async () => {
  for (const route of routes) {
    const h = harness({ enrolled: true });
    const response = await h.call(route);
    assert.equal(response.status, 200);
    assertPrivate(response);
    assert.deepEqual(await response.json(), { token: 'test-signed-room-token', roomName: `live_${CLASS.id}` });
    assert.deepEqual(h.issued, [{ options: { identity: USER.id, name: USER.name, ttl: '15m' }, grants: [{
      roomJoin: true, room: `live_${CLASS.id}`, canPublish: false, canSubscribe: true, canPublishData: true,
    }] }]);
  }
});

test('only current owning instructor or administrators can publish a live class through every token alias', async () => {
  for (const user of [{ id: 'teacher-1', role: 'INSTRUCTOR' }, { role: 'ADMIN' }, { role: 'OWNER' }]) {
    for (const route of routes) {
      const h = harness({ user });
      assert.equal((await h.call(route)).status, 200);
      assert.equal(h.issued[0].options.identity, user.id ?? USER.id);
      assert.equal(h.issued[0].grants[0].canPublish, true);
      assert.equal(h.calls.some(call => call.name === 'enrollment'), false);
    }
  }
});

test('a foreign instructor gets no host privileges; a demoted former instructor must enroll and remains a viewer', async () => {
  for (const user of [{ id: 'foreign-teacher', role: 'INSTRUCTOR' }, { id: 'teacher-1', role: 'STUDENT' }]) {
    const denied = harness({ user });
    assert.equal((await denied.call()).status, 403);
    assert.deepEqual(denied.issued, []);
    const enrolled = harness({ user, enrolled: true });
    assert.equal((await enrolled.call()).status, 200);
    assert.equal(enrolled.issued[0].grants[0].canPublish, false);
  }
});

test('ended or unknown live-class states are unavailable even to administrators', async () => {
  for (const status of ['ended', 'invalid']) {
    for (const route of routes) {
      const h = harness({ user: { role: 'ADMIN' }, liveClass: { ...CLASS, status } });
      assert.equal((await h.call(route)).status, 409);
      assert.deepEqual(h.issued, []);
    }
  }
});

test('nonexistent live classes never reuse a similarly named public study room', async () => {
  for (const route of routes) {
    const h = harness({ liveClass: null, studyRoomCollision: true });
    assert.equal((await h.call(route)).status, 404);
    assert.equal(h.calls.some(call => call.name === 'studyRoom'), false);
    assert.deepEqual(h.issued, []);
  }
});

test('lesson rooms authorize their actual course, preserving enrolled viewers and owning instructor publishing', async () => {
  for (const route of routes.slice(0, 2)) {
    const denied = harness({ studyRoomCollision: true });
    assert.equal((await denied.call(route, { room: ROOM })).status, 403);
    assert.equal(denied.calls.some(call => call.name === 'studyRoom'), false);
    const viewer = harness({ enrolled: true });
    assert.equal((await viewer.call(route, { room: ROOM })).status, 200);
    assert.equal(viewer.issued[0].grants[0].room, ROOM);
    assert.equal(viewer.issued[0].grants[0].canPublish, false);
    const teacher = harness({ user: { id: COURSE.instructorId, role: 'INSTRUCTOR' } });
    assert.equal((await teacher.call(route, { room: ROOM })).status, 200);
    assert.equal(teacher.issued[0].grants[0].canPublish, true);
  }
});

test('published free lessons remain available to signed-in viewers without granting host permissions', async () => {
  for (const config of [{ freeChapter: true }, { course: { price: 0, priceSYP: 0 } }]) {
    const h = harness(config);
    assert.equal((await h.call(routes[1], { room: ROOM })).status, 200);
    assert.equal(h.issued[0].grants[0].canPublish, false);
    assert.equal(h.calls.some(call => call.name === 'enrollment'), false);
  }
  for (const config of [{ freeChapter: true, course: { status: 'PENDING' } }, { course: { price: 0, priceSYP: 10 } }]) {
    const h = harness(config);
    assert.equal((await h.call(routes[1], { room: ROOM })).status, 403);
    assert.deepEqual(h.issued, []);
  }
});

test('ambiguous or non-live lesson room mappings fail closed and cannot fall through to study rooms', async () => {
  for (const lessons of [
    [{ isLive: true, liveRoomName: ROOM }, { isLive: true, liveRoomName: ROOM }],
    [{ isLive: false, liveRoomName: ROOM }],
  ]) {
    const h = harness({ lessons, studyRoomCollision: true });
    const response = await h.call(routes[1], { room: ROOM });
    assert.ok([404, 409].includes(response.status));
    assert.equal(h.calls.some(call => call.name === 'studyRoom'), false);
    assert.deepEqual(h.issued, []);
  }
});

test('real study rooms preserve collaborative microphone access for authenticated users, without camera publishing', async () => {
  for (const route of routes.slice(0, 2)) {
    const h = harness();
    assert.equal((await h.call(route, { room: STUDY })).status, 200);
    assert.deepEqual(h.issued[0].grants[0], {
      roomJoin: true, room: STUDY, canPublish: true, canSubscribe: true, canPublishData: true, canPublishSources: [2],
    });
    assert.equal(h.issued[0].options.identity, USER.id);
  }
});

test('arbitrary and demo room names cannot receive a token', async () => {
  for (const room of ['arbitrary-room', 'demo-marketing-class-101']) {
    const h = harness();
    assert.equal((await h.call(routes[0], { room })).status, 404);
    assert.deepEqual(h.issued, []);
  }
});

test('invalid or missing room references are rejected before database access', async () => {
  for (const room of ['', 'live_', '../room', 'room with spaces', 'x'.repeat(201)]) {
    const h = harness();
    assert.equal((await h.call(routes[0], { room })).status, 400);
    assert.deepEqual(h.calls.map(call => call.name), ['auth']);
    assert.deepEqual(h.issued, []);
  }
});

test('missing LiveKit keys fail closed without development credentials or token creation', async () => {
  for (const key of ['LIVEKIT_API_KEY', 'LIVEKIT_API_SECRET']) {
    const saved = process.env[key];
    try {
      delete process.env[key];
      const h = harness({ enrolled: true });
      const response = await h.call();
      assert.equal(response.status, 503);
      assertPrivate(response);
      assert.deepEqual(h.issued, []);
      assert.doesNotMatch(JSON.stringify(await response.json()), /LIVEKIT_|test-only|devkey/);
    } finally { process.env[key] = saved; }
  }
});

test('database failures return a safe private error and never mint a token', async () => {
  const h = harness({ databaseError: true });
  const response = await h.call();
  assert.equal(response.status, 503);
  assertPrivate(response);
  assert.doesNotMatch(JSON.stringify(await response.json()), /database credentials|internal/);
  assert.deepEqual(h.issued, []);
});
