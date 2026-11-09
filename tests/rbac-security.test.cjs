/* eslint-disable @typescript-eslint/no-require-imports -- Node test runner. */
const assert = require('node:assert/strict');
const { test, beforeEach, afterEach } = require('node:test');
const { loadTs } = require('./load-ts.cjs');
const original = process.env.NEXTAUTH_SECRET;
beforeEach(() => { process.env.NEXTAUTH_SECRET = 'rbac-unit-test-secret-only'; });
afterEach(() => { if (original === undefined) delete process.env.NEXTAUTH_SECRET; else process.env.NEXTAUTH_SECRET = original; });

function harness(options = {}) {
  const calls = [];
  const user = options.deleted ? null : { id: 'reviewer', email: 'qasemalsokhny@gmail.com', role: options.role ?? 'STUDENT', isBanned: Boolean(options.banned) };
  const mocks = {
    './auth': { authOptions: {} },
    'next-auth': { getServerSession: async () => {
      calls.push('session'); return options.anonymous ? null : { expires: '2099-01-01', user: { id: 'reviewer', email: 'stale@example.test', role: 'ADMIN' } };
    } },
    'next/navigation': { redirect: path => { throw new Error(`redirect:${path}`); } },
    './db': { prisma: { user: { findUnique: async () => { calls.push('current-user'); return user; } } } },
  };
  const rbac = loadTs('../src/lib/rbac.ts', mocks);
  const route = loadTs('../src/app/api/admin/users/[id]/route.ts', {
    '@/lib/rbac': rbac,
    '@/lib/db': { prisma: { user: { update: async () => { calls.push('forbidden-update'); throw new Error('Unexpected privilege update'); } } } },
  });
  return { rbac, route, calls };
}

test('a known owner email and stale ADMIN session never bypass the current database role', async () => {
  const h = harness(); const result = await h.rbac.checkRole(['ADMIN']);
  assert.equal(result.authorized, false); assert.equal(result.isOwner, false); assert.equal(result.role, 'STUDENT');
  assert.equal(result.session.user.role, 'STUDENT');
  const response = await h.route.PUT(new Request('https://academy.test/api/admin/users/reviewer', {
    method: 'PUT', body: JSON.stringify({ role: 'ADMIN', walletUSD: 99999 }),
  }), { params: Promise.resolve({ id: 'reviewer' }) });
  assert.equal(response.status, 403); assert.equal(h.calls.includes('forbidden-update'), false);
});

test('banned, deleted, anonymous and unknown-role accounts cannot use inherited administrative APIs', async () => {
  for (const options of [{ role: 'ADMIN', banned: true }, { deleted: true }, { anonymous: true }, { role: 'INVALID' }]) {
    const h = harness(options); const result = await h.rbac.requireRoleApi(['ADMIN']);
    assert.equal(result.authorized, false); assert.equal(result.errorResponse.status, 403);
  }
});

test('current ADMIN and explicit OWNER roles retain access with refreshed identity', async () => {
  for (const role of ['ADMIN', 'OWNER']) {
    const h = harness({ role }); const result = await h.rbac.requireRoleApi(['ADMIN']);
    assert.equal(result.authorized, true); assert.equal(result.errorResponse, undefined);
    assert.equal(result.session.user.role, role); assert.equal(result.session.user.email, 'qasemalsokhny@gmail.com');
    assert.equal(result.isOwner, role === 'OWNER');
  }
});

test('missing signing secret fails closed and page denials preserve the redirect contract', async () => {
  const h = harness(); await assert.rejects(h.rbac.requireRolePage(['ADMIN']), /redirect:\/dashboard/);
  delete process.env.NEXTAUTH_SECRET;
  const absent = harness({ role: 'ADMIN' }); assert.equal((await absent.rbac.checkRole(['ADMIN'])).authorized, false);
  assert.deepEqual(absent.calls, []);
});
