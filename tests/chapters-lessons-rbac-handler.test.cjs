// Handler-level authorization regression tests for KQ Academy chapter/lesson writes.
// Requires the project's local `typescript` dev dependency; no database/network is used.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { resolve } = require('node:path');
const Module = require('node:module');
const root = resolve(__dirname, '..');
// Worktrees do not share node_modules: reuse the main checkout's compiler when available.
let ts;
for (const location of [
  'typescript',
  resolve(root, '../syrian-elearning/node_modules/typescript'),
  resolve(root, '../kqacademy-hotfix-security-20261117/node_modules/typescript'),
]) {
  try { ts = require(location); break; } catch (error) {
    if (error.code !== 'MODULE_NOT_FOUND') throw error;
  }
}
if (!ts) throw new Error('TypeScript dependency missing; install project dependencies before running handler tests');
function loadRoute(rel, overrides = {}) {
  const filename = resolve(root, rel);
  const src = readFileSync(filename, 'utf8');
  const code = ts.transpileModule(src, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
    fileName: filename,
    reportDiagnostics: true,
  });
  const errors = (code.diagnostics || []).filter(d => d.category === ts.DiagnosticCategory.Error);
  assert.equal(errors.length, 0, 'TypeScript transpile must succeed');
  const mod = new Module(filename, module);
  mod.filename = filename;
  mod.paths = Module._nodeModulePaths(resolve(root, 'src'));
  const mocks = {
    'next/server': {
      NextResponse: { json: (body, opts = {}) => ({ status: opts.status || 200, body, headers: opts.headers }) },
    },
    '@/lib/db': { prisma: overrides.prisma },
    '@/lib/rbac': { requireRoleApi: overrides.requireRoleApi },
    '@/lib/bunny-upload-server': {
      assertBunnyVideoReady: async () => {},
      assertBunnyVideoUnused: async () => {},
      BunnyServerError: class BunnyServerError extends Error {},
      isBunnyVideoId: () => true,
    },
    '@/lib/owned-document': { assertOwnedDocumentReference: async () => {} },
    '@/lib/notifications': { notifySafely: async () => {} },
    '@/lib/private-file-storage': { PrivateFileError: class PrivateFileError extends Error {} },
    '@/lib/lesson-video': { normalizeLessonVideoReference: () => null },
  };
  mod.require = request => {
    if (Object.hasOwn(mocks, request)) return mocks[request];
    return Module.prototype.require.call(mod, request);
  };
  mod._compile(code.outputText, filename);
  return mod.exports;
}
function auth(role, id = 'actor') {
  return async () => role === null
    ? { authorized: false, errorResponse: { status: 403, body: { error: 'forbidden' } } }
    : { authorized: true, session: { user: { id, role } } };
}
function request(body) { return { json: async () => body }; }

for (const [label, role, instructor, status] of [
  ['anonymous', null, 'actor', 403],
  ['student', null, 'actor', 403],
  ['banned', null, 'actor', 403],
  ['downgraded old session', null, 'actor', 403],
  ['foreign instructor', 'INSTRUCTOR', 'someone-else', 403],
  ['course instructor', 'INSTRUCTOR', 'actor', 201],
  ['admin', 'ADMIN', 'someone-else', 201],
  ['owner', 'OWNER', 'someone-else', 201],
]) {
  test(`POST chapter: ${label}`, async () => {
    let writes = 0;
    const prisma = {
      course: { findUnique: async () => ({ instructorId: instructor }) },
      chapter: { count: async () => 0, create: async ({ data }) => { writes++; return data; } },
    };
    const { POST } = loadRoute('src/app/api/chapters/route.ts', { prisma, requireRoleApi: auth(role) });
    const response = await POST(request({ title: 'Chapter', courseId: 'course' }));
    assert.equal(response.status, status);
    assert.equal(writes, status === 201 ? 1 : 0);
  });
}
test('POST chapter: nonexistent course returns 404 without writing', async () => {
  let writes = 0;
  const prisma = {
    course: { findUnique: async () => null },
    chapter: { count: async () => 0, create: async () => { writes++; } },
  };
  const { POST } = loadRoute('src/app/api/chapters/route.ts', { prisma, requireRoleApi: auth('INSTRUCTOR') });
  assert.equal((await POST(request({ title: 'Chapter', courseId: 'missing' }))).status, 404);
  assert.equal(writes, 0);
});

for (const [label, role, instructor, expected] of [
  ['student or downgraded', null, 'actor', 403],
  ['foreign instructor', 'INSTRUCTOR', 'other', 403],
  ['course instructor', 'INSTRUCTOR', 'actor', 201],
  ['admin', 'ADMIN', 'other', 201],
  ['owner', 'OWNER', 'other', 201],
]) {
  test(`POST lesson: ${label}`, async () => {
    let writes = 0;
    const prisma = {
      chapter: { findUnique: async () => ({ course: { instructorId: instructor } }) },
      lesson: {
        count: async () => 0,
        create: async ({ data }) => { writes++; return data; },
      },
    };
    const { POST } = loadRoute('src/app/api/lessons/route.ts', { prisma, requireRoleApi: auth(role) });
    const response = await POST(request({ title: 'Lesson', chapterId: 'chapter', videoSource: 'url' }));
    assert.equal(response.status, expected);
    assert.equal(writes, expected === 201 ? 1 : 0);
  });
}

for (const [label, role, instructor, expected] of [
  ['downgraded or banned', null, 'actor', 403],
  ['foreign instructor', 'INSTRUCTOR', 'other', 403],
  ['course instructor', 'INSTRUCTOR', 'actor', 200],
  ['admin', 'ADMIN', 'other', 200],
  ['owner', 'OWNER', 'other', 200],
]) {
  test(`PUT lesson: ${label}`, async () => {
    let writes = 0;
    const prisma = {
      lesson: {
        findUnique: async () => ({ chapter: { course: { instructorId: instructor } }, isLive: false }),
        update: async ({ data }) => { writes++; return data; },
      },
    };
    const { PUT } = loadRoute('src/app/api/lessons/[id]/route.ts', { prisma, requireRoleApi: auth(role) });
    const response = await PUT(request({ title: 'Edited lesson' }), { params: Promise.resolve({ id: 'lesson' }) });
    assert.equal(response.status, expected);
    assert.equal(writes, expected === 200 ? 1 : 0);
  });
}
