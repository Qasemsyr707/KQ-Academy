/* eslint-disable @typescript-eslint/no-require-imports -- Node test runner. */
const assert = require('node:assert/strict');
const test = require('node:test');
const { loadTs } = require('./load-ts.cjs');

const PNG = Buffer.from('89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c4890000000d4944415478da63f8ffff3f0005fe02fea7d6a5d40000000049454e44ae426082', 'hex');
const COURSES = [
  { id: 'pub-data', status: 'PUBLISHED', type: 'SKILL', category: 'تصميم', thumbnail: `data:image/png;base64,${PNG.toString('base64')}`, updatedAt: new Date('2026-11-01T00:00:00Z') },
  { id: 'pub-url', status: 'PUBLISHED', type: 'SKILL', category: 'تصميم', thumbnail: 'https://cdn.example.com/a.png', updatedAt: new Date() },
  { id: 'pub-svg', status: 'PUBLISHED', type: 'SKILL', category: 'تصميم', thumbnail: 'data:image/svg+xml;base64,PHN2Zz48L3N2Zz4=', updatedAt: new Date() },
  { id: 'draft', status: 'PENDING', type: 'SKILL', category: 'تصميم', thumbnail: `data:image/png;base64,${PNG.toString('base64')}`, updatedAt: new Date() },
];

function load({ suggest = async () => [], categories = async () => [] } = {}) {
  const rate = loadTs('../src/lib/rate-limit.ts');
  rate.resetRateLimits();
  const findFirstCalls = [];
  const mocks = {
    '@/lib/rate-limit': rate,
    '@/lib/course-search': { suggestCourses: suggest, SUGGEST_LIMITS: { maxLength: 80 } },
    '@/lib/course-taxonomy': { activeCategories: categories },
    '@/lib/db': { prisma: { notification: {}, course: { findFirst: async ({ where }) => {
      findFirstCalls.push(where);
      // publicCourseWhere: published only (the curriculum part is covered by catalogue tests).
      return COURSES.find(c => c.id === where.id && c.status === where.status) ?? null;
    } } } },
  };
  mocks['@/lib/catalogue-visibility'] = loadTs('../src/lib/catalogue-visibility.ts', mocks);
  return {
    rate, findFirstCalls,
    suggestRoute: loadTs('../src/app/api/courses/suggest/route.ts', mocks),
    thumbnailRoute: loadTs('../src/app/api/courses/[id]/thumbnail/route.ts', mocks),
    categoriesRoute: loadTs('../src/app/api/categories/route.ts', mocks),
  };
}

const get = (url, headers = {}) => new Request(`https://academy.test${url}`, { headers: { 'x-real-ip': '203.0.113.7', ...headers } });
const params = id => ({ params: Promise.resolve({ id }) });

test('suggest: public catalogue data with a short shared cache; the query is capped', async () => {
  let seen = null;
  const { suggestRoute } = load({ suggest: async q => { seen = q; return [{ type: 'course', id: 'c1', label: 'كورس', href: '/courses/c1' }]; } });
  const res = await suggestRoute.GET(get(`/api/courses/suggest?q=${encodeURIComponent('ت'.repeat(200))}`));
  assert.equal(res.status, 200);
  assert.equal(res.headers.get('cache-control'), 'public, max-age=30, s-maxage=30');
  assert.equal(seen.length, 80);
  const body = await res.json();
  assert.equal(body.suggestions[0].href, '/courses/c1');
});

test('suggest: a failure returns an empty list that is never cached', async t => {
  t.mock.method(console, 'error', () => {});
  const { suggestRoute } = load({ suggest: async () => { throw new Error('db down'); } });
  const res = await suggestRoute.GET(get('/api/courses/suggest?q=x'));
  assert.deepEqual(await res.json(), { suggestions: [] });
  assert.equal(res.headers.get('cache-control'), 'no-store');
});

test('suggest: excessive requests from one address are limited (429 with Retry-After)', async () => {
  const { suggestRoute } = load();
  const statuses = [];
  for (let i = 0; i < 95; i++) statuses.push((await suggestRoute.GET(get('/api/courses/suggest?q=a'))).status);
  assert.equal(statuses.filter(s => s === 200).length, 90);
  const limited = await suggestRoute.GET(get('/api/courses/suggest?q=a'));
  assert.equal(limited.status, 429);
  assert.ok(Number(limited.headers.get('retry-after')) >= 1);
  // Another visitor is not affected.
  assert.equal((await suggestRoute.GET(get('/api/courses/suggest?q=a', { 'x-real-ip': '198.51.100.9' }))).status, 200);
});

test('thumbnail: serves a public course image stored as a data URL, safely and cacheably', async () => {
  const { thumbnailRoute } = load();
  const res = await thumbnailRoute.GET(get('/api/courses/pub-data/thumbnail'), params('pub-data'));
  assert.equal(res.status, 200);
  assert.equal(res.headers.get('content-type'), 'image/png');
  assert.equal(res.headers.get('x-content-type-options'), 'nosniff');
  assert.match(res.headers.get('content-security-policy'), /sandbox/);
  assert.equal(res.headers.get('cache-control'), 'public, max-age=3600, s-maxage=3600');
  assert.deepEqual(Buffer.from(await res.arrayBuffer()), PNG);
  const etag = res.headers.get('etag');
  assert.equal((await thumbnailRoute.GET(get('/api/courses/pub-data/thumbnail', { 'if-none-match': etag }), params('pub-data'))).status, 304);
});

test('thumbnail: nothing for unpublished courses, URL thumbnails, SVG or malformed ids', async () => {
  const { thumbnailRoute, findFirstCalls } = load();
  for (const id of ['draft', 'pub-url', 'pub-svg', 'missing', '../etc', 'x'.repeat(65)]) {
    assert.equal((await thumbnailRoute.GET(get(`/api/courses/${encodeURIComponent(id)}/thumbnail`), params(id))).status, 404, id);
  }
  // The lookup always carries the public-catalogue filter.
  assert.ok(findFirstCalls.every(where => where.status === 'PUBLISHED'));
  assert.ok(!findFirstCalls.some(where => where.id === '../etc'));
});

test('categories list: public names for the course forms, briefly cached, rate limited', async () => {
  const list = [{ id: 'cat_ai', slug: 'ai', name: 'الذكاء الاصطناعي', nameEn: 'AI', parentId: null, aliases: [] }];
  const { categoriesRoute } = load({ categories: async () => list });
  const res = await categoriesRoute.GET(get('/api/categories'));
  assert.equal(res.status, 200);
  assert.equal(res.headers.get('cache-control'), 'public, max-age=60, s-maxage=60');
  assert.deepEqual((await res.json()).categories, list);
  let last;
  for (let i = 0; i < 31; i++) last = await categoriesRoute.GET(get('/api/categories'));
  assert.equal(last.status, 429);
});
