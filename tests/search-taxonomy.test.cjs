/* eslint-disable @typescript-eslint/no-require-imports -- Node test runner. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const { loadTs } = require('./load-ts.cjs');
const generator = require('../scripts/generate-taxonomy-sql.cjs');

const normalize = loadTs('../src/lib/search-normalize.ts');
const DATA = JSON.parse(fs.readFileSync(path.join(__dirname, '../prisma/taxonomy/categories.json'), 'utf8'));

/** The real default taxonomy, as the migration inserts it, plus two administrator-made categories. */
const TAXONOMY = [
  ...generator.rows().map(row => ({ id: row.id, slug: row.slug, name: row.name, nameEn: row.nameEn ?? null,
    aliases: row.aliases, parentId: row.parentId, order: row.order, isActive: true })),
  // Empty: exists in the admin panel, has no course, must never be suggested.
  { id: 'cat_robotics', slug: 'robotics', name: 'الروبوتات', nameEn: 'Robotics', aliases: ['Robotics', 'روبوت'], parentId: null, order: 999, isActive: true },
  // Deactivated, though a public course still uses it.
  { id: 'cat_retired', slug: 'retired', name: 'تصنيف متوقف', nameEn: null, aliases: ['متوقف'], parentId: null, order: 998, isActive: false },
];

const DATA_URL = 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAP////////////////////////////////////////////////////////////////////////////////////8=';
const course = (id, title, { categoryId = null, category, status = 'PUBLISHED', day = 1, ...fields } = {}) => ({
  id, title, description: null, categoryId, category: category ?? TAXONOMY.find(c => c.id === categoryId)?.name ?? 'عام',
  tags: [], trainingType: null, type: 'SKILL', status, price: 0, priceSYP: 0, rating: 0, thumbnail: null, isFeatured: false,
  createdAt: new Date(`2026-02-${String(day).padStart(2, '0')}T00:00:00Z`), instructor: { name: 'مدرب', image: null },
  _count: { enrollments: 0, reviews: 0 }, ...fields,
});

const COURSES = [
  course('k1', 'التسويق الرقمي من الصفر إلى الاحتراف', { categoryId: 'cat_digital-marketing', price: 30, day: 1 }),
  course('k2', 'إعلانات فيسبوك وانستغرام الممولة', { categoryId: 'cat_paid-ads', tags: ['Meta Ads'], price: 25, priceSYP: 300000, day: 2 }),
  course('k3', 'Python للمبتدئين', { categoryId: 'cat_programming-fundamentals', day: 3 }),
  course('k4', 'تطوير مواقع الويب باستخدام React', { categoryId: 'cat_web-frontend', day: 4, thumbnail: 'https://cdn.example.com/react.jpg' }),
  course('k5', 'ChatGPT للأعمال', { categoryId: 'cat_ai-tools', tags: ['ذكاء اصطناعي', 'prompt'], day: 5 }),
  // Not linked yet: its text names the AI category through an alias.
  course('k6', 'Claude Mastery', { category: 'ذكاء أصطناعي', day: 6, thumbnail: 'linear-gradient(135deg, #123 0%, #0f172a 100%)' }),
  course('k7', 'تصميم الشعارات الاحترافي', { categoryId: 'cat_branding-logo', day: 7, thumbnail: DATA_URL }),
  // Unpublished: must never appear anywhere.
  course('k8', 'مسودة كورس برمجة', { categoryId: 'cat_programming-fundamentals', status: 'PENDING', day: 8 }),
  // A legacy text with no matching category.
  course('k9', 'أساسيات الخط العربي', { category: 'الخط العربي', day: 9 }),
  // The old create form's "الفنون والموسيقى", not linked yet: it names the new subcategory.
  course('k14', 'أساسيات العزف على العود', { category: 'الفنون والموسيقى', day: 14 }),
  // School curriculum: hidden while the curriculum switch is on.
  course('k10', 'رياضيات البكالوريا العلمي', { categoryId: 'cat_bac-scientific', type: 'CURRICULUM', day: 10 }),
  course('k11', 'كورس في تصنيف متوقف', { categoryId: 'cat_retired', day: 11 }),
  // Contains "بر" inside a word ("خبرة"), never at a word start.
  course('k12', 'خبرة عملية في المبيعات', { categoryId: 'cat_sales-skills', day: 12 }),
  // Reaches "بر" only through an alias of its category ("بريمير" = Premiere).
  course('k13', 'المونتاج بالهاتف', { categoryId: 'cat_video-editing', day: 13 }),
];

/** Emulates the two filters the loader sends: published only, and the curriculum switch. */
function visible(where) {
  const hidden = JSON.stringify(where).includes('CURRICULUM');
  return COURSES.filter(c => c.status === 'PUBLISHED'
    && !(hidden && (c.type === 'CURRICULUM' || ['بكالوريا', 'التاسع', 'منهاج'].some(word => c.category.includes(word)))));
}

function load({ courses, categories = TAXONOMY } = {}) {
  const counters = { course: 0, category: 0 };
  const mocks = {
    'next/cache': { unstable_cache: fn => fn, revalidateTag: () => {} },
    '@/lib/db': { prisma: { notification: {},
      course: { findMany: async args => { counters.course++; return courses ? courses : visible(args.where); } },
      category: { findMany: async () => { counters.category++; return categories; } } } },
  };
  mocks['@/lib/catalogue-visibility'] = loadTs('../src/lib/catalogue-visibility.ts', mocks);
  return { search: loadTs('../src/lib/course-search.ts', mocks), counters };
}

const courseIds = items => items.filter(i => i.type === 'course').map(i => i.id);
const categoryLabels = items => items.filter(i => i.type === 'category').map(i => i.label);
const words = text => normalize.searchWords(text);

// ---------------------------------------------------------------------------
// Default taxonomy data
// ---------------------------------------------------------------------------

test('the default taxonomy has the 24 requested main categories, valid slugs and no duplicate names', () => {
  const mains = DATA.categories.map(c => c.name);
  assert.equal(mains.length, 24);
  for (const required of ['الذكاء الاصطناعي', 'البرمجة وتطوير الويب', 'تطوير تطبيقات الموبايل', 'التسويق الرقمي والإعلانات',
    'التجارة الإلكترونية والمبيعات', 'التصميم الجرافيكي', 'صناعة المحتوى', 'التصوير والمونتاج', 'الأعمال وريادة المشاريع',
    'إدارة المشاريع', 'المحاسبة والمالية', 'تحليل البيانات', 'الأمن السيبراني والشبكات', 'المهارات المهنية والحرفية',
    'التدريب العملي والتطبيقي', 'الهندسة والبرامج الهندسية', 'اللغات والترجمة', 'التطوير الشخصي والمهارات الناعمة',
    'الصحة والتغذية واللياقة', 'التعليم المدرسي', 'التعليم الجامعي', 'العلوم والرياضيات', 'المهارات المكتبية والإنتاجية']) {
    assert.ok(mains.includes(required), required);
  }
  assert.ok(DATA.categories.some(c => c.nameEn === 'UI/UX Design'));

  const rows = generator.rows();
  assert.ok(rows.every(row => /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(row.slug) && row.slug.length <= 60));
  assert.equal(new Set(rows.map(row => row.slug)).size, rows.length, 'slugs are unique');
  assert.equal(new Set(rows.map(row => row.normalizedName)).size, rows.length, 'names are unique after normalisation');
  assert.ok(rows.every(row => row.parentId === null || rows.some(main => main.id === row.parentId && main.parentId === null)), 'two levels');
});

test('aliases are unambiguous: no alias names two categories, or another category', () => {
  const rows = generator.rows();
  const owner = new Map(rows.map(row => [row.normalizedName, row.id]));
  for (const row of rows) {
    for (const alias of row.aliases) {
      const key = normalize.normalizeText(alias);
      assert.ok(key.length >= 2, `alias too short: ${alias}`);
      assert.ok(!owner.has(key) || owner.get(key) === row.id, `alias "${alias}" of ${row.slug} is also ${owner.get(key)}`);
      owner.set(key, row.id);
    }
  }
  // Every option of the old create form maps to exactly one category.
  const legacy = ['البرمجة', 'التصميم', 'اللغات', 'العلوم', 'التسويق', 'الأعمال', 'الطب والصحة', 'الهندسة', 'تطوير الذات', 'الفنون والموسيقى',
    'الصف الأول', 'الصف التاسع', 'الحادي عشر', 'البكالوريا - علمي', 'البكالوريا - معلوماتية', 'التعليم الشرعي'];
  for (const text of legacy) assert.ok(owner.has(normalize.normalizeText(text)), text);
});

test('the generated migration and preflight SQL are up to date with categories.json', () => {
  for (const [file, text] of Object.entries(generator.generate())) {
    // Line endings depend on the checkout (core.autocrlf on Windows), not on the generator.
    assert.equal(fs.readFileSync(file, 'utf8').replace(/\r\n/g, '\n'), text, `${path.basename(file)} is stale: run node scripts/generate-taxonomy-sql.cjs`);
  }
  const up = fs.readFileSync(generator.OUT.up, 'utf8');
  assert.match(up, /ON CONFLICT DO NOTHING/);
  assert.match(up, /"categoryId" IS NULL/);                   // backfill never relinks a course
  assert.doesNotMatch(up, /UPDATE "Course"[^;]*"category" =/); // nor rewrites its text
  // No destructive statement (comments removed; "ON DELETE RESTRICT" is a foreign-key rule, not a statement).
  const statements = up.replace(/--.*$/gm, '').replace(/ON DELETE RESTRICT/g, '');
  assert.doesNotMatch(statements, /\b(DROP|DELETE|TRUNCATE)\b/i);
  const preflight = fs.readFileSync(generator.OUT.preflight, 'utf8');
  assert.match(preflight, /BEGIN TRANSACTION READ ONLY;/);
  assert.doesNotMatch(preflight, /\b(INSERT|UPDATE|DELETE|ALTER|CREATE|DROP)\b/);
});

// ---------------------------------------------------------------------------
// Normalisation
// ---------------------------------------------------------------------------

test('normalisation folds Arabic variants and strips the article for prefix search', () => {
  const n = normalize.normalizeText;
  assert.equal(n('التَّسْوِيـــق'), 'التسويق');
  assert.equal(n('إعلانات'), n('اعلانات'));
  assert.equal(n('٣٦٠'), '360');
  assert.equal(normalize.stripArticle('التسويق'), 'تسويق');
  assert.equal(normalize.stripArticle('والتسويق'), 'تسويق');
  assert.equal(normalize.stripArticle('للتسويق'), 'تسويق');
  assert.equal(normalize.stripArticle('الم'), 'الم');   // too short to strip
  assert.deepEqual(words('التسويق الرقمي').sort(), ['التسويق', 'الرقمي', 'تسويق', 'رقمي'].sort());
  assert.equal(normalize.slugify('UI/UX Design'), 'ui-ux-design');
  assert.equal(normalize.slugify('عربي فقط'), null);
});

// ---------------------------------------------------------------------------
// Live suggestions
// ---------------------------------------------------------------------------

test('one letter suggests real courses whose words start with it, never unpublished ones', async () => {
  const { search } = load();
  const items = await search.suggestCourses('ت');
  assert.ok(courseIds(items).length > 0);
  assert.ok(!courseIds(items).includes('k8'));
  for (const item of items.filter(i => i.type === 'course')) {
    const c = COURSES.find(x => x.id === item.id);
    const node = TAXONOMY.find(x => x.id === c.categoryId);
    const parent = node && TAXONOMY.find(x => x.id === node.parentId);
    const all = [c.title, c.category, ...c.tags, ...[node, parent].filter(Boolean).flatMap(x => [x.name, x.nameEn ?? '', ...x.aliases])];
    assert.ok(all.some(text => words(text).some(w => w.startsWith('ت'))), `${item.label} does not start a word with ت`);
  }
});

test('"تس" suggests the marketing category and its courses (prefix without the article)', async () => {
  const { search } = load();
  const items = await search.suggestCourses('تس');
  assert.equal(categoryLabels(items)[0], 'التسويق الرقمي والإعلانات');
  assert.ok(courseIds(items).includes('k1'));
  assert.ok(courseIds(items).includes('k2'));        // its subcategory belongs to marketing
  const marketing = items.find(i => i.label === 'التسويق الرقمي والإعلانات');
  assert.equal(marketing.href, '/courses?category=digital-marketing');
  assert.equal(marketing.count, 2);                  // k1 + k2 (subcategory included)
  assert.equal(marketing.parent, null);
});

test('"بر" finds programming by word start and never "خبرة" or unpublished drafts', async () => {
  const { search } = load();
  const items = await search.suggestCourses('بر');
  assert.ok(categoryLabels(items).includes('البرمجة وتطوير الويب'));
  assert.ok(courseIds(items).includes('k3') && courseIds(items).includes('k4'));
  assert.ok(!courseIds(items).includes('k12'));
  assert.ok(!courseIds(items).includes('k8'));
});

test('a match through an alias ranks below matches through titles and category names', async () => {
  const { search } = load();
  const ranked = courseIds(await search.suggestCourses('بر'));
  for (const strong of ['k3', 'k4']) {
    assert.ok(!ranked.includes('k13') || ranked.indexOf('k13') > ranked.indexOf(strong), `k13 before ${strong}: ${ranked}`);
  }
});

test('one or two letters: matching categories are ordered by how many courses they hold', async () => {
  const marketing = Array.from({ length: 5 }, (_, i) => course(`mk${i}`, `دورة رقم ${i}`, { categoryId: 'cat_paid-ads' }));
  const others = [course('t1', 'دورة تحليل', { categoryId: 'cat_power-bi' }), course('t2', 'دورة تطبيقات', { categoryId: 'cat_flutter' })];
  const { search } = load({ courses: [...marketing, ...others] });
  const categories = (await search.suggestCourses('ت')).filter(i => i.type === 'category');
  assert.equal(categories[0].label, 'التسويق الرقمي والإعلانات');
  assert.equal(categories[0].count, 5);
  const mains = categories.filter(c => !c.parent);
  assert.deepEqual(mains.map(c => c.count), [...mains.map(c => c.count)].sort((a, b) => b - a));
});

test('Arabic and English synonyms reach the same AI courses ("ذكاء", "AI", "الذكاء الاصطناعي")', async () => {
  const { search } = load();
  for (const q of ['ذكاء', 'AI', 'ai', 'الذكاء الاصطناعي', 'Artificial Intelligence']) {
    const items = await search.suggestCourses(q);
    assert.ok(courseIds(items).includes('k5'), `${q} -> k5`);
    assert.ok(courseIds(items).includes('k6'), `${q} -> k6 (unlinked, its text names AI)`);
    assert.ok(categoryLabels(items).includes('الذكاء الاصطناعي'), `${q} -> AI category`);
  }
  const ai = (await search.suggestCourses('AI')).find(i => i.label === 'الذكاء الاصطناعي');
  assert.equal(ai.count, 2);
});

test('small typos are tolerated on longer words only', async () => {
  const { search } = load();
  assert.ok(courseIds(await search.suggestCourses('بايتون')).includes('k3'));   // alias "بايثون", one edit
  assert.ok(courseIds(await search.suggestCourses('الشعرات')).includes('k7'));   // one letter missing
  assert.deepEqual(courseIds(await search.suggestCourses('سمك')), []);          // 3 letters: no typo match
});

test('direct title matches rank first; several words must all match', async () => {
  const { search } = load();
  const ranked = courseIds(await search.suggestCourses('التسويق الرقمي'));
  assert.equal(ranked[0], 'k1');
  assert.deepEqual(courseIds(await search.suggestCourses('تصميم الشعارات')), ['k7']);
  assert.deepEqual(courseIds(await search.suggestCourses('python مبتدئين')), ['k3']);
});

test('no results, empty categories and deactivated categories are never suggested', async () => {
  const { search } = load();
  assert.deepEqual(await search.suggestCourses('zzqqxx'), []);
  assert.deepEqual(categoryLabels(await search.suggestCourses('روبوت')), []);      // exists, no course
  assert.deepEqual(categoryLabels(await search.suggestCourses('Robotics')), []);
  assert.ok(!categoryLabels(await search.suggestCourses('متوقف')).includes('تصنيف متوقف'));
  assert.ok(courseIds(await search.suggestCourses('متوقف')).includes('k11'));    // its public course is still found
});

test('curriculum courses and their categories stay hidden while the switch is on', async () => {
  const { search } = load();
  const items = await search.suggestCourses('بكالوريا');
  assert.ok(!courseIds(items).includes('k10'));
  assert.ok(!categoryLabels(items).some(label => label.includes('البكالوريا')));
});

test('a legacy category text without a taxonomy entry is still a real, suggestible group', async () => {
  const { search } = load();
  const items = await search.suggestCourses('الخط');
  const group = items.find(i => i.type === 'category');
  assert.equal(group.label, 'الخط العربي');
  assert.equal(group.href, `/courses?category=${encodeURIComponent('الخط العربي')}`);
  assert.equal(group.count, 1);
  assert.ok(courseIds(items).includes('k9'));
});

test('"الفنون والموسيقى" from the old form is kept: its courses belong to the new subcategory', async () => {
  const { search } = load();
  const items = await search.suggestCourses('الفنون');
  const arts = items.find(i => i.type === 'category' && i.slug === 'arts-music');
  assert.deepEqual({ label: arts.label, parent: arts.parent, count: arts.count }, { label: 'الفنون والموسيقى', parent: 'المهارات المهنية والحرفية', count: 1 });
  assert.ok(courseIds(items).includes('k14'));
  assert.ok(courseIds(await search.suggestCourses('موسيقى')).includes('k14'));      // alias
  const ids = async params => (await search.searchCourses(params)).courses.map(c => c.id);
  assert.deepEqual(await ids({ category: 'arts-music' }), ['k14']);
  assert.deepEqual(await ids({ category: 'الفنون والموسيقى' }), ['k14']);           // old filter link
});

test('course suggestions carry image, category and price from the record; data URLs use the cached endpoint', async () => {
  const { search } = load();
  const [k2] = (await search.suggestCourses('إعلانات فيسبوك')).filter(i => i.id === 'k2');
  assert.deepEqual({ category: k2.category, price: k2.price, priceSYP: k2.priceSYP, href: k2.href },
    { category: 'الإعلانات الممولة', price: 25, priceSYP: 300000, href: '/courses/k2' });
  assert.equal((await search.suggestCourses('الشعارات')).find(i => i.id === 'k7').thumbnail, '/api/courses/k7/thumbnail');
  assert.equal((await search.suggestCourses('React')).find(i => i.id === 'k4').thumbnail, 'https://cdn.example.com/react.jpg');
  assert.equal((await search.suggestCourses('Claude')).find(i => i.id === 'k6').thumbnail, null);   // gradient
  assert.equal(search.suggestionThumbnail({ id: 'x', thumbnail: 'javascript:alert(1)' }), null);
  assert.equal(search.suggestionThumbnail({ id: 'x', thumbnail: '//evil.example/a.png' }), null);
  // The suggestion for an unlinked course shows its own text.
  assert.equal((await search.suggestCourses('Claude')).find(i => i.id === 'k6').category, 'الذكاء الاصطناعي');
});

test('suggestions are limited: at most 6 courses and 4 categories', async () => {
  const many = Array.from({ length: 300 }, (_, i) => course(`m${i}`, `تسويق ${i}`, { categoryId: 'cat_digital-marketing' }));
  const { search } = load({ courses: many });
  const items = await search.suggestCourses('تسويق');
  assert.equal(courseIds(items).length, 6);
  assert.ok(categoryLabels(items).length <= 4);
  assert.ok(JSON.stringify(items).length < 4000, 'small payload');
});

// ---------------------------------------------------------------------------
// Catalogue filters
// ---------------------------------------------------------------------------

test('category filters include subcategories; old text links resolve to their category', async () => {
  const { search } = load();
  const ids = async params => (await search.searchCourses(params)).courses.map(c => c.id).sort();
  assert.deepEqual(await ids({ category: 'digital-marketing' }), ['k1', 'k2']);
  assert.deepEqual(await ids({ category: 'paid-ads' }), ['k2']);
  assert.deepEqual(await ids({ category: 'ai' }), ['k5', 'k6']);
  assert.deepEqual(await ids({ category: 'ذكاء اصطناعي' }), ['k5', 'k6']);         // legacy link text
  assert.deepEqual(await ids({ category: 'الخط العربي' }), ['k9']);
  assert.deepEqual(await ids({ category: 'robotics' }), []);
  assert.deepEqual(await ids({ category: 'ai', q: 'chatgpt' }), ['k5']);
});

test('filter facets list only categories with public courses, mains before their subcategories', async () => {
  const { search } = load();
  const { categories } = (await search.searchCourses({})).facets;
  const values = categories.map(c => c.value);
  assert.ok(!values.includes('robotics'));
  assert.ok(!values.includes('retired'));
  assert.ok(!values.includes('school-education') && !values.includes('bac-scientific'));
  assert.ok(values.indexOf('digital-marketing') < values.indexOf('paid-ads'));
  assert.equal(categories.find(c => c.value === 'paid-ads').parent, 'التسويق الرقمي والإعلانات');
  assert.equal(categories.find(c => c.value === 'الخط العربي').count, 1);
  assert.equal(categories.find(c => c.value === 'arts-music').count, 1);
  assert.ok(categories.every(c => c.count > 0));
});

// ---------------------------------------------------------------------------
// Load and freshness
// ---------------------------------------------------------------------------

test('concurrent suggestions share one catalogue load and stay fast on a large catalogue', async t => {
  const big = Array.from({ length: 3000 }, (_, i) => course(`b${i}`, `${['تسويق', 'برمجة', 'تصميم', 'Python', 'ذكاء'][i % 5]} كورس رقم ${i}`,
    { categoryId: ['cat_digital-marketing', 'cat_programming-fundamentals', 'cat_branding-logo', 'cat_python-data', 'cat_ai-tools'][i % 5],
      tags: i % 7 ? [] : ['عرض خاص'] }));
  const { search, counters } = load({ courses: big });
  const queries = ['ت', 'تس', 'بر', 'ذكاء', 'AI', 'تصميم شعار', 'pyth', 'zzz'];
  const started = performance.now();
  const results = await Promise.all(Array.from({ length: 400 }, (_, i) => search.suggestCourses(queries[i % queries.length])));
  const elapsed = performance.now() - started;
  t.diagnostic(`400 concurrent suggestions over 3000 courses: ${elapsed.toFixed(0)} ms`);
  assert.equal(counters.course, 1, 'one catalogue query for all concurrent requests');
  assert.equal(counters.category, 1);
  assert.ok(results.every(items => courseIds(items).length <= 6));
  assert.deepEqual(results[0], results[queries.length]);   // deterministic
  assert.ok(elapsed < 5000, `too slow: ${elapsed} ms`);

  // Distinct, never-seen queries (no result reuse): the real per-keystroke cost.
  const cold = Array.from({ length: 60 }, (_, i) => `${['تسو', 'برم', 'تصم', 'pyt', 'ذكا', 'كورس رقم'][i % 6]} ${i}`);
  const coldStart = performance.now();
  for (const q of cold) await search.suggestCourses(q);
  const perQuery = (performance.now() - coldStart) / cold.length;
  t.diagnostic(`distinct queries over 3000 courses: ${perQuery.toFixed(1)} ms each`);
  assert.ok(perQuery < 250, `too slow per query: ${perQuery} ms`);
});

test('a change to categories or courses is picked up on the next search', async () => {
  const categories = TAXONOMY.slice();
  const { search, counters } = load({ categories });
  assert.deepEqual(categoryLabels(await search.suggestCourses('روبوت')), []);
  search.invalidateCatalogueSearch();
  await search.suggestCourses('روبوت');
  assert.equal(counters.category, 2);
});
