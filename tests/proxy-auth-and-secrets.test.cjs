/* eslint-disable @typescript-eslint/no-require-imports -- Node test runner. */
// A reverse proxy's Basic credentials must not break the web session, and no
// external integration may fall back to a secret published in source code.
const assert = require('node:assert/strict');
const test = require('node:test');
const jwt = require('jsonwebtoken');
const { loadTs } = require('./load-ts.cjs');

const SECRET = 'proxy-auth-test-only-nextauth-secret';
const BASIC = `Basic ${Buffer.from('staging:pass-word').toString('base64')}`;
const USER = { id: 'student-1', role: 'STUDENT', email: 'student@example.test', name: 'طالب', phone: null };

function withEnv(t, values) {
  const previous = Object.fromEntries(Object.keys(values).map(key => [key, process.env[key]]));
  for (const [key, value] of Object.entries(values)) {
    if (value === undefined) delete process.env[key]; else process.env[key] = value;
  }
  t.after(() => {
    for (const [key, value] of Object.entries(previous)) {
      if (value === undefined) delete process.env[key]; else process.env[key] = value;
    }
  });
}

function requestUser({ session = { user: { id: USER.id } } } = {}) {
  const sessionReads = [];
  const helper = loadTs('../src/lib/request-user.ts', {
    '@/lib/auth': { authOptions: {} },
    'next-auth': { getServerSession: async () => { sessionReads.push(1); return session; } },
    '@/lib/db': { prisma: { user: { findUnique: async () => ({ ...USER, isBanned: false }) } } },
  });
  return { ...helper, sessionReads };
}

test('Authorization header classification', () => {
  const { readAuthorization } = requestUser();
  const kind = value => readAuthorization(new Headers(value === undefined ? {} : { Authorization: value }));
  assert.deepEqual(kind(undefined), { kind: 'none' });
  assert.deepEqual(kind(BASIC), { kind: 'none' });
  assert.deepEqual(kind('basic abc'), { kind: 'none' });
  assert.deepEqual(kind('Bearer abc.def.ghi'), { kind: 'bearer', token: 'abc.def.ghi' });
  for (const value of ['Bearer ', 'Token abc', 'Digest x', 'bearer abc', `Bearer ${'a'.repeat(8192)}`]) {
    assert.deepEqual(kind(value), { kind: 'invalid' }, value);
  }
});

test('a proxy Basic header keeps the web session working, with the same cross-site protection', async t => {
  withEnv(t, { NEXTAUTH_SECRET: SECRET, NEXTAUTH_URL: 'https://staging.academy.test' });
  const origin = 'https://staging.academy.test';
  const h = requestUser();
  // Page and API reads.
  assert.deepEqual(await h.requireRequestUser(new Request(`${origin}/api/notifications`, { headers: { Authorization: BASIC } })), USER);
  // Same-origin JSON mutation (checkout, progress, notifications).
  const ok = new Request(`${origin}/api/checkout/wallet`, { method: 'POST', body: '{}',
    headers: { Authorization: BASIC, Origin: origin, 'Content-Type': 'application/json' } });
  assert.deepEqual(await h.requireRequestUser(ok), USER);
  // Cross-site and form posts are still refused before the session is consulted.
  for (const headers of [{ Origin: 'https://evil.test', 'Content-Type': 'application/json' }, { Origin: origin, 'Content-Type': 'text/plain' }]) {
    const fresh = requestUser();
    const req = new Request(`${origin}/api/checkout/wallet`, { method: 'POST', body: '{}', headers: { Authorization: BASIC, ...headers } });
    await assert.rejects(fresh.requireRequestUser(req), error => error.status === 403);
    assert.equal(fresh.sessionReads.length, 0);
  }
  // Basic with no session is simply anonymous.
  await assert.rejects(requestUser({ session: null }).requireRequestUser(new Request(`${origin}/api/x`, { headers: { Authorization: BASIC } })), error => error.status === 401);
});

test('mobile Bearer tokens behave exactly as before; other schemes never fall back to the cookie', async t => {
  withEnv(t, { NEXTAUTH_SECRET: SECRET });
  const token = jwt.sign({ id: USER.id }, SECRET, { algorithm: 'HS256', expiresIn: '1h' });
  const h = requestUser({ session: null });
  assert.deepEqual(await h.requireRequestUser(new Request('https://a.test/x', { method: 'POST', headers: { Authorization: `Bearer ${token}` } })), USER);
  for (const value of ['Bearer forged', `Bearer ${jwt.sign({ id: USER.id }, 'other-secret')}`, 'Token abc']) {
    const fresh = requestUser();
    await assert.rejects(fresh.requireRequestUser(new Request('https://a.test/x', { headers: { Authorization: value } })), error => error.status === 401);
    assert.equal(fresh.sessionReads.length, 0, value);
  }
});

test('course pages and lesson playback treat a proxy Basic header as no credential', async t => {
  withEnv(t, { NEXTAUTH_SECRET: SECRET });
  const db = {
    user: { findUnique: async () => ({ id: USER.id, role: 'STUDENT', isBanned: false }) },
    enrollment: { findUnique: async () => null },
    lesson: { findUnique: async () => ({ videoUrl: 'https://example.test/v.mp4', isLive: false,
      chapter: { isFree: true, course: { id: 'c', instructorId: 't', status: 'PUBLISHED', price: 10, priceSYP: 0 } } }) },
  };
  const mocks = session => ({
    '@/lib/db': { prisma: db }, '@/lib/auth': { authOptions: {} },
    'next-auth': { getServerSession: async () => session },
  });
  const access = loadTs('../src/lib/course-access.ts', mocks({ user: { id: USER.id } }));
  assert.deepEqual(await access.getCourseViewer(new Request('https://a.test/x', { headers: { Authorization: BASIC } })), { id: USER.id, role: 'STUDENT' });

  class BunnyServerError extends Error { constructor(status, message) { super(message); this.status = status; } }
  const playbackMocks = {
    ...mocks(null),
    '@/lib/bunny-playback': { getBunnyPlaybackUrl: value => value },
    '@/lib/bunny-upload-server': { BunnyServerError, assertBunnyVideoReady: async () => {} },
  };
  playbackMocks['@/lib/lesson-playback'] = loadTs('../src/lib/lesson-playback.ts', playbackMocks);
  const route = loadTs('../src/app/api/lessons/[id]/playback/route.ts', playbackMocks).GET;
  const params = { params: Promise.resolve({ id: 'cabcdefghijklmnopqrstuvwx' }) };
  // A free preview lesson stays playable for an anonymous visitor behind the proxy.
  assert.equal((await route(new Request('https://a.test/x', { headers: { Authorization: BASIC } }), params)).status, 200);
  assert.equal((await route(new Request('https://a.test/x', { headers: { Authorization: 'Token x' } }), params)).status, 401);
});

test('cron refuses to run without a configured secret or with the old published default', async t => {
  let queried = 0;
  let mailed = 0;
  const route = () => loadTs('../src/app/api/cron/reminders/route.ts', {
    '@/lib/db': { prisma: { enrollment: { findMany: async () => { queried++; return [
      { user: { email: 's@example.test', name: 'S' }, course: { id: 'c', title: 'C' }, progress: 40 },
    ]; } } } },
    '@/lib/email': { sendCourseReminderEmail: async () => { mailed++; return false; } },
  }).POST;
  const call = (header, env) => {
    withEnv(t, { CRON_SECRET: env });
    return route()(new Request('https://a.test/api/cron/reminders', { method: 'POST', headers: header ? { Authorization: header } : {} }));
  };
  assert.equal((await call('Bearer dev-cron-secret', undefined)).status, 503);
  assert.equal((await call('Bearer anything', '   ')).status, 503);
  assert.equal((await call('Bearer dev-cron-secret', 'dev-cron-secret')).status, 503);
  assert.equal(queried, 0);
  const secret = 'c'.repeat(48);
  for (const header of [undefined, 'Bearer dev-cron-secret', `Bearer ${secret}x`, BASIC, `Basic ${secret}`]) {
    assert.equal((await call(header, secret)).status, 401, String(header));
  }
  assert.equal(queried, 0);
  const ok = await call(`Bearer ${secret}`, secret);
  assert.equal(ok.status, 200);
  assert.equal(queried, 1);
  assert.equal(mailed, 1);
  assert.match((await ok.json()).message, /^تم إرسال 0 تذكير من أصل 1/);   // e-mail disabled: not counted as sent
});

test('the demo stream route has no built-in secret and its tokens cannot be forged with the old one', async t => {
  const call = async env => {
    withEnv(t, { JWT_SECRET: env });
    const route = loadTs('../src/app/api/mobile/secure-stream/route.ts').POST;
    return route(new Request('https://a.test/x', { method: 'POST', body: JSON.stringify({ lessonId: 'l1' }) }));
  };
  for (const env of [undefined, '', 'secure-super-secret-key-for-video-streaming', 'too-short']) {
    assert.equal((await call(env)).status, 503, String(env));
  }
  const secret = 's'.repeat(40);
  const res = await call(secret);
  assert.equal(res.status, 200);
  const token = new URL((await res.json()).signedUrl).searchParams.get('token');
  assert.equal(jwt.verify(token, secret).lessonId, 'l1');
  assert.throws(() => jwt.verify(token, 'secure-super-secret-key-for-video-streaming'));
});

test('image uploads never use a built-in ImgBB key; without a key nothing is sent out', async t => {
  const stored = [];
  const outbound = [];
  const realFetch = global.fetch;
  t.after(() => { global.fetch = realFetch; });
  const upload = () => loadTs('../src/lib/file-upload.ts', {
    'next-auth': { getServerSession: async () => ({ user: { id: 'u1', role: 'STUDENT' } }) },
    '@/lib/auth': { authOptions: {} },
    '@/lib/db': { prisma: { storedFile: { create: async ({ data }) => { stored.push(data); return { id: `stored-${stored.length}` }; } } } },
    '@/lib/private-file-storage': {
      MAX_DOCUMENT_BYTES: 20 * 1024 * 1024, PrivateFileError: class extends Error {},
      recordLegacyImageOwner: async () => {}, storePrivateFile: async () => { throw new Error('not a document'); },
    },
  }).handleFileUpload;
  const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64');
  const request = () => {
    const form = new FormData();
    form.append('file', new File([png], 'photo.png', { type: 'image/png' }));
    return new Request('https://a.test/api/upload', { method: 'POST', body: form });
  };
  global.fetch = async (url, init) => {
    outbound.push({ url: String(url), key: new URLSearchParams(String(init.body)).get('key') });
    return new Response(JSON.stringify({ success: true, data: { url: 'https://i.ibb.co/x.png', title: 'photo' } }), { status: 200 });
  };

  withEnv(t, { IMGBB_API_KEY: undefined });
  let res = await upload()(request());
  assert.equal(res.status, 201);
  assert.match((await res.json()).url, /^\/api\/files\/stored-/);
  assert.equal(outbound.length, 0);                       // nothing left the platform

  withEnv(t, { IMGBB_API_KEY: 'deployment-own-imgbb-key' });
  res = await upload()(request());
  assert.equal((await res.json()).url, 'https://i.ibb.co/x.png');
  assert.deepEqual(outbound.map(o => o.key), ['deployment-own-imgbb-key']);

  global.fetch = async () => { throw new Error('network down'); };
  res = await upload()(request());
  assert.equal(res.status, 201);
  assert.match((await res.json()).url, /^\/api\/files\/stored-/);   // ImgBB failure falls back safely
});

test('e-mail is never sent, and no provider call is made, without RESEND_API_KEY', async t => {
  const constructed = [];
  const sends = [];
  const resendMock = { Resend: class { constructor(key) { constructed.push(key); this.emails = { send: async m => { sends.push(m); return { data: { id: '1' }, error: null }; } }; } } };
  withEnv(t, { RESEND_API_KEY: undefined });
  let email = loadTs('../src/lib/email.ts', { resend: resendMock });
  assert.equal(await email.sendPromotionalEmail('a@example.test', 'A', 'S', 'B'), false);
  assert.deepEqual(constructed, []);
  assert.equal(sends.length, 0);

  withEnv(t, { RESEND_API_KEY: 'deployment-own-resend-key' });
  email = loadTs('../src/lib/email.ts', { resend: resendMock });
  assert.equal(await email.sendPromotionalEmail('a@example.test', 'A', 'S', 'B'), true);
  assert.deepEqual(constructed, ['deployment-own-resend-key']);
  const rejecting = { Resend: class { constructor() { this.emails = { send: async () => ({ data: null, error: { message: 'invalid' } }) }; } } };
  assert.equal(await loadTs('../src/lib/email.ts', { resend: rejecting }).sendCourseReminderEmail('a@example.test', 'A', 'C', 'c', 50), false);
});
