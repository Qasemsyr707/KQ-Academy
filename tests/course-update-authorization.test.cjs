/* eslint-disable @typescript-eslint/no-require-imports -- Node test runner. */
const assert = require('node:assert/strict');
const test = require('node:test');
const { Prisma } = require('@prisma/client');
const { loadTs } = require('./load-ts.cjs');

const COURSE = 'course-1';
const OWNER_ID = 'teacher-owner';
// Minimal taxonomy for the classification fields handled by the same request.
const CATEGORIES = [
  { id: 'cat_ai', slug: 'ai', name: 'الذكاء الاصطناعي', normalizedName: 'الذكاء الاصطناعي', aliases: ['AI'], isActive: true, parent: null },
  { id: 'cat_old', slug: 'old', name: 'موقوف', normalizedName: 'موقوف', aliases: [], isActive: false, parent: null },
];
const PREVIEW = 'https://iframe.mediadelivery.net/embed/123/0b8f5e0e-4a5f-4c5e-9f0e-1d2c3b4a5f60';

/** Route with an in-memory course and a role fake that follows rbac's rule (OWNER passes every role check). */
function harness({ role = 'INSTRUCTOR', userId = OWNER_ID, session = true } = {}) {
  const writes = [];
  const course = { id: COURSE, instructorId: OWNER_ID, title: 'Old', price: 50, priceSYP: 700000, status: 'PENDING', isFeatured: false, rating: 0, type: 'SKILL' };
  const mocks = {
    '@/lib/rbac': {
      requireRoleApi: async allowed => session && (role === 'OWNER' || allowed.includes(role))
        ? { authorized: true, role, session: { user: { id: userId, role } } }
        : { authorized: false, errorResponse: Response.json({ error: 'غير مصرح' }, { status: 403 }) },
    },
    '@/lib/bunny-upload-server': { assertBunnyVideoReady: async () => {}, BunnyServerError: class extends Error {} },
    '@/lib/db': { prisma: {
      course: {
        findUnique: async ({ where }) => (where.id === COURSE ? { instructorId: course.instructorId, type: course.type } : null),
        update: async ({ where, data }) => { writes.push(data); Object.assign(course, data); return { id: where.id, ...course }; },
      },
      category: {
        findUnique: async ({ where }) => CATEGORIES.find(c => c.id === where.id || c.normalizedName === where.normalizedName) ?? null,
        findMany: async () => CATEGORIES.filter(c => c.isActive),
      },
    } },
    '@/lib/course-search': { invalidateCatalogueSearch: () => {} },
  };
  const route = loadTs('../src/app/api/courses/[id]/route.ts', mocks);
  const put = (body, id = COURSE) => route.PUT(new Request(`https://academy.test/api/courses/${id}`, {
    method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
  }), { params: Promise.resolve({ id }) });
  return { put, writes, course };
}

// Every field an instructor must not change through this endpoint.
const FORBIDDEN = {
  price: 0, priceSYP: 0, status: 'PUBLISHED', isFeatured: true, rating: 5, instructorId: 'attacker', type: 'CURRICULUM',
  id: 'other-course', createdAt: '2020-01-01T00:00:00Z', updatedAt: '2020-01-01T00:00:00Z', unknownField: 'x',
};

test('mass assignment: the course owner cannot change price, status, featuring, rating, ownership or type', async () => {
  for (const [field, value] of Object.entries(FORBIDDEN)) {
    const h = harness();
    const res = await h.put({ [field]: value });
    assert.equal(res.status, 403, field);
    assert.match((await res.json()).error, new RegExp(field));
    assert.equal(h.writes.length, 0, `${field} was written`);
  }
  // Mixed with allowed fields, nothing at all is written (no partial update).
  const h = harness();
  assert.equal((await h.put({ includes: ['شهادة'], isFeatured: true, price: 1 })).status, 403);
  assert.deepEqual(h.writes, []);
  assert.deepEqual({ price: h.course.price, isFeatured: h.course.isFeatured, status: h.course.status }, { price: 50, isFeatured: false, status: 'PENDING' });
});

test('privilege escalation through this endpoint is closed for administrators too: admin-only fields use the admin endpoint', async () => {
  for (const role of ['ADMIN', 'OWNER']) {
    const h = harness({ role, userId: 'staff-1' });
    assert.equal((await h.put({ price: 0 })).status, 403);
    assert.equal((await h.put({ instructorId: 'someone' })).status, 403);
    assert.equal(h.writes.length, 0);
  }
});

test('the existing course-management requests keep working (features list, intro video)', async () => {
  const h = harness();
  const features = await h.put({ includes: [' متابعة شخصية ', 'شهادة معتمدة'] });
  assert.equal(features.status, 200);
  assert.deepEqual(h.writes.at(-1), { includes: ['متابعة شخصية', 'شهادة معتمدة'] });
  assert.equal((await h.put({ previewVideoUrl: PREVIEW })).status, 200);
  assert.deepEqual(h.writes.at(-1), { previewVideoUrl: PREVIEW });
  assert.equal((await h.put({ previewVideoUrl: null })).status, 200);
  // Clearing the features list stores a database NULL (Prisma requires DbNull for JSON columns).
  assert.equal((await h.put({ includes: null })).status, 200);
  assert.equal(h.writes.at(-1).includes, Prisma.DbNull);
});

test('content fields are validated before they are stored', async () => {
  const h = harness();
  const ok = await h.put({ title: '  عنوان جديد  ', description: 'وصف', durationHours: '12.5',
    thumbnail: 'https://cdn.example.com/course.jpg' });
  assert.equal(ok.status, 200);
  assert.deepEqual(h.writes.at(-1), { title: 'عنوان جديد', description: 'وصف', durationHours: 12.5, thumbnail: 'https://cdn.example.com/course.jpg' });
  for (const thumbnail of ['/api/files/abc123', 'data:image/png;base64,iVBORw0KGgo=', 'linear-gradient(135deg, #1a2b3c 0%, #0f172a 100%)', null]) {
    assert.equal((await h.put({ thumbnail })).status, 200, String(thumbnail));
  }
  const bad = [
    { title: '' }, { title: '   ' }, { title: 'x'.repeat(201) }, { title: 7 }, { category: '' }, { categoryId: 'cat_old' }, { categoryId: 'nope' },
    { includes: 'شهادة' }, { includes: [1] }, { includes: Array.from({ length: 51 }, () => 'x') },
    { durationHours: 5000 }, { durationHours: -1 }, { durationHours: true }, { durationHours: 'abc' },
    { thumbnail: 'javascript:alert(1)' }, { thumbnail: 'http://insecure.example/a.jpg' }, { thumbnail: '//evil.example/a.png' },
    { thumbnail: 'data:image/svg+xml;base64,PHN2Zz4=' }, { thumbnail: 'https://a.example/x.png) ; background:red' },
    { thumbnail: 'https://user:pass@a.example/x.png' }, { thumbnail: 'linear-gradient(red, url(https://evil))' },
    { previewVideoUrl: 5 },
  ];
  const before = h.writes.length;
  for (const body of bad) assert.equal((await h.put(body)).status, 400, JSON.stringify(body).slice(0, 80));
  assert.equal(h.writes.length, before);
});

test('only the course instructor, administrators and the owner may edit; students and visitors may not', async () => {
  assert.equal((await harness({ userId: 'another-teacher' }).put({ title: 'X' })).status, 403);
  assert.equal((await harness({ role: 'STUDENT', userId: 'student-1' }).put({ title: 'X' })).status, 403);
  assert.equal((await harness({ session: false }).put({ title: 'X' })).status, 403);
  for (const role of ['ADMIN', 'OWNER']) {
    const h = harness({ role, userId: 'staff-1' });
    assert.equal((await h.put({ title: 'تعديل إداري' })).status, 200, role);
  }
  assert.equal((await harness().put({ title: 'X' }, 'missing-course')).status, 404);
});

test('nested relation writes are still refused before any lookup', async () => {
  for (const key of ['chapters', 'attachments', 'instructor', 'payments', 'enrollments']) {
    const h = harness();
    assert.equal((await h.put({ [key]: { create: {} } })).status, 400, key);
    assert.equal(h.writes.length, 0);
  }
  for (const body of [null, [], 'text']) assert.equal((await harness().put(body)).status, 400);
});

test('classification fields are accepted with content fields, and validated against active categories', async () => {
  const h = harness();
  const res = await h.put({ title: 'عنوان', categoryId: 'cat_ai', tags: ['ChatGPT', 'chatgpt'], trainingType: 'PRACTICAL' });
  assert.equal(res.status, 200);
  assert.deepEqual(h.writes.at(-1), { title: 'عنوان', categoryId: 'cat_ai', category: 'الذكاء الاصطناعي', tags: ['ChatGPT'], trainingType: 'PRACTICAL' });
  // An older client sending the category name: linked when it names exactly one active category.
  assert.equal((await h.put({ category: 'AI' })).status, 200);
  assert.equal(h.writes.at(-1).categoryId, 'cat_ai');
});

test('one forbidden or invalid field refuses the whole request: nothing is written', async () => {
  for (const body of [
    { title: 'عنوان', categoryId: 'cat_ai', price: 0 },
    { description: 'وصف', tags: ['x1'], isFeatured: true },
    { categoryId: 'cat_ai', instructorId: 'attacker' },
    { title: 'عنوان', categoryId: 'cat_old' },
    { title: 'عنوان', trainingType: 'HYBRID' },
    { thumbnail: 'javascript:alert(1)', categoryId: 'cat_ai' },
  ]) {
    const h = harness();
    const res = await h.put(body);
    assert.ok([400, 403].includes(res.status), JSON.stringify(body));
    assert.deepEqual(h.writes, [], JSON.stringify(body));
    assert.equal(h.course.title, 'Old');
  }
});
