/* eslint-disable @typescript-eslint/no-require-imports -- Node test runner. */
/**
 * The real upload server code (create / refresh / status / lesson link checks)
 * against a local Bunny simulator. No request leaves the machine.
 */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { randomUUID, createHash } = require('node:crypto');
const { test, before, after } = require('node:test');
const { loadTs } = require('./load-ts.cjs');
const { startBunnySimulator } = require('./helpers/bunny-simulator.cjs');

const OWNER = { id: 'teacher-owner', role: 'INSTRUCTOR' };
let sim;
let stateDir;
const saved = {};

before(async () => {
  sim = await startBunnySimulator({ libraryId: '424242', apiKey: 'simulated-key-not-a-secret', processingPolls: 1 });
  stateDir = fs.mkdtempSync(path.join(os.tmpdir(), 'kq-bunny-ops-'));
  for (const key of ['BUNNY_API_BASE_URL', 'BUNNY_LIBRARY_ID', 'BUNNY_API_KEY', 'BUNNY_UPLOAD_STATE_DIR', 'BUNNY_MAX_UPLOAD_BYTES']) saved[key] = process.env[key];
  Object.assign(process.env, { BUNNY_API_BASE_URL: sim.origin, BUNNY_LIBRARY_ID: sim.libraryId, BUNNY_API_KEY: sim.apiKey, BUNNY_UPLOAD_STATE_DIR: stateDir });
  delete process.env.BUNNY_MAX_UPLOAD_BYTES;
});
after(async () => {
  await sim.close();
  for (const [key, value] of Object.entries(saved)) { if (value === undefined) delete process.env[key]; else process.env[key] = value; }
  fs.rmSync(stateDir, { recursive: true, force: true });
});

function load({ user = OWNER, courseOwner = OWNER.id, lessons = [] } = {}) {
  const mocks = {
    '@/lib/auth': { authOptions: {} },
    'next-auth': { getServerSession: async () => (user ? { user } : null) },
    '@/lib/db': { prisma: {
      // Roles and permissions are refreshed from the database on every request.
      user: { findUnique: async ({ where }) => (user && where.id === user.id ? { email: `${user.id}@example.invalid`, isBanned: false, adminPermissions: ['COURSES'], ...user } : null) },
      course: { findUnique: async ({ where }) => (where.id === 'course-1' ? { instructorId: courseOwner } : null) },
      lesson: { findFirst: async ({ where }) => lessons.find(l => l.videoUrl.toLowerCase().includes(where.videoUrl.contains)
        && (!where.NOT || l.id !== where.NOT.id)) ?? null },
    } },
  };
  return loadTs('../src/lib/bunny-upload-server.ts', mocks);
}
const call = (server, action, body) => server.handleBunnyUploadRequest(action, new Request('https://academy.test/api/bunny', {
  method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
}));
const scope = (extra = {}) => ({ operationId: randomUUID(), courseId: 'course-1', purpose: 'lesson', ...extra });
const MP4 = { name: 'lecture.mp4', size: 3 * 1024 ** 3, type: 'video/mp4' };   // 3 GB: above the old 2 GB worry

test('type and size are checked before any Bunny video is created', async () => {
  const server = load();
  const before = sim.stats.creates;
  for (const [file, status] of [
    [undefined, 400], [{ name: 'notes.pdf', size: 1000, type: 'application/pdf' }, 415], [{ name: 'clip.exe', size: 1000, type: '' }, 415],
    [{ name: 'clip.mp4', size: 1000, type: 'text/html' }, 415], [{ name: 'clip.mp4', size: 0, type: 'video/mp4' }, 400],
    [{ name: 'clip.mp4', size: -5, type: 'video/mp4' }, 400], [{ name: 'clip.mp4', size: 31 * 1024 ** 3, type: 'video/mp4' }, 413],
  ]) {
    const res = await call(server, 'create', { ...scope(), title: 'Lesson', file });
    assert.equal(res.status, status, JSON.stringify(file));
  }
  assert.equal(sim.stats.creates, before);
  // The limit is configurable on the server.
  process.env.BUNNY_MAX_UPLOAD_BYTES = String(1024 ** 3);
  assert.equal((await call(server, 'create', { ...scope(), title: 'Lesson', file: MP4 })).status, 413);
  delete process.env.BUNNY_MAX_UPLOAD_BYTES;
});

test('a 3 GB video is authorized: signed for its own VideoId, endpoint named by the server, key never exposed', async () => {
  const server = load();
  const res = await call(server, 'create', { ...scope(), title: 'Large lesson', file: MP4 });
  assert.equal(res.status, 200);
  assert.equal(res.headers.get('cache-control'), 'private, no-store');
  const body = await res.json();
  assert.equal(body.tusEndpoint, `${sim.origin}/tusupload`);
  assert.equal(body.signature, sim.signature(body.expireTime, body.videoId));
  assert.ok(body.expireTime > Date.now() / 1000 + 23 * 3600);
  assert.ok(!JSON.stringify(body).includes(sim.apiKey), 'API key leaked');
});

test('retrying the same operation never creates a second video (concurrent retries fail closed)', async () => {
  const server = load();
  const op = scope();
  const before = sim.stats.creates;
  // Three simultaneous attempts: exactly one creates; the others are told it is in progress (409), never a new video.
  const results = await Promise.all([1, 2, 3].map(() => call(server, 'create', { ...op, title: 'Lesson', file: MP4 })
    .then(async r => ({ status: r.status, body: await r.json() }))));
  const ok = results.filter(r => r.status === 200);
  assert.ok(ok.length >= 1);
  assert.ok(results.every(r => r.status === 200 || r.status === 409), JSON.stringify(results.map(r => r.status)));
  assert.equal(new Set(ok.map(r => r.body.videoId)).size, 1);
  assert.equal(sim.stats.creates, before + 1);
  // A later retry of the same operation gets the same video.
  const again = await (await call(server, 'create', { ...op, title: 'Lesson', file: MP4 })).json();
  assert.equal(again.videoId, ok[0].body.videoId);
  assert.equal(sim.stats.creates, before + 1);
});

test('foreign courses, students and anonymous callers cannot create, refresh or check uploads', async () => {
  const before = sim.stats.creates;
  assert.equal((await call(load({ courseOwner: 'someone-else' }), 'create', { ...scope(), title: 'X', file: MP4 })).status, 403);
  assert.equal((await call(load({ user: { id: 's1', role: 'STUDENT' } }), 'create', { ...scope(), title: 'X', file: MP4 })).status, 401);
  assert.equal((await call(load({ user: null }), 'create', { ...scope(), title: 'X', file: MP4 })).status, 401);
  assert.equal(sim.stats.creates, before);
  // A resume token is bound to user, course, operation and video.
  const owner = load();
  const op = scope();
  const created = await (await call(owner, 'create', { ...op, title: 'X', file: MP4 })).json();
  const other = load({ user: { id: 'another-teacher', role: 'INSTRUCTOR' }, courseOwner: 'another-teacher' });
  assert.equal((await call(other, 'refresh', { ...op, videoId: created.videoId, resumeToken: created.resumeToken })).status, 403);
  assert.equal((await call(owner, 'refresh', { ...op, operationId: randomUUID(), videoId: created.videoId, resumeToken: created.resumeToken })).status, 403);
  assert.equal((await call(owner, 'refresh', { ...op, videoId: created.videoId, resumeToken: created.resumeToken + 'x' })).status, 403);
});

test('TUS transfer against the signature, then processing, then ready; refresh re-signs the same video', async () => {
  const server = load();
  const op = scope();
  const content = Buffer.alloc(5 * 1024 * 1024 + 123, 7);
  const created = await (await call(server, 'create', { ...op, title: 'Small', file: { name: 'small.mp4', size: content.length, type: 'video/mp4' } })).json();
  const headers = { 'Tus-Resumable': '1.0.0', AuthorizationSignature: created.signature, AuthorizationExpire: String(created.expireTime), VideoId: created.videoId, LibraryId: created.libraryId };
  // Wrong signature: refused.
  assert.equal((await fetch(created.tusEndpoint, { method: 'POST', headers: { ...headers, AuthorizationSignature: '0'.repeat(64), 'Upload-Length': String(content.length) } })).status, 401);
  const resource = await fetch(created.tusEndpoint, { method: 'POST', headers: { ...headers, 'Upload-Length': String(content.length) } });
  assert.equal(resource.status, 201);
  const location = new URL(resource.headers.get('location'), created.tusEndpoint).href;
  // Two parts, the second after a "refresh" (new signature for the same video and resource).
  const half = 3 * 1024 * 1024;
  assert.equal((await fetch(location, { method: 'PATCH', headers: { ...headers, 'Upload-Offset': '0', 'Content-Type': 'application/offset+octet-stream' }, body: content.subarray(0, half) })).status, 204);
  await new Promise(r => setTimeout(r, 1100));
  const refreshed = await (await call(server, 'refresh', { ...op, videoId: created.videoId, resumeToken: created.resumeToken })).json();
  assert.equal(refreshed.videoId, created.videoId);
  assert.notEqual(refreshed.signature, created.signature);
  const head = await fetch(location, { method: 'HEAD', headers: { ...headers, AuthorizationSignature: refreshed.signature, AuthorizationExpire: String(refreshed.expireTime) } });
  assert.equal(head.headers.get('upload-offset'), String(half));
  assert.equal((await fetch(location, { method: 'PATCH', headers: { ...headers, AuthorizationSignature: refreshed.signature, AuthorizationExpire: String(refreshed.expireTime), 'Upload-Offset': String(half), 'Content-Type': 'application/offset+octet-stream' }, body: content.subarray(half) })).status, 204);
  assert.equal(sim.resourcesFor(created.videoId)[0].digest, createHash('sha256').update(content).digest('hex'));

  // Processing, then ready, then the embed URL - checked by the server, never by the browser alone.
  let status = await (await call(server, 'status', { ...op, videoId: created.videoId, resumeToken: created.resumeToken })).json();
  assert.equal(status.state, 'processing');
  status = await (await call(server, 'status', { ...op, videoId: created.videoId, resumeToken: created.resumeToken })).json();
  status = status.state === 'ready' ? status : await (await call(server, 'status', { ...op, videoId: created.videoId, resumeToken: created.resumeToken })).json();
  assert.equal(status.state, 'ready');
  assert.equal(status.embedUrl, `https://iframe.mediadelivery.net/embed/${sim.libraryId}/${created.videoId}`);
  // Re-creating the finished operation answers its state, never a new video or a new signature.
  const again = await (await call(server, 'create', { ...op, title: 'Small', file: { name: 'small.mp4', size: content.length, type: 'video/mp4' } })).json();
  assert.equal(again.videoId, created.videoId);
  assert.equal(again.signature, undefined);
  assert.equal(sim.stats.deletes, 0, 'nothing is ever deleted at Bunny');
});

test('a lesson link is checked: ready video only, and never a video already used by another lesson', async () => {
  const videoId = randomUUID();
  sim.videos.set(videoId, { status: 4, polls: 0, deleted: false });
  const embed = `https://iframe.mediadelivery.net/embed/${sim.libraryId}/${videoId}`;
  const server = load({ lessons: [{ id: 'lesson-a', videoUrl: embed }] });
  await server.assertBunnyVideoReady(embed);
  await assert.rejects(server.assertBunnyVideoUnused(embed), error => error.status === 409);
  await server.assertBunnyVideoUnused(embed, 'lesson-a');                              // the lesson itself
  await server.assertBunnyVideoUnused(`https://iframe.mediadelivery.net/embed/${sim.libraryId}/${randomUUID()}`);
  await server.assertBunnyVideoUnused('https://www.youtube.com/watch?v=abc');           // other providers unchanged
  const processing = randomUUID();
  sim.videos.set(processing, { status: 3, polls: -100, deleted: false });
  await assert.rejects(server.assertBunnyVideoReady(`https://iframe.mediadelivery.net/embed/${sim.libraryId}/${processing}`), error => error.status === 409);
});

test('the Bunny API origin can only be overridden by https or by a loopback simulator', () => {
  const server = load();
  assert.equal(server.bunnyApiBase(''), 'https://video.bunnycdn.com');   // unset: Bunny itself
  assert.equal(server.bunnyApiBase('http://127.0.0.1:4580'), 'http://127.0.0.1:4580');
  assert.equal(server.bunnyApiBase('https://bunny-proxy.example'), 'https://bunny-proxy.example');
  for (const bad of ['http://evil.example', 'http://127.0.0.1:1/path', 'https://user:pass@x.example', 'ftp://127.0.0.1', 'not a url']) {
    assert.throws(() => server.bunnyApiBase(bad), error => error.status === 503, bad);
  }
});
