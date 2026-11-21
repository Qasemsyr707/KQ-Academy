const assert = require('node:assert/strict');
const test = require('node:test');
const { loadTs } = require('./load-ts.cjs');

class RequestUserError extends Error { constructor(status, message = 'denied') { super(message); this.status = status; } }

function harness({ actor = { id: 'teacher-1', role: 'INSTRUCTOR' }, fetchOk = true, listOk = true } = {}) {
  const seen = { roles: null, permission: null, fetched: [] };
  class RoomServiceClient {
    constructor(url) { seen.client = url; }
    async listRooms() { if (!listOk) throw new Error('unauthorized'); return []; }
  }
  const access = loadTs('../src/lib/livekit-access.ts', {
    'livekit-server-sdk': { TrackSource: {}, AccessToken: class {} }, '@/lib/db': { prisma: {} },
  });
  const route = loadTs('../src/app/api/live/diagnostics/route.ts', {
    'livekit-server-sdk': { RoomServiceClient },
    '@/lib/livekit-access': access,
    '@/lib/request-user': { RequestUserError, requireRequestUser: async (_r, roles, permission) => {
      seen.roles = roles; seen.permission = permission;
      if (!actor) throw new RequestUserError(401);
      if (!roles.includes(actor.role)) throw new RequestUserError(403);
      return actor;
    } },
  });
  const realFetch = global.fetch;
  const run = async () => {
    global.fetch = async (url) => { seen.fetched.push(String(url)); if (!fetchOk) throw new Error('down'); return new Response('', { status: 404 }); };
    try { const res = await route.GET(new Request('https://academy.test/api/live/diagnostics')); return { res, text: await res.text() }; }
    finally { global.fetch = realFetch; }
  };
  return { run, seen };
}

test.beforeEach(() => {
  process.env.LIVEKIT_API_KEY = 'diag-key-value'; process.env.LIVEKIT_API_SECRET = 'diag-secret-value';
  process.env.NEXT_PUBLIC_LIVEKIT_URL = 'wss://lk.example.invalid/';
});

test('diagnostics are restricted to hosts and never echo credentials', async () => {
  const h = harness();
  const { res, text } = await h.run();
  assert.equal(res.status, 200);
  assert.deepEqual(h.seen.roles, ['INSTRUCTOR', 'ADMIN', 'OWNER']);
  assert.equal(h.seen.permission, 'LIVE_CLASSES');
  assert.deepEqual(h.seen.fetched, ['https://lk.example.invalid/settings/regions']);
  const body = JSON.parse(text);
  assert.equal(body.ok, true); assert.equal(body.credentials, 'valid'); assert.equal(body.hostname, 'lk.example.invalid');
  assert.ok(!text.includes('diag-key-value') && !text.includes('diag-secret-value'));
  assert.equal(res.headers.get('cache-control'), 'private, no-store');
  assert.equal((await harness({ actor: { id: 's', role: 'STUDENT' } }).run()).res.status, 403);
  assert.equal((await harness({ actor: null }).run()).res.status, 401);
});

test('diagnostics report unreachable hosts, rejected credentials, bad URLs and missing settings by name only', async () => {
  let body = JSON.parse((await harness({ fetchOk: false }).run()).text);
  assert.equal(body.ok, false); assert.equal(body.probe.reachable, false); assert.equal(body.credentials, 'not-checked');
  body = JSON.parse((await harness({ listOk: false }).run()).text);
  assert.equal(body.ok, false); assert.equal(body.credentials, 'rejected-or-unreachable');
  const origError = console.error; console.error = () => {};
  try {
    process.env.NEXT_PUBLIC_LIVEKIT_URL = 'ws://lk.example.invalid';
    const prev = process.env.NODE_ENV; process.env.NODE_ENV = 'production';
    const bad = await harness().run(); process.env.NODE_ENV = prev;
    assert.equal(bad.res.status, 503); assert.equal(JSON.parse(bad.text).stage, 'URL');
  } finally { console.error = origError; }
  delete process.env.LIVEKIT_API_SECRET;
  const missing = await harness().run();
  assert.equal(missing.res.status, 503);
  assert.deepEqual(JSON.parse(missing.text).missing, ['LIVEKIT_API_SECRET']);
});
