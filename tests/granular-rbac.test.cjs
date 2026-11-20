/* eslint-disable @typescript-eslint/no-require-imports */
const assert = require('node:assert/strict');
const { test, beforeEach, afterEach } = require('node:test');
const { loadTs } = require('./load-ts.cjs');
const { PERMISSION_KEYS } = loadTs('../src/lib/permissions.ts');
const saved = process.env.NEXTAUTH_SECRET;
beforeEach(() => { process.env.NEXTAUTH_SECRET = 'rbac-test-only'; });
afterEach(() => { if (saved === undefined) delete process.env.NEXTAUTH_SECRET; else process.env.NEXTAUTH_SECRET = saved; });
const request = (body = {}, method = 'PUT') => new Request('https://academy.test/api/admin/permissions', {
  method, headers: { 'Content-Type': 'application/json', Origin: 'https://academy.test' }, body: JSON.stringify(body),
});

function harness(role = 'ADMIN', permissions = [], options = {}) {
  let actor = { id: 'actor', name: 'Actor', email: 'actor@example.test', role, isBanned: false, adminPermissions: permissions };
  let target = { id: 'target', role: 'ADMIN', adminPermissions: [] };
  let logs = [];
  const db = {
    user: {
      findUnique: async ({ where }) => structuredClone(where.id === 'actor' ? actor : target),
      update: async ({ data }) => { Object.assign(target, data); return target; },
    },
    permissionAuditLog: { create: async ({ data }) => {
      if (options.failAudit) throw Error('audit unavailable');
      logs.push({ ...data, createdAt: new Date() });
    } },
    $queryRaw: async () => [{ id: 'actor' }, { id: 'target' }],
    $transaction: async fn => {
      const prior = structuredClone({ target, logs });
      try { return await fn(db); } catch (error) { target = prior.target; logs = prior.logs; throw error; }
    },
  };
  const mocks = {
    '@/lib/auth': { authOptions: {} },
    'next-auth': { getServerSession: async () => ({ user: { id: 'actor', role: 'OWNER' }, expires: '2099-01-01' }) },
    '@/lib/db': { prisma: db },
    'next/navigation': { redirect: path => { throw Error(`redirect:${path}`); } },
  };
  return { mocks, db, setActor: value => { actor = { ...actor, ...value }; }, setTarget: value => { target = value; },
    state: () => ({ target, logs }),
    guard: loadTs('../src/lib/rbac.ts', mocks),
    permissions: loadTs('../src/lib/permission-check.ts', mocks),
    route: loadTs('../src/app/api/admin/permissions/route.ts', mocks),
  };
}

test('all fifteen permissions are independent, refreshed, deny by default, and OWNER retains access', async () => {
  assert.equal(PERMISSION_KEYS.length, 15);
  for (const permission of PERMISSION_KEYS) {
    const h = harness();
    assert.equal(await h.permissions.hasPermission('actor', permission), false);
    assert.equal((await h.guard.requireRoleApi(['ADMIN'], permission)).errorResponse.status, 403);
    h.setActor({ adminPermissions: [permission] });
    assert.equal((await h.guard.requireRoleApi(['ADMIN'], permission)).authorized, true);
    for (const other of PERMISSION_KEYS.filter(p => p !== permission)) assert.equal(await h.permissions.hasPermission('actor', other), false);
    h.setActor({ adminPermissions: [] });
    assert.equal(await h.permissions.hasPermission('actor', permission), false);
    h.setActor({ role: 'OWNER' });
    assert.equal(await h.permissions.hasPermission('actor', permission), true);
    h.setActor({ isBanned: true });
    assert.equal(await h.permissions.hasPermission('actor', permission), false);
  }
});

test('permission changes are owner-only even for ADMIN with every grant or a forged OWNER session', async () => {
  for (const role of ['ADMIN', 'INSTRUCTOR', 'STUDENT']) {
    const h = harness(role, PERMISSION_KEYS);
    assert.equal((await h.route.PUT(request({ targetId: 'target', permission: 'USERS', granted: true, expected: false }))).status, 403);
    assert.deepEqual(h.state().target.adminPermissions, []);
    assert.equal(h.state().logs.length, 0);
  }
});

test('grant, no-op, conflict and revoke keep audit actor, target, action and timestamp consistent', async () => {
  const h = harness('OWNER');
  const body = { targetId: 'target', permission: 'PAYMENTS', granted: true, expected: false };
  assert.equal((await h.route.PUT(request(body))).status, 200);
  assert.deepEqual(h.state().target.adminPermissions, ['PAYMENTS']);
  assert.equal((await h.route.PUT(request(body))).status, 409);
  assert.equal((await h.route.PUT(request({ ...body, expected: true }))).status, 200);
  assert.equal(h.state().logs.length, 1);
  assert.equal((await h.route.PUT(request({ ...body, granted: false, expected: true }))).status, 200);
  assert.deepEqual(h.state().target.adminPermissions, []);
  assert.deepEqual(h.state().logs.map(({ actorId, targetId, action, permission }) => ({ actorId, targetId, action, permission })),
    ['GRANT', 'REVOKE'].map(action => ({ actorId: 'actor', targetId: 'target', action, permission: 'PAYMENTS' })));
  assert.ok(h.state().logs.every(log => log.createdAt instanceof Date));
});

test('audit failure rolls back grants and OWNER/non-admin targets and malformed payloads cannot be edited', async () => {
  const body = { targetId: 'target', permission: 'USERS', granted: true, expected: false };
  const failing = harness('OWNER', [], { failAudit: true });
  assert.equal((await failing.route.PUT(request(body))).status, 500);
  assert.deepEqual(failing.state().target.adminPermissions, []);
  for (const role of ['OWNER', 'STUDENT', 'INSTRUCTOR']) {
    const h = harness('OWNER'); h.setTarget({ id: 'target', role, adminPermissions: [] });
    assert.equal((await h.route.PUT(request(body))).status, 403);
  }
  const h = harness('OWNER');
  for (const input of [null, [], { ...body, permission: 'UNKNOWN' }, { ...body, role: 'OWNER' }, { ...body, granted: 'true' }]) {
    assert.equal((await h.route.PUT(request(input))).status, 400);
  }
});

test('direct administrative API requests by a new admin are denied before business queries', async () => {
  const routes = {
    'admin/users': ['GET'], 'admin/users/[id]': ['PUT', 'DELETE'],
    'admin/users/[id]/live-limit': ['PUT'], 'admin/courses': ['GET'],
    'admin/courses/[id]': ['PUT', 'DELETE'], 'admin/payments/[id]': ['PATCH'],
    'admin/payments/approve': ['POST'], 'admin/wallet/approve': ['POST'],
    'admin/live': ['GET'], 'admin/live/[id]': ['PUT', 'DELETE'],
    'admin/settings': ['GET', 'POST'], 'admin/bundles': ['POST'],
    'admin/subscriptions': ['POST'], 'admin/emails/send': ['POST'],
    'courses': ['POST'], 'courses/[id]': ['PUT'], 'courses/[id]/publish': ['POST'],
    'chapters': ['POST'], 'chapters/[chapterId]': ['PUT', 'DELETE'],
    'lessons': ['POST'], 'lessons/[id]': ['PUT'], 'lessons/live': ['POST'],
    'attachments': ['POST'], 'attachments/[id]': ['DELETE'],
    'instructor/shorts': ['POST'], 'quizzes': ['POST'], 'quizzes/create': ['POST'],
    'quizzes/grade': ['POST'], 'questions': ['POST'], 'coupons': ['POST'],
    'mobile/courses': ['POST'], 'live/create': ['POST'],
  };
  for (const [path, methods] of Object.entries(routes)) {
    const h = harness();
    const route = loadTs(`../src/app/api/${path}/route.ts`, h.mocks);
    for (const method of methods) {
      assert.equal(typeof route[method], 'function', `${path} ${method} exists`);
      const req = method === 'GET' ? new Request('https://academy.test/api/' + path) : request({}, method);
      const response = await route[method](req, { params: Promise.resolve({ id: 'target', chapterId: 'chapter' }) });
      assert.equal(response.status, 403, `${method} ${path}`);
    }
  }
});
