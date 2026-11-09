/* eslint-disable @typescript-eslint/no-require-imports -- Node test runner. */
const assert = require('node:assert/strict');
const { test, beforeEach, afterEach } = require('node:test');
const jwt = require('jsonwebtoken');
const { loadTs } = require('./load-ts.cjs');
const original = process.env.NEXTAUTH_SECRET;
beforeEach(() => { process.env.NEXTAUTH_SECRET = 'mobile-auth-unit-test-only'; });
afterEach(() => { if (original === undefined) delete process.env.NEXTAUTH_SECRET; else process.env.NEXTAUTH_SECRET = original; });

function harness(options = {}) {
  const calls = [];
  const user = { id: 'buyer', name: 'Buyer', email: 'buyer@example.test', password: 'mock-hash', role: 'STUDENT', isBanned: Boolean(options.banned) };
  const mocks = {
    '@/lib/db': { prisma: { user: {
      findUnique: async () => { calls.push('lookup'); return options.register || options.missing ? null : user; },
      create: async ({ data }) => { calls.push('create'); assert.equal(data.role, 'STUDENT'); return user; },
    } } },
    bcryptjs: { compare: async () => options.validPassword !== false, hash: async () => 'mock-hash' },
  };
  return { calls, routes: {
    login: loadTs('../src/app/api/mobile/login/route.ts', mocks).POST,
    alias: loadTs('../src/app/api/mobile/auth/login/route.ts', mocks).POST,
    register: loadTs('../src/app/api/mobile/auth/register/route.ts', mocks).POST,
  } };
}
function request(body = {}) {
  return new Request('https://academy.test/api/mobile/auth', { method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'buyer@example.test', password: 'example-password', name: 'Buyer', ...body }) });
}

test('all mobile credential issuers fail before DB writes when the signing secret is absent', async () => {
  delete process.env.NEXTAUTH_SECRET;
  const h = harness({ register: true });
  for (const handler of Object.values(h.routes)) assert.equal((await handler(request())).status, 503);
  assert.deepEqual(h.calls, []);
});

test('both login endpoints reject banned users and wrong credentials', async () => {
  for (const options of [{ banned: true }, { missing: true }, { validPassword: false }]) {
    const h = harness(options);
    for (const kind of ['login', 'alias']) assert.equal((await h.routes[kind](request())).status, 401);
  }
});

test('login and registration sign the stored identity and role with an expiring server credential', async () => {
  for (const kind of ['login', 'alias', 'register']) {
    const h = harness({ register: kind === 'register' });
    const response = await h.routes[kind](request({ userId: 'victim', role: 'ADMIN' }));
    assert.equal(response.status, kind === 'register' ? 201 : 200);
    const body = await response.json();
    const claims = jwt.verify(body.token, process.env.NEXTAUTH_SECRET, { algorithms: ['HS256'] });
    assert.equal(claims.id, 'buyer'); assert.equal(claims.role, 'STUDENT'); assert.ok(claims.exp > claims.iat);
    assert.equal(body.user.password, undefined); assert.equal(body.user.isBanned, undefined);
  }
});

test('web credential login never promotes an account based on its email address', async () => {
  const user = { id: 'buyer', email: 'qasemalsokhny@gmail.com', name: 'Buyer', password: 'mock-hash', role: 'STUDENT', phone: null, isBanned: false };
  const { authOptions } = loadTs('../src/lib/auth.ts', {
    '@/lib/db': { prisma: { user: { findFirst: async () => user, update: async () => { throw new Error('login must not change privileges'); } } } },
    'next-auth/providers/credentials': options => options,
    bcryptjs: { compare: async () => true },
  });
  const result = await authOptions.providers[0].authorize({ email: user.email, password: 'example' });
  assert.equal(result.role, 'STUDENT'); assert.equal(authOptions.secret, process.env.NEXTAUTH_SECRET);
});
