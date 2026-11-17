/* eslint-disable @typescript-eslint/no-require-imports -- Node test runner. */
/**
 * Course taxonomy against a real, disposable PostgreSQL database that already has
 * prisma/manual-migrations/20261116_phase2_course_taxonomy.sql applied.
 * Requires KQ_SECURITY_TEST_DATABASE_URL (loopback, kq_security_test_* only).
 */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const test = require('node:test');
const { randomUUID } = require('node:crypto');
const { loadTs } = require('./load-ts.cjs');
const { testDatabaseUrl, createTestPrisma } = require('./helpers/security-postgres.cjs');
const generator = require('../scripts/generate-taxonomy-sql.cjs');

const skip = !testDatabaseUrl() && 'No explicit isolated PostgreSQL test database configured';
const normalize = loadTs('../src/lib/search-normalize.ts');

function load(prisma) {
  const mocks = { '@/lib/db': { prisma }, 'next/cache': { unstable_cache: fn => fn, revalidateTag: () => {} } };
  mocks['@/lib/catalogue-visibility'] = loadTs('../src/lib/catalogue-visibility.ts', mocks);
  mocks['@/lib/course-taxonomy'] = loadTs('../src/lib/course-taxonomy.ts', mocks);
  return {
    search: loadTs('../src/lib/course-search.ts', mocks),
    taxonomy: mocks['@/lib/course-taxonomy'],
    admin: loadTs('../src/lib/category-admin.ts', mocks),
  };
}

async function fixture(prisma) {
  const p = `tax_${randomUUID().slice(0, 8)}`;
  // Slugs accept lower-case letters, digits and hyphens only.
  const slug = p.replace(/_/g, '-');
  const teacher = `${p}_teacher`;
  await prisma.user.create({ data: { id: teacher, name: 'Synthetic teacher', email: `${teacher}@example.invalid`, password: 'x', role: 'INSTRUCTOR' } });
  const cleanup = async () => {
    await prisma.course.deleteMany({ where: { instructorId: teacher } });
    await prisma.category.deleteMany({ where: { slug: { startsWith: slug } } });
    await prisma.category.deleteMany({ where: { name: { startsWith: p } } });
    await prisma.user.deleteMany({ where: { id: teacher } });
  };
  return { p, slug, teacher, cleanup };
}

test('PostgreSQL: the SQL normaliser used by the backfill matches the application normaliser', { skip, timeout: 60000 }, async t => {
  const prisma = createTestPrisma();
  t.after(() => prisma.$disconnect());
  const samples = ['  التَّصميم ', 'ذكاء أصطناعي', 'الذكاء الإصطناعي', 'إعلانات  ممولة', 'المحتوى', 'البرمجة', 'آمنة', 'كورسات ٣٦٠',
    'كورس ۱۲۳', 'UI/UX Design', 'Front-End', 'البكالوريا - علمي', 'تطويـــر الذات', 'مُونتَاج', 'C# & .NET', 'الحادي عشر'];
  for (const sample of samples) {
    const [row] = await prisma.$queryRawUnsafe(`SELECT ${generator.NORM('$1::text')} AS key`, sample);
    assert.equal(row.key, normalize.normalizeText(sample), JSON.stringify(sample));
  }
});

test('PostgreSQL: the backfill links only exact, unambiguous texts, once, without touching text or dates', { skip, timeout: 60000 }, async t => {
  const prisma = createTestPrisma();
  const { p, teacher, cleanup } = await fixture(prisma);
  t.after(async () => { try { await cleanup(); } finally { await prisma.$disconnect(); } });
  const updatedAt = new Date('2025-05-05T05:05:05Z');
  const rows = [
    ['a', 'البرمجة', null], ['b', 'ذكاء أصطناعي', null], ['c', '  التَّصميم ', null], ['d', 'الصف التاسع', null],
    ['e', 'الخط العربي', null], ['f', 'التسويق', 'cat_ai'],   // unknown text stays unlinked; a linked course is never relinked
    ['g', 'الفنون والموسيقى', null],
  ];
  for (const [suffix, category, categoryId] of rows) {
    await prisma.$executeRaw`INSERT INTO "Course" ("id","title","category","categoryId","type","status","instructorId","updatedAt")
      VALUES (${`${p}_${suffix}`}, ${'T'}, ${category}, ${categoryId}, 'SKILL', 'PUBLISHED', ${teacher}, ${updatedAt})`;
  }
  const up = fs.readFileSync(generator.OUT.up, 'utf8');
  const backfill = up.slice(up.indexOf('WITH taxonomy_keys'), up.indexOf(';', up.indexOf('UPDATE "Course" AS course')) + 1);
  assert.match(backfill, /^WITH taxonomy_keys[\s\S]+UPDATE "Course" AS course[\s\S]+;$/);

  const state = async () => (await prisma.course.findMany({ where: { instructorId: teacher }, orderBy: { id: 'asc' },
    select: { id: true, category: true, categoryId: true, updatedAt: true } }));
  await prisma.$executeRawUnsafe(backfill);
  const first = await state();
  assert.deepEqual(first.map(c => c.categoryId), ['cat_programming-web', 'cat_ai', 'cat_graphic-design', 'cat_grade-9', null, 'cat_ai', 'cat_arts-music']);
  assert.deepEqual(first.map(c => c.category), rows.map(([, category]) => category));
  assert.ok(first.every(c => c.updatedAt.getTime() === updatedAt.getTime()));
  await prisma.$executeRawUnsafe(backfill);   // idempotent
  assert.deepEqual(await state(), first);
});

test('PostgreSQL: concurrent creation of the same category (spelling variants) keeps exactly one', { skip, timeout: 60000 }, async t => {
  const prisma = createTestPrisma();
  const { admin } = load(prisma);
  const { p, slug, cleanup } = await fixture(prisma);
  t.after(async () => { try { await cleanup(); } finally { await prisma.$disconnect(); } });
  const variants = [`${p} الإعلانات`, `${p} الاعلانات`, `${p}  الإعلانـات`, `${p} الإِعلانات`, `${p} الإعلانات `];
  const results = await Promise.allSettled(variants.map((name, i) => admin.createCategory(prisma, { name, slug: `${slug}-v${i}` })));
  assert.equal(results.filter(r => r.status === 'fulfilled').length, 1);
  assert.ok(results.filter(r => r.status === 'rejected').every(r => r.reason.status === 409));
  assert.equal(await prisma.category.count({ where: { normalizedName: normalize.normalizeText(variants[0]) } }), 1);
});

test('PostgreSQL: a category in use cannot be deleted, by the API rule or by the database', { skip, timeout: 60000 }, async t => {
  const prisma = createTestPrisma();
  const { admin } = load(prisma);
  const { p, slug, teacher, cleanup } = await fixture(prisma);
  t.after(async () => { try { await cleanup(); } finally { await prisma.$disconnect(); } });
  const category = await admin.createCategory(prisma, { name: `${p} تصنيف`, slug: `${slug}-in-use` });
  await prisma.course.create({ data: { id: `${p}_c`, title: 'T', category: category.name, categoryId: category.id, instructorId: teacher } });
  await assert.rejects(admin.deleteCategory(prisma, category.id), error => error.status === 409);
  // The database itself refuses (ON DELETE RESTRICT), whatever the application checks.
  await assert.rejects(prisma.category.delete({ where: { id: category.id } }), /Course_categoryId_fkey/);
  // A course linked between the check and the delete (stale count): still a clear 409, not a 500.
  const stale = new Proxy(prisma, { get: (target, key) => key === 'category'
    ? { ...target.category, findUnique: async args => ({ ...(await target.category.findUnique(args)), _count: { children: 0, courses: 0 } }),
        delete: args => target.category.delete(args) }
    : target[key] });
  await assert.rejects(admin.deleteCategory(stale, category.id), error => error.status === 409);
  assert.equal(await prisma.category.count({ where: { id: category.id } }), 1);
});

test('PostgreSQL: suggestions come from real published rows; drafts and empty categories never appear', { skip, timeout: 60000 }, async t => {
  const prisma = createTestPrisma();
  const { search, taxonomy } = load(prisma);
  const { p, slug, teacher, cleanup } = await fixture(prisma);
  t.after(async () => { try { await cleanup(); } finally { await prisma.$disconnect(); } });
  const marker = `زقزق${p.slice(4, 8)}`;   // unique word, so other rows in the database do not interfere
  await prisma.course.createMany({ data: [
    { id: `${p}_pub`, title: `${marker} التسويق بالمحتوى`, category: 'الإعلانات الممولة', categoryId: 'cat_paid-ads', instructorId: teacher, status: 'PUBLISHED' },
    { id: `${p}_draft`, title: `${marker} مسودة`, category: 'الإعلانات الممولة', categoryId: 'cat_paid-ads', instructorId: teacher, status: 'PENDING' },
  ] });
  await prisma.category.create({ data: { name: `${marker} فارغ`, normalizedName: normalize.normalizeText(`${marker} فارغ`), slug: `${slug}-empty` } });
  search.invalidateCatalogueSearch();

  const items = await search.suggestCourses(marker);
  assert.deepEqual(items.filter(i => i.type === 'course').map(i => i.id), [`${p}_pub`]);
  assert.ok(!items.some(i => i.type === 'category' && i.label.startsWith(marker)), 'empty category suggested');
  const course = items.find(i => i.id === `${p}_pub`);
  assert.equal(course.category, 'الإعلانات الممولة');

  // Its main category is found through the subcategory, with a real count.
  const marketing = (await search.suggestCourses('تسويق')).find(i => i.type === 'category' && i.slug === 'digital-marketing');
  assert.ok(marketing && marketing.count >= 1);
  const filtered = await search.searchCourses({ category: 'digital-marketing', q: marker });
  assert.deepEqual(filtered.courses.map(c => c.id), [`${p}_pub`]);

  // The form list holds active categories only, mains and subcategories, from the database.
  const options = await taxonomy.activeCategories(prisma);
  assert.ok(options.some(c => c.slug === 'paid-ads' && c.parentId === 'cat_digital-marketing'));
  assert.equal(options.filter(c => !c.parentId && !c.slug.startsWith('tax_')).length >= 24, true);
});

test('PostgreSQL: course classification uses the real tree (curriculum rule through the parent)', { skip, timeout: 60000 }, async t => {
  const prisma = createTestPrisma();
  const { taxonomy } = load(prisma);
  t.after(() => prisma.$disconnect());
  const resolve = (body, courseType) => taxonomy.resolveCourseTaxonomy(prisma, body, { courseType, requireCategory: true });
  assert.equal((await resolve({ categoryId: 'cat_bac-scientific' }, 'CURRICULUM')).category, 'البكالوريا - علمي');
  await assert.rejects(resolve({ categoryId: 'cat_bac-scientific' }, 'SKILL'), error => error.status === 400);
  assert.equal((await resolve({ category: 'التسويق' }, 'SKILL')).categoryId, 'cat_digital-marketing');   // legacy client text
});
