/* eslint-disable @typescript-eslint/no-require-imports -- Node test runner. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const { loadTs } = require('./load-ts.cjs');

// Policy under test: src/lib/course-review.ts. Taxonomy rules have their own tests (course-taxonomy).
class TaxonomyError extends Error { constructor(status, message) { super(message); this.status = status; } }
const TAXONOMY = {
  TAXONOMY_FIELDS: ['categoryId', 'category', 'tags', 'trainingType'],
  TaxonomyError,
  resolveCourseTaxonomy: async () => ({ category: 'برمجة', categoryId: 'cat_code', tags: [], trainingType: null }),
  assertTypeFitsCategory: async () => {},
};

function harness({ role = 'INSTRUCTOR', userId = 'teacher-1', existing = { status: 'PENDING' } } = {}) {
  const writes = [];
  let invalidations = 0;
  const mocks = {
    '@/lib/rbac': {
      requireRoleApi: async allowed => (role === 'OWNER' || allowed.includes(role))
        ? { authorized: true, role, session: { user: { id: userId, role } } }
        : { authorized: false, errorResponse: Response.json({ error: 'غير مصرح' }, { status: 403 }) },
    },
    '@/lib/course-search': { invalidateCatalogueSearch: () => { invalidations++; } },
    '@/lib/course-taxonomy': TAXONOMY,
    '@/lib/permission-check': { hasPermission: async () => true },
    '@/lib/db': { prisma: { course: {
      create: async ({ data }) => { writes.push(['create', data]); return { id: 'new-course', ...data }; },
      findUnique: async ({ where }) => (where.id === 'course-1' && existing ? existing : null),
      update: async ({ where, data }) => { writes.push(['update', data]); return { id: where.id, ...existing, ...data }; },
    } } },
  };
  const create = loadTs('../src/app/api/courses/route.ts', mocks).POST;
  const admin = loadTs('../src/app/api/admin/courses/[id]/route.ts', mocks).PUT;
  const json = (method, body) => new Request('https://academy.test/api', { method, headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
  return { writes, get invalidations() { return invalidations; },
    create: body => create(json('POST', body)),
    admin: (body, id = 'course-1') => admin(json('PUT', body), { params: Promise.resolve({ id }) }) };
}
const BASE = { title: 'كورس', categoryId: 'cat_code' };

test('web: an instructor creates a DRAFT with a proposed price, owned by the session account', async () => {
  const h = harness();
  const res = await h.create({ ...BASE, price: '49', priceSYP: '600000' });
  assert.equal(res.status, 201);
  const [, data] = h.writes[0];
  assert.equal(data.status, 'DRAFT');
  assert.equal(data.price, 49);
  assert.equal(data.priceSYP, 600000);
  assert.equal(data.instructorId, 'teacher-1');
  assert.equal(h.invalidations, 0);                       // not public, search untouched
  assert.match((await res.json()).message, /مسودة/);
});

test('web: hidden administrative fields reject the whole creation request', async () => {
  for (const extra of [{ status: 'PUBLISHED' }, { instructorId: 'teacher-2' }, { isFeatured: true }, { rating: 5 },
    { id: 'chosen-id' }, { createdAt: '2020-01-01' }, { previewVideoUrl: 'https://x' }]) {
    const h = harness();
    const res = await h.create({ ...BASE, price: 10, priceSYP: 1, ...extra });
    assert.equal(res.status, 403, JSON.stringify(extra));
    assert.equal(h.writes.length, 0);
  }
});

test('web: invalid prices are refused, never silently turned into a free course', async () => {
  for (const price of ['-1', 'abc', '1e9999', {}, [], true, -5, '12oops']) {
    const h = harness({ role: 'ADMIN' });
    assert.equal((await h.create({ ...BASE, price, priceSYP: 0 })).status, 400, JSON.stringify(price));
    assert.equal(h.writes.length, 0);
  }
});

test('web: staff publish directly only when both prices are stated; otherwise a DRAFT', async () => {
  for (const role of ['ADMIN', 'OWNER']) {
    const priced = harness({ role, userId: 'staff-1' });
    assert.equal((await priced.create({ ...BASE, price: 0, priceSYP: '0' })).status, 201);
    assert.equal(priced.writes[0][1].status, 'PUBLISHED');        // explicit 0 = deliberate free course
    assert.equal(priced.invalidations, 1);
    for (const body of [{ ...BASE }, { ...BASE, price: '', priceSYP: '' }, { ...BASE, price: 30 }]) {
      const h = harness({ role, userId: 'staff-1' });
      assert.equal((await h.create(body)).status, 201);
      assert.equal(h.writes[0][1].status, 'DRAFT', JSON.stringify(body));
    }
  }
});

test('web: students cannot create courses', async () => {
  const h = harness({ role: 'STUDENT', userId: 's1' });
  assert.equal((await h.create({ ...BASE })).status, 403);
  assert.equal(h.writes.length, 0);
});

test('admin course update: only known statuses, explicit prices to publish, invalid prices refused', async () => {
  const instructor = harness();
  assert.equal((await instructor.admin({ status: 'PUBLISHED', price: 1, priceSYP: 1 })).status, 403);
  assert.equal(instructor.writes.length, 0);

  for (const role of ['ADMIN', 'OWNER']) {
    for (const body of [{ status: 'LIVE' }, { status: 'published' }, { status: 1 },
      { status: 'PUBLISHED' }, { status: 'PUBLISHED', price: '', priceSYP: '' }, { status: 'PUBLISHED', price: 5 },
      { price: 'abc' }, { priceSYP: -1 }]) {
      const h = harness({ role, userId: 'staff-1' });
      assert.equal((await h.admin(body)).status, 400, `${role} ${JSON.stringify(body)}`);
      assert.equal(h.writes.length, 0);
    }
    const ok = harness({ role, userId: 'staff-1' });
    assert.equal((await ok.admin({ status: 'PUBLISHED', price: '35', priceSYP: '420000', title: 'T' })).status, 200);
    assert.deepEqual(ok.writes[0][1], { status: 'PUBLISHED', title: 'T', price: 35, priceSYP: 420000 });
    // Already published: other edits do not need the prices again.
    const later = harness({ role, userId: 'staff-1', existing: { status: 'PUBLISHED' } });
    assert.equal((await later.admin({ status: 'PUBLISHED', isFeatured: true })).status, 200);
    assert.deepEqual(later.writes[0][1], { status: 'PUBLISHED', isFeatured: true });
    // Rejecting needs no price.
    const reject = harness({ role, userId: 'staff-1' });
    assert.equal((await reject.admin({ status: 'REJECTED' })).status, 200);
  }
  assert.equal((await harness({ role: 'ADMIN' }).admin({ status: 'REJECTED' }, 'missing')).status, 404);
});

test('every course creation in the code states its status (the schema default is still PUBLISHED)', () => {
  const root = path.join(__dirname, '..', 'src');
  const files = [];
  const walk = dir => { for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full); else if (/\.(ts|tsx)$/.test(entry.name)) files.push(full);
  } };
  walk(root);
  let found = 0;
  for (const file of files) {
    const text = fs.readFileSync(file, 'utf8');
    for (const match of text.matchAll(/\.course\.create(?:Many)?\(/g)) {
      found++;
      const call = text.slice(match.index, match.index + 1500);
      const end = call.indexOf('\n    });');
      assert.match(end > 0 ? call.slice(0, end) : call, /\bstatus:/, `${path.relative(root, file)} creates a course without an explicit status`);
    }
  }
  assert.ok(found >= 2, 'web and mobile creation paths were found');
});
