/* eslint-disable @typescript-eslint/no-require-imports -- Node's CommonJS test runner. */
const assert = require('node:assert/strict');
const { test, beforeEach, afterEach } = require('node:test');
const jwt = require('jsonwebtoken');
const { loadTs } = require('./load-ts.cjs');

const SECRET = 'request-user-unit-test-secret-only';
const ORIGINAL_SECRET = process.env.NEXTAUTH_SECRET;
const USER = { id: 'student-1', role: 'STUDENT', email: 'student@example.test', name: 'طالب', phone: null };
beforeEach(() => { process.env.NEXTAUTH_SECRET = SECRET; });
afterEach(() => {
  if (ORIGINAL_SECRET === undefined) delete process.env.NEXTAUTH_SECRET;
  else process.env.NEXTAUTH_SECRET = ORIGINAL_SECRET;
});

function harness({ session = { user: { id: USER.id, role: 'ADMIN' } }, user = { ...USER, isBanned: false } } = {}) {
  const lookups = [];
  const sessionReads = [];
  const authOptions = {};
  const helper = loadTs('../src/lib/request-user.ts', {
    '@/lib/auth': { authOptions },
    'next-auth': { getServerSession: async options => {
      assert.equal(options, authOptions);
      sessionReads.push(options);
      return session;
    } },
    '@/lib/db': { prisma: { user: { findUnique: async args => { lookups.push(args); return user; } } } },
  });
  return { ...helper, lookups, sessionReads };
}

function request({ authorization, body } = {}) {
  const headers = { Cookie: 'next-auth.session-token=mocked-session-cookie' };
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (authorization !== undefined) headers.Authorization = authorization;
  return new Request('https://academy.test/api/protected', body === undefined
    ? { headers } : { method: 'POST', headers, body: JSON.stringify(body) });
}
const bearer = (claims, options = {}, secret = SECRET) => `Bearer ${jwt.sign(claims, secret, { algorithm: 'HS256', ...options })}`;
const rejectsStatus = (h, req, status, roles) => assert.rejects(h.requireRequestUser(req, roles), error =>
  error instanceof h.RequestUserError && error.status === status);

test('cookie-session identity is resolved through the database and returns current profile/role instead of session claims', async () => {
  const h = harness();
  assert.deepEqual(await h.requireRequestUser(request()), USER);
  assert.equal(h.sessionReads.length, 1);
  assert.deepEqual(h.lookups, [{
    where: { id: USER.id },
    select: { id: true, role: true, email: true, name: true, phone: true, isBanned: true },
  }]);
});

test('valid HS256 bearer identity uses current database privileges without falling back to the cookie session', async () => {
  const current = { ...USER, role: 'ADMIN', name: 'المشرف', isBanned: false };
  const h = harness({ user: current, session: null });
  const result = await h.requireRequestUser(request({ authorization: bearer({ id: USER.id, role: 'STUDENT', email: 'stale@example.test' }, { expiresIn: '1h' }) }), ['ADMIN', 'OWNER']);
  assert.deepEqual(result, { ...USER, role: 'ADMIN', name: 'المشرف' });
  assert.deepEqual(h.lookups[0].where, { id: USER.id });
  assert.equal(h.sessionReads.length, 0);
});

test('stale ADMIN/OWNER claims and request body identity cannot override a current student database role', async () => {
  for (const authorization of [undefined, bearer({ id: USER.id, role: 'OWNER' })]) {
    const h = harness();
    const req = request({ authorization, body: { userId: 'another-user', id: 'another-user', role: 'ADMIN', email: 'owner@example.test' } });
    await rejectsStatus(h, req, 403, ['ADMIN', 'OWNER']);
    assert.deepEqual(h.lookups[0].where, { id: USER.id });
    assert.equal(req.bodyUsed, false, 'identity is never read from the submitted JSON');
  }
});

test('a current database OWNER role is accepted even when cookie claims retain a different role', async () => {
  const h = harness({ user: { ...USER, role: 'OWNER', isBanned: false }, session: { user: { id: USER.id, role: 'STUDENT' } } });
  assert.equal((await h.requireRequestUser(request(), ['ADMIN', 'OWNER'])).role, 'OWNER');
});

test('expired, wrongly signed and non-HS256 bearer tokens are rejected before session fallback or database access', async () => {
  const expired = bearer({ id: USER.id, exp: Math.floor(Date.now() / 1000) - 60 });
  const wrongSecret = bearer({ id: USER.id }, {}, 'another-unit-test-secret');
  const wrongAlgorithm = bearer({ id: USER.id }, { algorithm: 'HS384' });
  const unsigned = `${Buffer.from(JSON.stringify({ alg: 'none', typ: 'JWT' })).toString('base64url')}.${Buffer.from(JSON.stringify({ id: USER.id })).toString('base64url')}.`;
  for (const authorization of [expired, wrongSecret, wrongAlgorithm, `Bearer ${unsigned}`]) {
    const h = harness();
    await rejectsStatus(h, request({ authorization }), 401);
    assert.equal(h.lookups.length, 0);
    assert.equal(h.sessionReads.length, 0);
  }
});

test('missing server signing secret fails closed for cookie and bearer authentication without consulting other sources', async () => {
  const authorization = bearer({ id: USER.id });
  delete process.env.NEXTAUTH_SECRET;
  for (const header of [undefined, authorization]) {
    const h = harness();
    await rejectsStatus(h, request({ authorization: header }), 503);
    assert.equal(h.lookups.length, 0);
    assert.equal(h.sessionReads.length, 0);
  }
});

test('missing sessions and invalid credential IDs fail before any database lookup', async () => {
  for (const session of [null, {}, { user: {} }, { user: { id: '' } }, { user: { id: 123 } }, { user: { id: 'a'.repeat(201) } }]) {
    const h = harness({ session });
    await rejectsStatus(h, request(), 401);
    assert.equal(h.lookups.length, 0);
  }
  for (const claims of [{}, { id: '' }, { id: 123 }, { id: 'a'.repeat(201) }]) {
    const h = harness();
    await rejectsStatus(h, request({ authorization: bearer(claims) }), 401);
    assert.equal(h.lookups.length, 0);
    assert.equal(h.sessionReads.length, 0);
  }
});

test('malformed, oversized or unsupported Authorization headers cannot fall back to an otherwise valid session', async () => {
  for (const authorization of ['Basic abc', 'Bearer malformed-token', `Bearer ${'a'.repeat(8192)}`]) {
    const h = harness();
    await rejectsStatus(h, request({ authorization }), 401);
    assert.equal(h.lookups.length, 0);
    assert.equal(h.sessionReads.length, 0);
  }
});

test('deleted and banned database users are denied for both cookie and bearer credentials', async () => {
  for (const user of [null, { ...USER, role: 'ADMIN', isBanned: true }]) {
    for (const authorization of [undefined, bearer({ id: USER.id, role: 'ADMIN' })]) {
      const h = harness({ user });
      await rejectsStatus(h, request({ authorization }), 401, ['ADMIN', 'OWNER']);
      assert.equal(h.lookups.length, 1);
    }
  }
});

test('cookie mutations reject cross-origin or form requests before consulting the session', async () => {
  for (const headers of [{ Origin: 'https://untrusted.test', 'Content-Type': 'application/json' }, { 'Content-Type': 'text/plain' }]) {
    const h = harness();
    const req = new Request('https://academy.test/api/protected', { method: 'POST', headers, body: '{}' });
    await rejectsStatus(h, req, 403);
    assert.equal(h.lookups.length, 0); assert.equal(h.sessionReads.length, 0);
  }
});

test('same-origin JSON cookie requests still use the current database user', async () => {
  const h = harness();
  const origin = new URL(process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_APP_URL || 'https://academy.test').origin;
  const req = new Request(`${origin}/api/protected`, { method: 'POST', headers: { Origin: origin, 'Content-Type': 'application/json; charset=utf-8' }, body: '{}' });
  assert.deepEqual(await h.requireRequestUser(req), USER);
});
