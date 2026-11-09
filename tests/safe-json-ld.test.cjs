/* eslint-disable @typescript-eslint/no-require-imports -- Node's CommonJS test runner. */
const assert = require('node:assert/strict');
const test = require('node:test');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
const { loadTs } = require('./load-ts.cjs');

const { serializeJsonLd } = loadTs('../src/lib/safe-json-ld.ts');
const TITLE = '</script><script>globalThis.untrustedCourseTitle = true</script>';
const DESCRIPTION = 'شرح عربي </ScRiPt><img src=x onerror="untrustedDescription()"> <!-- nested <text> -->';
const TEACHER = 'مدرّب </script><svg onload="untrustedTeacher()"> \u2028 \u2029';

function assertSafeJson(serialized, expected) {
  assert.equal(typeof serialized, 'string');
  assert.doesNotMatch(serialized, /[<\u2028\u2029]/u);
  assert.doesNotMatch(serialized, /<\/script/i);
  assert.deepEqual(JSON.parse(serialized), expected);
}

function structuredDataElement(node) {
  if (Array.isArray(node)) return node.map(structuredDataElement).find(Boolean);
  if (!React.isValidElement(node)) return undefined;
  if (node.type === 'script' && node.props.type === 'application/ld+json') return node;
  return structuredDataElement(node.props.children);
}

test('malicious structured data remains valid JSON and cannot create another HTML element', () => {
  const value = { '@type': 'Course', name: TITLE, description: DESCRIPTION, author: { name: TEACHER } };
  const serialized = serializeJsonLd(value);
  assertSafeJson(serialized, value);
  const markup = renderToStaticMarkup(React.createElement('script', {
    type: 'application/ld+json', dangerouslySetInnerHTML: { __html: serialized },
  }));
  assert.equal((markup.match(/<script\b/g) || []).length, 1);
  assert.equal((markup.match(/<\/script\s*>/gi) || []).length, 1);
  assert.doesNotMatch(markup, /<(?:img|svg)\b/i);
});

test('serialization preserves nested values, null, Arabic, emoji, quotes and Unicode separators on parsing', () => {
  const value = {
    label: 'تعليم 👩‍🏫 < 5 & > 2 "quoted" \\ slash',
    nested: { value: null, enabled: true, rating: 4.5, lines: 'one\u2028two\u2029three' },
    list: [null, false, 0, { title: '<nested>' }],
  };
  assertSafeJson(serializeJsonLd(value), value);
});

test('undefined top-level input yields JSON null while object and array values retain JSON.stringify semantics', () => {
  assert.equal(serializeJsonLd(undefined), 'null');
  assert.equal(serializeJsonLd(null), 'null');
  assertSafeJson(serializeJsonLd({ omitted: undefined, values: [undefined, null] }), { values: [null, null] });
  assertSafeJson(serializeJsonLd('نص < مستقل'), 'نص < مستقل');
});

test('course page serializes untrusted course fields safely while retaining SEO data and existing client props', async () => {
  const course = {
    id: 'course-1', title: TITLE, description: DESCRIPTION, category: 'تعليم',
    instructor: { name: TEACHER, image: null }, price: 25, priceSYP: 100,
    rating: 4.5, reviews: [{ id: 'review-1' }], chapters: [], previewVideoUrl: null,
  };
  const calls = [];
  function Client() { return null; }
  const page = loadTs('../src/app/courses/[courseId]/page.tsx', {
    '@/lib/db': { prisma: { course: { findUnique: async args => { calls.push(args); return course; } } } },
    'next/navigation': { notFound: () => { throw new Error('Unexpected notFound'); } },
    'next-auth': { getServerSession: async () => null },
    '@/lib/auth': { authOptions: {} },
    './CourseDetailsClient': Client,
    '@/lib/lesson-links': { protectCourseLessonSources: value => value },
    '@/lib/bunny-playback': { getBunnyPlaybackUrl: () => { throw new Error('Fixture has no preview'); } },
  }).default;
  const output = await page({ params: Promise.resolve({ courseId: course.id }) });
  assert.equal(calls.length, 1);
  assert.deepEqual(calls[0].where, { id: course.id });
  const script = structuredDataElement(output);
  assert.ok(script, 'existing JSON-LD script remains present');
  assertSafeJson(script.props.dangerouslySetInnerHTML.__html, {
    '@context': 'https://schema.org', '@type': 'Course', name: TITLE, description: DESCRIPTION,
    provider: { '@type': 'Organization', name: 'KQ Academy', sameAs: 'https://kqacademy.com' },
    author: { '@type': 'Person', name: TEACHER },
    aggregateRating: { '@type': 'AggregateRating', ratingValue: 4.5, ratingCount: 1 },
    offers: { '@type': 'Offer', price: 25, priceCurrency: 'USD' },
  });
  const markup = renderToStaticMarkup(output);
  assert.equal((markup.match(/<\/script\s*>/gi) || []).length, 1);
  assert.doesNotMatch(markup, /<(?:img|svg)\b/i);
  const client = output.props.children.find(child => child.type === Client);
  assert.equal(client.props.course.title, TITLE);
  assert.equal(client.props.course.description, DESCRIPTION);
  assert.equal(client.props.course.instructor.name, TEACHER);
  assert.equal(client.props.isEnrolled, false);
});

test('root layout retains the organization JSON-LD schema and Arabic page attributes', () => {
  function Stub() { return null; }
  const layout = loadTs('../src/app/layout.tsx', {
    './globals.css': {}, 'next/script': Stub,
    '@/components/AuthProvider': Stub, '@/components/Navbar': Stub,
    '@/components/Footer': Stub, '@/components/WhatsAppButton': Stub,
  }).default;
  const output = layout({ children: null });
  assert.equal(output.type, 'html');
  assert.equal(output.props.lang, 'ar');
  assert.equal(output.props.dir, 'rtl');
  const script = structuredDataElement(output);
  assert.ok(script);
  const schema = JSON.parse(script.props.dangerouslySetInnerHTML.__html);
  assert.equal(schema['@context'], 'https://schema.org');
  assert.equal(schema['@type'], 'EducationalOrganization');
  assert.equal(schema.name, 'KQ Academy');
  assert.equal(schema.url, 'https://kqacademy.com');
  assert.equal(schema.address.addressCountry, 'SY');
  assertSafeJson(script.props.dangerouslySetInnerHTML.__html, schema);
});
