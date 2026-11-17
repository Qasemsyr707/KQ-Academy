/* eslint-disable @typescript-eslint/no-require-imports -- Node test runner. */
const assert = require('node:assert/strict');
const test = require('node:test');
const { Prisma } = require('@prisma/client');
const { loadTs } = require('./load-ts.cjs');

const normalize = loadTs('../src/lib/search-normalize.ts');
const n = normalize.normalizeText;

const CATEGORIES = [
  { id: 'cat_ai', slug: 'ai', name: 'الذكاء الاصطناعي', nameEn: 'Artificial Intelligence', aliases: ['AI', 'ذكاء اصطناعي'], parentId: null, order: 10, isActive: true },
  { id: 'cat_ai-tools', slug: 'ai-tools', name: 'أدوات الذكاء الاصطناعي', nameEn: 'AI Tools', aliases: ['ChatGPT'], parentId: 'cat_ai', order: 10, isActive: true },
  { id: 'cat_design', slug: 'graphic-design', name: 'التصميم الجرافيكي', nameEn: 'Graphic Design', aliases: ['التصميم', 'Design'], parentId: null, order: 20, isActive: true },
  { id: 'cat_old', slug: 'old', name: 'تصنيف موقوف', nameEn: null, aliases: [], parentId: null, order: 30, isActive: false },
  { id: 'cat_old-sub', slug: 'old-sub', name: 'فرعي لتصنيف موقوف', nameEn: null, aliases: [], parentId: 'cat_old', order: 10, isActive: true },
  { id: 'cat_school-education', slug: 'school-education', name: 'التعليم المدرسي', nameEn: 'School Education', aliases: [], parentId: null, order: 40, isActive: true },
  { id: 'cat_grade-9', slug: 'grade-9', name: 'الصف التاسع', nameEn: 'Grade 9', aliases: ['التاسع'], parentId: 'cat_school-education', order: 10, isActive: true },
  // Two categories sharing an alias: that alias names neither.
  { id: 'cat_x', slug: 'x', name: 'تصنيف س', nameEn: null, aliases: ['مشترك'], parentId: null, order: 50, isActive: true },
  { id: 'cat_y', slug: 'y', name: 'تصنيف ص', nameEn: null, aliases: ['مشترك'], parentId: null, order: 60, isActive: true },
].map(c => ({ ...c, normalizedName: n(c.name) }));

const COURSES = [
  { id: 'course-1', title: 'ChatGPT', instructorId: 'teacher-1', type: 'SKILL', status: 'PUBLISHED', category: 'أدوات الذكاء الاصطناعي', categoryId: 'cat_ai-tools', tags: [], trainingType: null },
  { id: 'course-2', title: 'Old', instructorId: 'teacher-1', type: 'SKILL', status: 'PENDING', category: 'تصنيف موقوف', categoryId: 'cat_old', tags: [], trainingType: null },
  { id: 'course-3', title: 'Grade 9 math', instructorId: 'teacher-2', type: 'CURRICULUM', status: 'PUBLISHED', category: 'الصف التاسع', categoryId: 'cat_grade-9', tags: [], trainingType: null },
];

const duplicate = () => new Prisma.PrismaClientKnownRequestError('Unique constraint failed', { code: 'P2002', clientVersion: '5.22.0' });

/** In-memory stand-in for the Prisma calls these modules make. */
function fakeDb() {
  const state = { categories: structuredClone(CATEGORIES), courses: structuredClone(COURSES) };
  const writes = [];
  const full = c => c && {
    ...c,
    parent: c.parentId ? state.categories.find(p => p.id === c.parentId) ?? null : null,
    _count: { children: state.categories.filter(x => x.parentId === c.id).length, courses: state.courses.filter(x => x.categoryId === c.id).length },
  };
  const unique = (data, exceptId) => state.categories.some(c => c.id !== exceptId
    && ((data.slug && c.slug === data.slug) || (data.normalizedName && c.normalizedName === data.normalizedName)));
  const db = {
    state, writes,
    category: {
      findUnique: async ({ where }) => full(state.categories.find(c => (where.id && c.id === where.id) || (where.normalizedName && c.normalizedName === where.normalizedName))),
      findMany: async ({ where } = {}) => state.categories.filter(c => !where || where.isActive === undefined || c.isActive === where.isActive).map(full),
      findFirst: async ({ where }) => full(state.categories.find(c => c.id !== where.NOT?.id
        && where.OR.some(cond => (cond.normalizedName && c.normalizedName === cond.normalizedName) || (cond.slug && c.slug === cond.slug)))),
      create: async ({ data }) => {
        if (unique(data)) throw duplicate();
        const row = { id: `new-${state.categories.length}`, ...data };
        state.categories.push(row); writes.push(['category.create', data]);
        return row;
      },
      update: async ({ where, data }) => {
        if (unique(data, where.id)) throw duplicate();
        const row = state.categories.find(c => c.id === where.id);
        Object.assign(row, data); writes.push(['category.update', data]);
        return row;
      },
      delete: async ({ where }) => {
        state.categories = state.categories.filter(c => c.id !== where.id); writes.push(['category.delete', where.id]);
      },
    },
    course: {
      findUnique: async ({ where }) => {
        const c = state.courses.find(x => x.id === where.id);
        if (!c) return null;
        const node = state.categories.find(x => x.id === c.categoryId);
        return { ...c, taxonomy: node ? { slug: node.slug, parent: full(node).parent ? { slug: full(node).parent.slug } : null } : null };
      },
      create: async ({ data }) => { const row = { id: `course-${state.courses.length + 1}`, ...data }; state.courses.push(row); writes.push(['course.create', data]); return row; },
      update: async ({ where, data }) => { const row = state.courses.find(x => x.id === where.id); Object.assign(row, data); writes.push(['course.update', data]); return row; },
      updateMany: async ({ where, data }) => {
        const rows = state.courses.filter(x => x.categoryId === where.categoryId);
        rows.forEach(row => Object.assign(row, data)); writes.push(['course.updateMany', where, data]);
        return { count: rows.length };
      },
      groupBy: async ({ where }) => {
        const counts = new Map();
        for (const c of state.courses) {
          if (!c.categoryId || (where.status && c.status !== where.status)) continue;
          counts.set(c.categoryId, (counts.get(c.categoryId) ?? 0) + 1);
        }
        return [...counts].map(([categoryId, count]) => ({ categoryId, _count: { _all: count } }));
      },
    },
    $transaction: async callback => callback(db),
  };
  return db;
}

/** Routes with a database fake and a role fake that follows rbac's rule (the owner passes every check). */
function harness({ role = 'ADMIN', userId = 'admin-1' } = {}) {
  const db = fakeDb();
  let invalidations = 0;
  const mocks = {
    '@/lib/db': { prisma: db },
    '@/lib/rbac': {
      requireRoleApi: async allowed => (role === 'OWNER' || allowed.includes(role))
        ? { authorized: true, role, session: { user: { id: userId, role } } }
        : { authorized: false, errorResponse: Response.json({ error: 'غير مصرح' }, { status: 403 }) },
    },
    '@/lib/course-search': { invalidateCatalogueSearch: () => { invalidations++; } },
    '@/lib/bunny-upload-server': { assertBunnyVideoReady: async () => {}, BunnyServerError: class extends Error {} },
  };
  mocks['@/lib/course-taxonomy'] = loadTs('../src/lib/course-taxonomy.ts', mocks);
  mocks['@/lib/category-admin'] = loadTs('../src/lib/category-admin.ts', mocks);
  return {
    db, mocks, get invalidations() { return invalidations; },
    taxonomy: mocks['@/lib/course-taxonomy'],
    courses: loadTs('../src/app/api/courses/route.ts', mocks),
    course: loadTs('../src/app/api/courses/[id]/route.ts', mocks),
    adminCourse: loadTs('../src/app/api/admin/courses/[id]/route.ts', mocks),
    categories: loadTs('../src/app/api/admin/categories/route.ts', mocks),
    category: loadTs('../src/app/api/admin/categories/[id]/route.ts', mocks),
  };
}

const json = (method, body) => new Request('https://academy.test/api', { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
const params = id => ({ params: Promise.resolve({ id }) });
const resolve = (h, body, courseType = 'SKILL', requireCategory = true) => h.taxonomy.resolveCourseTaxonomy(h.db, body, { courseType, requireCategory });
const rejects400 = (promise, pattern) => assert.rejects(promise, error => error.status === 400 && (!pattern || pattern.test(error.message)));

// ---------------------------------------------------------------------------
// Validation rules
// ---------------------------------------------------------------------------

test('a course category must be an existing, active category (and its main category active)', async () => {
  const h = harness();
  assert.deepEqual(await resolve(h, { categoryId: 'cat_ai-tools' }), { categoryId: 'cat_ai-tools', category: 'أدوات الذكاء الاصطناعي' });
  await rejects400(resolve(h, {}), /اختيار تصنيف/);
  await rejects400(resolve(h, { categoryId: 'nope' }));
  await rejects400(resolve(h, { categoryId: 'cat_old' }));          // deactivated
  await rejects400(resolve(h, { categoryId: 'cat_old-sub' }));      // active, but its main is not
  await rejects400(resolve(h, { categoryId: { $ne: null } }));
  await rejects400(resolve(h, { categoryId: 'x'.repeat(65) }));
});

test('older clients sending a category name get it only when it names exactly one category', async () => {
  const h = harness();
  assert.equal((await resolve(h, { category: 'الذكاء الإصطناعي' })).categoryId, 'cat_ai');   // hamza variant of the name
  assert.equal((await resolve(h, { category: 'AI' })).categoryId, 'cat_ai');                // alias
  assert.equal((await resolve(h, { category: 'design' })).categoryId, 'cat_design');
  await rejects400(resolve(h, { category: 'مشترك' }));                                      // alias of two categories
  await rejects400(resolve(h, { category: 'شيء غير موجود' }));
});

test('school-curriculum categories are only for CURRICULUM courses, and the reverse', async () => {
  const h = harness();
  await rejects400(resolve(h, { categoryId: 'cat_grade-9' }, 'SKILL'), /المنهاج/);
  await rejects400(resolve(h, { categoryId: 'cat_ai' }, 'CURRICULUM'), /التعليم المدرسي/);
  assert.equal((await resolve(h, { categoryId: 'cat_grade-9' }, 'CURRICULUM')).category, 'الصف التاسع');
});

test('tags and training type are validated and de-duplicated', async () => {
  const h = harness();
  const only = body => resolve(h, body, 'SKILL', false);
  assert.deepEqual(await only({ tags: ['  ChatGPT ', 'ذكاء أصطناعي', 'ذكاء اصطناعي', 'chatgpt'] }), { tags: ['ChatGPT', 'ذكاء أصطناعي'] });
  assert.deepEqual(await only({ tags: [] }), { tags: [] });
  await rejects400(only({ tags: 'ChatGPT' }));
  await rejects400(only({ tags: ['a'] }));
  await rejects400(only({ tags: ['x'.repeat(31)] }));
  await rejects400(only({ tags: Array.from({ length: 11 }, (_, i) => `tag${i}`) }));
  await rejects400(only({ tags: [{ toString: () => 'x' }] }));
  assert.deepEqual(await only({ trainingType: 'PRACTICAL' }), { trainingType: 'PRACTICAL' });
  assert.deepEqual(await only({ trainingType: '' }), { trainingType: null });
  await rejects400(only({ trainingType: 'HYBRID' }));
  assert.deepEqual(await only({ title: 'unrelated' }), {});                // nothing to change
});

// ---------------------------------------------------------------------------
// Course create / update
// ---------------------------------------------------------------------------

test('creating a course requires a valid category and stores its name, tags and training type', async () => {
  const h = harness({ role: 'INSTRUCTOR', userId: 'teacher-1' });
  const bad = await h.courses.POST(json('POST', { title: 'كورس', categoryId: 'cat_old' }));
  assert.equal(bad.status, 400);
  const legacyFree = await h.courses.POST(json('POST', { title: 'كورس', category: 'تصنيف من خيالي' }));
  assert.equal(legacyFree.status, 400);
  assert.equal(h.db.writes.length, 0);

  const ok = await h.courses.POST(json('POST', { title: 'كورس', categoryId: 'cat_ai-tools', tags: ['GPT'], trainingType: 'PRACTICAL', category: 'ignored' }));
  assert.equal(ok.status, 201);
  const [, data] = h.db.writes.find(([kind]) => kind === 'course.create');
  assert.deepEqual({ category: data.category, categoryId: data.categoryId, tags: data.tags, trainingType: data.trainingType, type: data.type },
    { category: 'أدوات الذكاء الاصطناعي', categoryId: 'cat_ai-tools', tags: ['GPT'], trainingType: 'PRACTICAL', type: 'SKILL' });
  // An instructor's new course is a DRAFT (course-review.ts): not public, so search is untouched.
  assert.equal(data.status, 'DRAFT');
  assert.equal(h.invalidations, 0);
});

test('updating a course validates classification fields and never stores them unchecked', async () => {
  const owner = harness({ role: 'INSTRUCTOR', userId: 'teacher-1' });
  assert.equal((await owner.course.PUT(json('PUT', { categoryId: 'nope' }), params('course-1'))).status, 400);
  assert.equal((await owner.course.PUT(json('PUT', { categoryId: 'cat_grade-9' }), params('course-1'))).status, 400);   // SKILL course
  assert.equal((await owner.course.PUT(json('PUT', { taxonomy: { connect: { id: 'cat_old' } } }), params('course-1'))).status, 400);
  assert.equal(owner.db.writes.length, 0);

  const ok = await owner.course.PUT(json('PUT', { categoryId: 'cat_design', tags: ['شعارات'], trainingType: 'MIXED' }), params('course-1'));
  assert.equal(ok.status, 200);
  const [, data] = owner.db.writes.find(([kind]) => kind === 'course.update');
  assert.deepEqual(data, { categoryId: 'cat_design', category: 'التصميم الجرافيكي', tags: ['شعارات'], trainingType: 'MIXED' });

  // Unrelated edits (e.g. "includes") do not touch the classification.
  const other = harness({ role: 'INSTRUCTOR', userId: 'teacher-1' });
  assert.equal((await other.course.PUT(json('PUT', { includes: ['x'] }), params('course-1'))).status, 200);
  assert.deepEqual(other.db.writes.find(([kind]) => kind === 'course.update')[1], { includes: ['x'] });
  // Any saved edit refreshes search (title, image or classification may have changed).
  assert.equal(other.invalidations, 1);

  // Another instructor's course stays out of reach.
  const stranger = harness({ role: 'INSTRUCTOR', userId: 'teacher-2' });
  assert.equal((await stranger.course.PUT(json('PUT', { categoryId: 'cat_design' }), params('course-1'))).status, 403);
  // Students cannot reach the endpoint.
  assert.equal((await harness({ role: 'STUDENT' }).course.PUT(json('PUT', { categoryId: 'cat_design' }), params('course-1'))).status, 403);
});

test('an administrator cannot change a course type away from its category', async () => {
  const h = harness();
  assert.equal((await h.adminCourse.PUT(json('PUT', { type: 'SKILL' }), params('course-3'))).status, 400);
  assert.equal((await h.adminCourse.PUT(json('PUT', { type: 'CURRICULUM' }), params('course-1'))).status, 400);
  assert.equal(h.db.writes.length, 0);
});

// ---------------------------------------------------------------------------
// Category management
// ---------------------------------------------------------------------------

test('only administrators and the owner manage categories', async () => {
  for (const role of ['STUDENT', 'INSTRUCTOR']) {
    const h = harness({ role });
    assert.equal((await h.categories.GET()).status, 403);
    assert.equal((await h.categories.POST(json('POST', { name: 'جديد' }))).status, 403);
    assert.equal((await h.category.PATCH(json('PATCH', { name: 'x' }), params('cat_ai'))).status, 403);
    assert.equal((await h.category.DELETE(json('DELETE', {}), params('cat_design'))).status, 403);
    assert.equal(h.db.writes.length, 0);
  }
  for (const role of ['ADMIN', 'OWNER']) {
    const h = harness({ role });
    const res = await h.categories.GET();
    assert.equal(res.status, 200);
    assert.equal(res.headers.get('cache-control'), 'private, no-store');
    const ai = (await res.json()).categories.find(c => c.id === 'cat_ai');
    assert.deepEqual({ courseCount: ai.courseCount, totalCourses: ai.totalCourses, publishedCourses: ai.publishedCourses }, { courseCount: 0, totalCourses: 1, publishedCourses: 1 });
  }
});

test('no duplicate categories through spelling, spacing or slug differences', async () => {
  const h = harness();
  const create = body => h.categories.POST(json('POST', body));
  assert.equal((await create({ name: 'الذكاء الإصطناعي' })).status, 409);          // hamza variant
  assert.equal((await create({ name: '  الذَّكاء   الاصطناعي ' })).status, 409);     // diacritics and spaces
  assert.equal((await create({ name: 'الروبوتات', slug: 'ai' })).status, 409);       // slug taken
  assert.equal((await create({ name: 'الروبوتات', nameEn: 'AI' })).status, 409);    // generated slug "ai" taken
  assert.equal((await create({ name: 'ر' })).status, 400);
  assert.equal((await create({ name: 'الروبوتات', slug: 'Not Valid' })).status, 400);
  assert.equal((await create({ name: 'الروبوتات', aliases: ['x'] })).status, 400);
  assert.equal(h.db.writes.length, 0);

  const ok = await create({ name: 'الروبوتات', nameEn: 'Robotics', aliases: ['Robots', 'robots', 'روبوت'] });
  assert.equal(ok.status, 201);
  const created = (await ok.json()).category;
  assert.deepEqual({ slug: created.slug, normalizedName: created.normalizedName, aliases: created.aliases, parentId: created.parentId },
    { slug: 'robotics', normalizedName: 'الروبوتات', aliases: ['Robots', 'روبوت'], parentId: null });
  assert.equal(h.invalidations, 1);
});

test('subcategories: two levels only, and a main category with subcategories cannot move', async () => {
  const h = harness();
  assert.equal((await h.categories.POST(json('POST', { name: 'برومبتات متقدمة', parentId: 'cat_ai-tools' }))).status, 400);   // sub of a sub
  assert.equal((await h.categories.POST(json('POST', { name: 'برومبتات متقدمة', parentId: 'missing' }))).status, 400);
  assert.equal((await h.categories.POST(json('POST', { name: 'برومبتات متقدمة', parentId: 'cat_ai' }))).status, 201);
  assert.equal((await h.category.PATCH(json('PATCH', { parentId: 'cat_design' }), params('cat_ai'))).status, 400);
  assert.equal((await h.category.PATCH(json('PATCH', { parentId: 'cat_ai' }), params('cat_ai'))).status, 400);
});

test('renaming keeps links and updates the text of linked courses; slugs never change', async () => {
  const h = harness();
  assert.equal((await h.category.PATCH(json('PATCH', { slug: 'new-slug' }), params('cat_ai-tools'))).status, 400);
  assert.equal((await h.category.PATCH(json('PATCH', { name: 'التصميم الجرافيكي' }), params('cat_ai-tools'))).status, 409);
  const res = await h.category.PATCH(json('PATCH', { name: 'أدوات AI' }), params('cat_ai-tools'));
  assert.equal(res.status, 200);
  const course = h.db.state.courses.find(c => c.id === 'course-1');
  assert.deepEqual({ categoryId: course.categoryId, category: course.category }, { categoryId: 'cat_ai-tools', category: 'أدوات AI' });
  assert.equal(h.db.state.categories.find(c => c.id === 'cat_ai-tools').slug, 'ai-tools');
});

test('a category with courses is never deleted, and cannot leave or enter the school curriculum', async () => {
  const h = harness();
  assert.equal((await h.category.DELETE(json('DELETE', {}), params('cat_ai-tools'))).status, 409);   // has a course
  assert.equal((await h.category.DELETE(json('DELETE', {}), params('cat_ai'))).status, 409);         // has a subcategory
  assert.equal((await h.category.PATCH(json('PATCH', { parentId: 'cat_ai' }), params('cat_grade-9'))).status, 400);
  assert.equal((await h.category.PATCH(json('PATCH', { parentId: 'cat_school-education' }), params('cat_ai-tools'))).status, 400);
  assert.equal(h.db.state.categories.length, CATEGORIES.length);
  // Deactivating is allowed: courses keep their link.
  assert.equal((await h.category.PATCH(json('PATCH', { isActive: false }), params('cat_ai-tools'))).status, 200);
  assert.equal(h.db.state.courses.find(c => c.id === 'course-1').categoryId, 'cat_ai-tools');
  assert.equal((await h.category.PATCH(json('PATCH', { isActive: 'no' }), params('cat_ai-tools'))).status, 400);
  // An empty category can be deleted.
  assert.equal((await h.category.DELETE(json('DELETE', {}), params('cat_design'))).status, 200);
  assert.equal((await h.category.DELETE(json('DELETE', {}), params('cat_design'))).status, 404);
});

test('creating a course accepts only a cover image the site can show', async () => {
  for (const thumbnail of ['javascript:alert(1)', 'http://insecure.example/a.jpg', '//evil.example/a.png', 'data:image/svg+xml;base64,PHN2Zz4=', 42]) {
    const h = harness({ role: 'INSTRUCTOR', userId: 'teacher-1' });
    assert.equal((await h.courses.POST(json('POST', { title: 'كورس', categoryId: 'cat_ai-tools', thumbnail }))).status, 400, String(thumbnail));
    assert.equal(h.db.writes.length, 0);
  }
  const h = harness({ role: 'INSTRUCTOR', userId: 'teacher-1' });
  assert.equal((await h.courses.POST(json('POST', { title: 'كورس', categoryId: 'cat_ai-tools', thumbnail: '/api/files/cover-1' }))).status, 201);
  assert.equal(h.db.writes.find(([kind]) => kind === 'course.create')[1].thumbnail, '/api/files/cover-1');
});
