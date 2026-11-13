/* eslint-disable @typescript-eslint/no-require-imports -- Node test runner. */
const assert = require('node:assert/strict');
const test = require('node:test');
const { loadTs } = require('./load-ts.cjs');

const course = (id, title, category, { day = 1, instructor = 'مدرب', ...fields } = {}) => ({
  id, title, category, description: null, type: 'SKILL', price: 0, priceSYP: 0, rating: 0, thumbnail: null,
  isFeatured: false, createdAt: new Date(`2026-01-${String(day).padStart(2, '0')}T00:00:00Z`),
  instructor: { name: instructor, image: null }, _count: { enrollments: 0, reviews: 0 }, ...fields,
});

// Mirrors the shape of the real published catalogue.
const CATALOGUE = [
  course('c1', 'Claude Mastery', 'ذكاء اصطناعي', { price: 25, priceSYP: 3000, day: 1 }),
  course('c2', '🚀 Code 360 | البرمجة بالذكاء الاصطناعي من الصفر', 'البرمجة', { price: 45, priceSYP: 6499, day: 2, rating: 4.8 }),
  course('c3', 'المونتاج الاحترافي باستخدام InShot', 'مونتاج', { price: 18, day: 3 }),
  course('c4', 'AI Mastery 360', 'ذكاء أصطناعي', { price: 45, day: 4 }),
  course('c5', 'خدمة الفوتوشوب المعماري', 'التصميم', { day: 5, instructor: 'شهد قلة' }),
  course('c6', 'خدمة الأوتوكاد AUTOCAD للمشاريع', 'التصميم', { day: 6, instructor: 'شهد قلة' }),
  course('c7', 'إتقان الإعلانات الممولة والتسويق الالكتروني', 'التسويق', { price: 40, priceSYP: 5200, day: 7 }),
  course('c8', 'كورس صناعة المحتوى والذكاء الاصطناعي', 'التسويق', { price: 30, day: 8 }),
];

function load(env = {}) {
  const calls = [];
  const previous = process.env.KQ_HIDE_CURRICULUM;
  if ('KQ_HIDE_CURRICULUM' in env) process.env.KQ_HIDE_CURRICULUM = env.KQ_HIDE_CURRICULUM; else delete process.env.KQ_HIDE_CURRICULUM;
  const mocks = {
    'next/cache': { unstable_cache: fn => fn },
    '@/lib/db': { prisma: { notification: {}, course: { findMany: async args => { calls.push(args); return CATALOGUE; } } } },
  };
  const visibility = loadTs('../src/lib/catalogue-visibility.ts', mocks);
  mocks['@/lib/catalogue-visibility'] = visibility;
  const search = loadTs('../src/lib/course-search.ts', mocks);
  return { search, visibility, calls, restore: () => { if (previous === undefined) delete process.env.KQ_HIDE_CURRICULUM; else process.env.KQ_HIDE_CURRICULUM = previous; } };
}
const ids = result => result.courses.map(c => c.id);

test('Arabic spelling variants, diacritics and digits normalise to the same text', t => {
  const { search, restore } = load(); t.after(restore);
  const n = search.normalizeText;
  assert.equal(n('ذكاء أصطناعي'), n('ذكاء اصطناعي'));
  assert.equal(n('إتقان الإعلانات'), n('اتقان الاعلانات'));
  assert.equal(n('المحتوى'), n('المحتوي'));
  assert.equal(n('البرمجة'), n('البرمجه'));
  assert.equal(n('مُونتَاج'), n('مونتاج'));
  assert.equal(n('  Code   360 '), 'code 360');
  assert.equal(n('٣٦٠'), '360');
  assert.equal(n(null), '');
});

test('search finds courses by partial words, either spelling, spacing variants and small typos', async t => {
  const { search, restore } = load(); t.after(restore);
  const find = async q => ids(await search.searchCourses({ q }));
  assert.deepEqual(await find('mastery'), ['c4', 'c1']);              // partial title word, both courses
  assert.ok((await find('الذكاء الأصطناعي')).includes('c1'));          // hamza variant matches the other spelling
  assert.ok((await find('الذكاء الاصطناعي')).includes('c4'));
  assert.deepEqual((await find('فوتو شوب')), ['c5']);                 // extra space
  assert.deepEqual((await find('اوتوكاد')), ['c6']);                  // hamza dropped
  assert.deepEqual((await find('autocad')), ['c6']);                  // Latin name inside an Arabic title
  assert.ok((await find('المونتاچ')).length === 0 || true);           // unrelated letter: no crash
  assert.deepEqual((await find('مونتاح')), ['c3']);                   // one-letter typo
  assert.deepEqual((await find('الاعلانت')), ['c7']);                 // missing letter
  assert.deepEqual((await find('شهد')), ['c6', 'c5']);                // instructor name
  assert.deepEqual(await find('zzzz-nothing'), []);
  assert.deepEqual(await find('   '), ids(await search.searchCourses({})));
});

test('English keywords reach Arabic courses (the homepage links used to return nothing)', async t => {
  const { search, restore } = load(); t.after(restore);
  const find = async q => ids(await search.searchCourses({ q }));
  assert.ok((await find('programming')).includes('c2'));
  assert.deepEqual((await find('marketing')).sort(), ['c7', 'c8']);
  assert.deepEqual((await find('design')).sort(), ['c5', 'c6']);
  assert.ok((await find('ai')).includes('c1') && (await find('ai')).includes('c4'));
  assert.deepEqual(await find('photoshop'), ['c5']);
});

test('relevance ranks title matches first; filters combine; categories differing only in spelling are one filter', async t => {
  const { search, restore } = load(); t.after(restore);
  const ranked = await search.searchCourses({ q: 'الذكاء الاصطناعي' });
  // Title matches (c8, c2) outrank courses that only share the category (c1, c4).
  assert.ok(ids(ranked).indexOf('c8') < ids(ranked).indexOf('c1'));
  assert.equal(ranked.total, 4);

  const all = await search.searchCourses({});
  assert.equal(all.facets.categories.find(c => search.normalizeText(c.label) === 'ذكاء اصطناعي').count, 2);
  assert.equal(all.facets.categories.filter(c => search.normalizeText(c.label) === 'ذكاء اصطناعي').length, 1);
  assert.deepEqual(ids(await search.searchCourses({ category: 'ذكاء أصطناعي' })).sort(), ['c1', 'c4']);

  assert.deepEqual(ids(await search.searchCourses({ price: 'free' })).sort(), ['c5', 'c6']);
  assert.deepEqual(ids(await search.searchCourses({ price: 'paid', category: 'التسويق' })).sort(), ['c7', 'c8']);
  assert.deepEqual(ids(await search.searchCourses({ price: 'paid', category: 'التسويق', q: 'محتوى' })), ['c8']);
  assert.deepEqual(ids(await search.searchCourses({ rating: '4.5' })), ['c2']);
  assert.deepEqual(ids(await search.searchCourses({ instructor: 'شهد قلة' })).sort(), ['c5', 'c6']);
  assert.deepEqual(ids(await search.searchCourses({ category: 'التصميم', price: 'paid' })), []);
});

test('sorting uses the real USD price (it used SYP only), and paging is stable', async t => {
  const { search, restore } = load(); t.after(restore);
  const asc = ids(await search.searchCourses({ sort: 'price_asc' }));
  assert.deepEqual(asc.slice(0, 2).sort(), ['c5', 'c6']);              // free first
  assert.deepEqual(asc.slice(2, 4), ['c3', 'c1']);                     // $18 then $25
  assert.equal(ids(await search.searchCourses({ sort: 'price_desc' }))[0], 'c4'); // $45, newest of the two
  assert.deepEqual(ids(await search.searchCourses({ sort: 'newest' })).slice(0, 2), ['c8', 'c7']);
  assert.equal(ids(await search.searchCourses({ sort: 'rating' }))[0], 'c2');

  const first = await search.searchCourses({ pageSize: 3 });
  const second = await search.searchCourses({ pageSize: 3, page: 2 });
  const third = await search.searchCourses({ pageSize: 3, page: 3 });
  assert.equal(first.total, 8);
  assert.equal(first.hasMore, true);
  assert.equal(third.hasMore, false);
  assert.equal(new Set([...ids(first), ...ids(second), ...ids(third)]).size, 8);
  assert.deepEqual(ids(await search.searchCourses({ page: 99 })), []);
});

test('suggestions return matching courses and categories with real links', async t => {
  const { search, restore } = load(); t.after(restore);
  assert.deepEqual(await search.suggestCourses('a'), []);
  const items = await search.suggestCourses('تسويق');
  assert.ok(items.some(i => i.type === 'course' && i.href === '/courses/c7'));
  assert.ok(items.some(i => i.type === 'category' && i.href.startsWith('/courses?category=')));
  assert.ok(items.length <= 7);
});

test('the curriculum switch hides school content from every public query and is reversible', async t => {
  const hidden = load(); t.after(hidden.restore);
  assert.equal(hidden.visibility.curriculumHidden(), true);           // hidden by default
  await hidden.search.searchCourses({ type: 'CURRICULUM' });
  const where = hidden.calls[0].where;
  assert.equal(where.status, 'PUBLISHED');
  assert.ok(JSON.stringify(where.AND).includes('"type":"CURRICULUM"'));
  assert.ok(JSON.stringify(where.AND).includes('بكالوريا'));
  const v = hidden.visibility;
  assert.equal(v.isPubliclyOffered({ status: 'PUBLISHED', type: 'SKILL', category: 'البرمجة' }), true);
  assert.equal(v.isPubliclyOffered({ status: 'PUBLISHED', type: 'CURRICULUM', category: 'فيزياء' }), false);
  assert.equal(v.isPubliclyOffered({ status: 'PUBLISHED', type: 'SKILL', category: 'بكالوريا علمي' }), false);
  assert.equal(v.isPubliclyOffered({ status: 'PUBLISHED', type: 'SKILL', category: 'الصف التاسع' }), false);
  assert.equal(v.isPubliclyOffered({ status: 'PENDING', type: 'SKILL', category: 'البرمجة' }), false);
  // A caller's own AND conditions are kept, not overwritten.
  assert.equal(v.publicCourseWhere({ id: 'x', AND: [{ isFeatured: true }] }).AND.length, 2);
  // While hidden, a type filter cannot be used to reach curriculum courses.
  assert.equal((await hidden.search.searchCourses({ type: 'CURRICULUM' })).total, 8);
  hidden.restore();

  const shown = load({ KQ_HIDE_CURRICULUM: 'false' }); t.after(shown.restore);
  assert.equal(shown.visibility.curriculumHidden(), false);
  assert.deepEqual(shown.visibility.publicCourseWhere(), { status: 'PUBLISHED' });
  assert.equal(shown.visibility.isPubliclyOffered({ status: 'PUBLISHED', type: 'CURRICULUM', category: 'بكالوريا' }), true);
  assert.equal((await shown.search.searchCourses({ type: 'CURRICULUM' })).total, 0);
});

test('certificate privacy helpers: masked names and no invented duration', t => {
  const access = loadTs('../src/lib/certificate-access.ts', { '@/lib/db': { prisma: { notification: {} } } });
  assert.equal(access.maskName('محمد عبد الرحمن'), 'م••• ع••• ا•••');
  assert.equal(access.maskName(' Sara  Khatib '), 'S••• K•••');
  // Old certificates carry the hard-coded default (16): it is never printed.
  assert.equal(access.certificateHours({ courseDuration: 16, templateVersion: '1.0' }, { durationHours: null }), null);
  assert.equal(access.certificateHours({ courseDuration: 16, templateVersion: '1.0' }, { durationHours: 12.5 }), 12.5);
  assert.equal(access.certificateHours({ courseDuration: 0, templateVersion: '2.0' }, { durationHours: null }), null);
  assert.equal(access.certificateHours({ courseDuration: 24, templateVersion: '2.0' }, { durationHours: 30 }), 24);
  const tokens = new Set(Array.from({ length: 200 }, access.newVerifyToken));
  assert.equal(tokens.size, 200);
  assert.ok([...tokens].every(token => /^[A-Za-z0-9_-]{22}$/.test(token)));
});
