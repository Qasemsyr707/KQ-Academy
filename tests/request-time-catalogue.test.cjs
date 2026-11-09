/* eslint-disable @typescript-eslint/no-require-imports -- Node's CommonJS test runner. */
const assert = require('node:assert/strict');
const test = require('node:test');
const { isValidElement } = require('react');
const { loadTs } = require('./load-ts.cjs');

// Page integration checks with mocked request/Prisma calls and a successful-result
// memoizer. They do not exercise Next's real request runtime or persistent cache.
const MODIFIED = new Date('2026-11-09T09:00:00Z');
const SPECS = [
  {
    name: 'curriculum', modulePath: '../src/app/curriculum/page.tsx', model: 'course',
    componentImport: '../courses/CoursesClient', prop: 'initialCourses', key: 'public-curriculum-courses-v1',
    rows: [{ id: 'course-1', title: 'Published curriculum', instructor: { name: 'Teacher', image: null }, _count: { enrollments: 3, reviews: 2 } }],
    query: {
      where: { status: 'PUBLISHED', type: 'CURRICULUM' },
      include: { instructor: { select: { name: true, image: true } }, _count: { select: { enrollments: true, reviews: true } } },
      orderBy: { createdAt: 'desc' },
    },
  },
  {
    name: 'shorts', modulePath: '../src/app/features/shorts/page.tsx', model: 'short',
    componentImport: './ShortsClient', prop: 'initialShorts', key: 'public-shorts-v1',
    rows: [{ id: 'short-1', title: 'Educational short', user: { name: 'Teacher', image: null }, course: { title: 'Course', id: 'course-1' }, _count: { comments: 2 } }],
    query: {
      include: { user: { select: { name: true, image: true } }, course: { select: { title: true, id: true } }, _count: { select: { comments: true } } },
      orderBy: { createdAt: 'desc' },
    },
  },
  {
    name: 'sitemap', modulePath: '../src/app/sitemap.ts', model: 'course', key: 'public-sitemap-courses-v1',
    rows: [{ id: 'course-1', updatedAt: MODIFIED }],
    query: { where: { status: 'PUBLISHED' }, select: { id: true, updatedAt: true } },
  },
];

function deferred() {
  let resolve;
  const promise = new Promise(accept => { resolve = accept; });
  return { promise, resolve };
}

function findComponent(node, component) {
  if (Array.isArray(node)) return node.map(child => findComponent(child, component)).find(Boolean);
  if (!isValidElement(node)) return undefined;
  return node.type === component ? node : findComponent(node.props.children, component);
}

function harness(spec, { connection = async () => {}, query } = {}) {
  const queries = [];
  const registrations = [];
  const events = [];
  let cacheCalls = 0;
  function Client() { return null; }
  const mocks = {
    '@/lib/db': { prisma: { [spec.model]: { findMany: async args => {
      events.push('query');
      queries.push(args);
      return query ? query(args) : spec.rows;
    } } } },
    'next/server': { connection: async () => {
      events.push('connection');
      await connection();
    } },
    'next/cache': { unstable_cache: (fetchData, keys, options) => {
      registrations.push({ keys, options });
      let hasResult = false;
      let result;
      return async () => {
        events.push('cache');
        cacheCalls++;
        if (!hasResult) {
          // Publish only fulfilled values; a rejected database call is retryable.
          const loaded = await fetchData();
          result = loaded;
          hasResult = true;
        }
        return result;
      };
    } },
  };
  if (spec.componentImport) mocks[spec.componentImport] = Client;
  const entry = loadTs(spec.modulePath, mocks).default;
  return { entry, Client, queries, registrations, events, get cacheCalls() { return cacheCalls; } };
}

function assertOutput(spec, output, Client) {
  if (spec.componentImport) {
    const element = findComponent(output, Client);
    assert.ok(element, 'server-rendered output retains the client component');
    assert.equal(element.props[spec.prop], spec.rows, 'queried data reaches the existing SSR prop');
    return;
  }
  assert.deepEqual(output.map(item => item.url), [
    'https://kqacademy.com', 'https://kqacademy.com/courses',
    'https://kqacademy.com/login', 'https://kqacademy.com/register',
    'https://kqacademy.com/courses/course-1',
  ]);
  assert.equal(output[0].changeFrequency, 'daily');
  assert.equal(output[0].priority, 1);
  assert.ok(output[0].lastModified instanceof Date);
  assert.deepEqual(output[4], {
    url: 'https://kqacademy.com/courses/course-1', lastModified: MODIFIED, changeFrequency: 'weekly', priority: 0.8,
  });
}

for (const spec of SPECS) {
  test(`${spec.name} defers database work until connection, keeps its query/output and requests a 300-second cache`, async () => {
    const gate = deferred();
    const h = harness(spec, { connection: () => gate.promise });
    assert.deepEqual(h.queries, [], 'module initialization does not query the database');
    assert.deepEqual(h.registrations, [{ keys: [spec.key], options: { revalidate: 300 } }]);
    let settled = false;
    const pending = h.entry().then(output => { settled = true; return output; });
    await Promise.resolve();
    assert.equal(settled, false);
    assert.deepEqual(h.events, ['connection']);
    assert.equal(h.cacheCalls, 0);
    assert.deepEqual(h.queries, []);

    gate.resolve();
    assertOutput(spec, await pending, h.Client);
    assert.deepEqual(h.events, ['connection', 'cache', 'query']);
    assert.deepEqual(h.queries, [spec.query]);

    assertOutput(spec, await h.entry(), h.Client);
    assert.deepEqual(h.events, ['connection', 'cache', 'query', 'connection', 'cache']);
    assert.equal(h.cacheCalls, 2, 'each request uses the cached wrapper');
    assert.equal(h.queries.length, 1, 'the functional cache mock supplies the second request');
  });

  test(`${spec.name} propagates connection rejection and prerender bailout without a query or cache lookup`, async () => {
    const bailout = Object.assign(new Error('Simulated prerender bailout'), { digest: 'DYNAMIC_SERVER_USAGE' });
    for (const failure of [new Error('Request unavailable'), bailout]) {
      const h = harness(spec, { connection: async () => { throw failure; } });
      await assert.rejects(h.entry(), error => error === failure);
      assert.deepEqual(h.events, ['connection']);
      assert.deepEqual(h.queries, []);
      assert.equal(h.cacheCalls, 0);
    }
  });
}

test('sitemap database failure returns static links without caching fallback and recovers course links on the next request', async t => {
  const spec = SPECS.find(item => item.name === 'sitemap');
  let attempts = 0;
  const logs = [];
  t.mock.method(console, 'error', (...args) => logs.push(args));
  const h = harness(spec, { query: async () => {
    attempts++;
    if (attempts === 1) throw new Error('Simulated database unavailable');
    return spec.rows;
  } });

  const fallback = await h.entry();
  assert.deepEqual(fallback.map(item => item.url), [
    'https://kqacademy.com', 'https://kqacademy.com/courses',
    'https://kqacademy.com/login', 'https://kqacademy.com/register',
  ]);
  assert.deepEqual(logs, [['Failed to fetch published courses for sitemap']]);
  assert.equal(h.queries.length, 1);

  assertOutput(spec, await h.entry(), h.Client);
  assert.equal(attempts, 2, 'a failed database call does not cache the static fallback');
  assert.deepEqual(h.queries, [spec.query, spec.query]);
  assertOutput(spec, await h.entry(), h.Client);
  assert.equal(attempts, 2, 'a recovered successful result is reusable by the functional cache mock');
});
