const assert = require('node:assert/strict');
const test = require('node:test');
const { loadTs } = require('./load-ts.cjs');

class RequestUserError extends Error { constructor(status, message = 'denied') { super(message); this.status = status; } }
const TrackSource = { CAMERA: 1, MICROPHONE: 2, SCREEN_SHARE: 3, SCREEN_SHARE_AUDIO: 4 };

function harness({ actor = { id: 'teacher-1', role: 'INSTRUCTOR' }, status = 'live', target = { id: 'student-1', role: 'STUDENT', isBanned: false }, enrolled = true, connected = ['student-1'], adminPermission = true } = {}) {
  const updates = [];
  const clients = [];
  class RoomServiceClient {
    constructor(url) { clients.push(url); }
    async listParticipants(room) { return connected.map(identity => ({ identity, room })); }
    async updateParticipant(room, identity, metadata, permission) { updates.push({ room, identity, metadata, permission }); return {}; }
  }
  const prisma = {
    liveClass: { findUnique: async ({ where }) => where.id === 'class-1' ? { id: 'class-1', status, instructorId: 'teacher-1', course: { id: 'course-1', instructorId: 'teacher-1' } } : null },
    user: { findUnique: async ({ where }) => (target && where.id === target.id ? target : null) },
    enrollment: { findUnique: async () => (enrolled ? { id: 'e1' } : null) },
  };
  const route = loadTs('../src/app/api/live/[id]/permissions/route.ts', {
    'livekit-server-sdk': { RoomServiceClient, TrackSource },
    '@/lib/db': { prisma },
    '@/lib/permission-check': { hasPermission: async () => adminPermission },
    '@/lib/request-user': { RequestUserError, requireRequestUser: async (_r, roles) => {
      if (!actor) throw new RequestUserError(401);
      if (!roles.includes(actor.role)) throw new RequestUserError(403);
      return actor;
    } },
  });
  const call = (body, id = 'class-1') => route.POST(
    new Request('https://academy.test/x', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) }),
    { params: Promise.resolve({ id }) });
  return { call, updates, clients };
}

test.beforeEach(() => {
  process.env.LIVEKIT_API_KEY = 'test-key'; process.env.LIVEKIT_API_SECRET = 'test-secret'; process.env.NEXT_PUBLIC_LIVEKIT_URL = 'wss://livekit.example.invalid';
});

test('the host grants exactly the requested sources on the LiveKit server, and can revoke them', async () => {
  const h = harness();
  for (const [action, sources] of [['microphone', [2]], ['camera', [2, 1]], ['screen', [2, 1, 3, 4]]]) {
    assert.equal((await h.call({ identity: 'student-1', action })).status, 200, action);
    const last = h.updates.at(-1);
    assert.equal(last.room, 'live_class-1');
    assert.deepEqual(last.permission.canPublishSources, sources);
    assert.equal(last.permission.canPublish, true);
    assert.equal(last.permission.canUpdateMetadata, false, 'a student can never relabel themselves host');
  }
  assert.equal((await h.call({ identity: 'student-1', action: 'revoke' })).status, 200);
  assert.equal(h.updates.at(-1).permission.canPublish, false);
  assert.deepEqual(h.updates.at(-1).permission.canPublishSources, []);
  assert.equal(h.clients[0], 'https://livekit.example.invalid');
});

test('only a real host may grant: students, foreign instructors and ADMINs without LIVE_CLASSES get 403', async () => {
  for (const config of [
    { actor: { id: 'student-1', role: 'STUDENT' } },
    { actor: { id: 'teacher-2', role: 'INSTRUCTOR' } },
    { actor: { id: 'admin-1', role: 'ADMIN' }, adminPermission: false },
  ]) {
    const h = harness(config);
    assert.equal((await h.call({ identity: 'student-1', action: 'microphone' })).status, 403);
    assert.equal(h.updates.length, 0);
  }
  assert.equal((await harness({ actor: null }).call({ identity: 'student-1', action: 'microphone' })).status, 401);
  for (const actor of [{ id: 'owner-1', role: 'OWNER' }, { id: 'admin-1', role: 'ADMIN' }]) {
    assert.equal((await harness({ actor }).call({ identity: 'student-1', action: 'microphone' })).status, 200);
  }
});

test('the target must be an enrolled, unbanned student who is connected to this live session', async () => {
  const cases = [
    [{ enrolled: false }, 403], [{ target: { id: 'student-1', role: 'STUDENT', isBanned: true } }, 403],
    [{ target: { id: 'student-1', role: 'INSTRUCTOR', isBanned: false } }, 403], [{ target: null }, 403],
    [{ connected: [] }, 404], [{ status: 'upcoming' }, 409], [{ status: 'ended' }, 409],
  ];
  for (const [config, code] of cases) {
    const h = harness(config);
    assert.equal((await h.call({ identity: 'student-1', action: 'camera' })).status, code, JSON.stringify(config));
    assert.equal(h.updates.length, 0);
  }
  assert.equal((await harness().call({ identity: 'student-1', action: 'camera' }, 'missing')).status, 404);
});

test('malformed requests and self-grants are refused; missing LiveKit settings fail closed', async () => {
  const h = harness();
  for (const body of [{ identity: 'student-1', action: 'admin' }, { identity: '../x', action: 'microphone' }, { action: 'microphone' }, ['x']]) {
    assert.equal((await h.call(body)).status, 400);
  }
  assert.equal((await h.call({ identity: 'teacher-1', action: 'microphone' })).status, 400);
  delete process.env.LIVEKIT_API_SECRET;
  assert.equal((await h.call({ identity: 'student-1', action: 'microphone' })).status, 503);
  assert.equal(h.updates.length, 0);
});
