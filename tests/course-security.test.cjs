/* eslint-disable @typescript-eslint/no-require-imports -- Node's CommonJS test runner. */
const assert = require('node:assert/strict');
const test = require('node:test');
const React = require('react');
const jwt = require('jsonwebtoken');
const { loadTs } = require('./load-ts.cjs');

const STUDENT = { id: 'student', role: 'STUDENT', isBanned: false };
const TEACHER = { id: 'teacher', role: 'INSTRUCTOR', isBanned: false };
const PRIVATE = {
  password: 'PRIVATE_HASH', email: 'PRIVATE_EMAIL', phone: 'PRIVATE_PHONE',
  walletUSD: 123456.78, walletSYP: 987654.32, points: 456789,
  isBanned: true, banReason: 'PRIVATE_BAN', affiliateCode: 'PRIVATE_REFERRAL',
  futureCredential: 'PRIVATE_FUTURE_SECRET',
};
const COURSE = {
  id: 'course', title: 'Visible course', description: 'Visible description',
  status: 'PUBLISHED', category: 'Visible category', type: 'SKILL', price: 25,
  priceSYP: 350000, rating: 4.5, instructorId: TEACHER.id, previewVideoUrl: null,
  instructor: { id: TEACHER.id, name: 'Visible teacher', image: '/teacher.png', bio: 'Visible bio', ...PRIVATE },
  reviews: [{ id: 'review', rating: 5, comment: 'Visible review', createdAt: new Date('2026-11-11'),
    user: { id: 'reviewer', name: 'Visible reviewer', image: '/reviewer.png', ...PRIVATE } }],
  attachments: [], questions: [],
  chapters: [{ id: 'chapter', title: 'Visible chapter', isFree: false, order: 1, attachments: [],
    lessons: [{ id: 'lesson', title: 'Visible lesson', order: 1, isLive: false, attachments: [],
      videoUrl: 'https://private-video.test/paid.mp4', content: 'PRIVATE_LESSON_BODY', liveRoomName: 'PRIVATE_ROOM' }],
    quizzes: [{ id: 'quiz', title: 'Visible quiz', type: 'AUTOMATIC', passingScore: 50, totalMarks: 1,
      questions: [{ id: 'question', text: 'Visible question', options: '["A","B"]', points: 1, correctAnswer: 1 }] }],
  }],
};

// This fake database honors Prisma's allowlists. Broad include:true intentionally
// returns the sensitive fixture fields, so serialized-output assertions catch it.
function project(row, query = {}) {
  if (row == null) return row;
  if (Array.isArray(row)) return row.map(value => project(value, query));
  if (!query.select && !query.include) return structuredClone(row);
  const result = query.select ? {} : structuredClone(row);
  for (const [key, selection] of Object.entries(query.select || query.include)) {
    if (!selection) continue;
    result[key] = selection === true ? structuredClone(row[key]) : project(row[key], selection);
  }
  return result;
}

function harness({ status = 'PUBLISHED', sessionUser = null, currentUser = sessionUser, enrolled = false, missing = false } = {}) {
  const row = { ...COURSE, status };
  const queries = [];
  const userQueries = [];
  const enrollmentQueries = [];
  const navigation = kind => { throw Object.assign(new Error(kind), { digest: kind }); };
  function DetailsClient() { return null; }
  function PlayerClient() { return null; }
  const mocks = {
    '@/lib/db': { prisma: {
      course: {
        findUnique: async query => { queries.push(query); return missing ? null : project(row, query); },
        findMany: async query => {
          queries.push(query);
          return [row, { ...row, id: 'hidden', status: 'PENDING', title: 'PRIVATE_DRAFT_TITLE' }]
            .filter(course => !query.where?.status || course.status === query.where.status)
            .map(course => project(course, query));
        },
      },
      user: { findUnique: async query => { userQueries.push(query); return currentUser; } },
      enrollment: { findUnique: async query => { enrollmentQueries.push(query); return enrolled ? { id: 'enrollment' } : null; } },
    } },
    'next-auth': { getServerSession: async () => sessionUser ? { user: sessionUser } : null },
    '@/lib/auth': { authOptions: {} },
    'next/navigation': {
      notFound: () => navigation('NEXT_NOT_FOUND'), redirect: path => navigation(`NEXT_REDIRECT:${path}`),
      unstable_rethrow: error => { if (error.digest) throw error; },
    },
    '@/lib/bunny-playback': { getBunnyPlaybackUrl: () => { throw new Error('Fixture has no preview'); } },
    './CourseDetailsClient': DetailsClient,
    './CoursePlayerClient': PlayerClient,
  };
  return {
    mocks, queries, userQueries, enrollmentQueries, DetailsClient, PlayerClient,
    access: loadTs('../src/lib/course-access.ts', mocks),
    page: () => loadTs('../src/app/courses/[courseId]/page.tsx', mocks),
    learn: () => loadTs('../src/app/courses/[courseId]/learn/page.tsx', mocks).default,
    list: () => loadTs('../src/app/api/mobile/courses/route.ts', mocks).GET,
    detail: () => loadTs('../src/app/api/mobile/courses/[id]/route.ts', mocks).GET,
  };
}

const params = { params: Promise.resolve({ courseId: COURSE.id }) };
const detailParams = { params: Promise.resolve({ id: COURSE.id }) };
const request = new Request('https://academy.test/api/mobile/courses/course');
function findElement(node, type) {
  if (Array.isArray(node)) return node.map(value => findElement(value, type)).find(Boolean);
  if (!React.isValidElement(node)) return undefined;
  return node.type === type ? node : findElement(node.props.children, type);
}
function assertPublic(serialized) {
  for (const value of Object.values(PRIVATE)) {
    if (typeof value === 'string' || typeof value === 'number') assert.equal(serialized.includes(String(value)), false, `private value ${value}`);
  }
  for (const field of Object.keys(PRIVATE)) assert.equal(serialized.includes(`"${field}":`), false, `private field ${field}`);
  assert.equal(serialized.includes('PRIVATE_LESSON_BODY'), false);
  assert.equal(serialized.includes('PRIVATE_ROOM'), false);
  assert.equal(serialized.includes('private-video.test'), false);
}

test('web course client props use public profile projections and preserve visible content and prices', async () => {
  const h = harness();
  const output = await h.page().default(params);
  const client = findElement(output, h.DetailsClient);
  assert.ok(client);
  const json = JSON.stringify(client.props);
  assertPublic(json);
  assert.deepEqual(client.props.course.instructor, { name: 'Visible teacher', image: '/teacher.png', bio: 'Visible bio' });
  assert.deepEqual(client.props.course.reviews[0].user, { name: 'Visible reviewer', image: '/reviewer.png' });
  assert.equal(client.props.course.reviews[0].comment, 'Visible review');
  assert.equal(client.props.course.title, COURSE.title);
  assert.equal(client.props.course.description, COURSE.description);
  assert.equal(client.props.course.price, COURSE.price);
  assert.equal(client.props.course.priceSYP, COURSE.priceSYP);
  assert.equal(client.props.isEnrolled, false);
});

test('public mobile list and detail serialize public fields without lesson sources or answer keys', async () => {
  const h = harness();
  const list = await h.list()();
  const detail = await h.detail()(request, detailParams);
  assert.equal(list.status, 200);
  assert.equal(detail.status, 200);
  const listBody = await list.json();
  assert.equal(listBody.courses.length, 1);
  assert.equal(listBody.courses[0].id, COURSE.id);
  for (const value of [listBody, await detail.json()]) {
    const json = JSON.stringify(value);
    assertPublic(json);
    assert.equal(json.includes('correctAnswer'), false);
    assert.equal(json.includes('PRIVATE_DRAFT_TITLE'), false);
    assert.equal(json.includes('Visible teacher'), true);
    assert.equal(json.includes('Visible lesson'), true);
  }
  assert.equal(h.queries[0].where.status, 'PUBLISHED');
  assert.equal(detail.headers.get('cache-control'), 'private, no-store');
  assert.equal(detail.headers.get('cdn-cache-control'), 'no-store');
  assert.equal(detail.headers.get('vary'), 'Cookie, Authorization');
});

test('pending, rejected and unknown course states are hidden consistently in web, metadata and mobile', async () => {
  for (const status of ['PENDING', 'REJECTED', 'UNPUBLISHED', 'UNKNOWN']) {
    for (const sessionUser of [null, STUDENT, { id: 'other', role: 'INSTRUCTOR' }]) {
      const h = harness({ status, sessionUser });
      await assert.rejects(h.page().default(params), error => error.digest === 'NEXT_NOT_FOUND');
      const metadata = await h.page().generateMetadata(params);
      assert.equal(JSON.stringify(metadata).includes(COURSE.title), false);
      assert.equal(metadata.openGraph, undefined);
      const response = await h.detail()(request, detailParams);
      assert.equal(response.status, 404);
      assert.equal(JSON.stringify(await response.json()).includes(COURSE.title), false);
    }
  }
});

test('current course instructor, ADMIN, OWNER and existing enrolled students retain unpublished access', async () => {
  for (const sessionUser of [TEACHER, { id: 'admin', role: 'ADMIN' }, { id: 'owner', role: 'OWNER' }, STUDENT]) {
    const h = harness({ status: 'PENDING', sessionUser, enrolled: sessionUser === STUDENT });
    const client = findElement(await h.page().default(params), h.DetailsClient);
    assert.ok(client);
    assert.equal(client.props.isEnrolled, sessionUser === STUDENT);
    assertPublic(JSON.stringify(client.props));
    assert.match((await h.page().generateMetadata(params)).title, /Visible course/);
    assert.equal((await h.detail()(request, detailParams)).status, 200);
    const player = await h.learn()({ ...params, searchParams: Promise.resolve({}) });
    assert.equal(player.type, h.PlayerClient);
    assert.equal(player.props.hasAccess, true);
    assert.equal(JSON.stringify(player.props.chapters).includes('correctAnswer'), false);
    assert.equal(player.props.chapters[0].quizzes[0].questions[0].text, 'Visible question');
  }
});

test('stale session privileges, banned accounts and removed accounts do not reveal unpublished courses', async () => {
  for (const currentUser of [{ ...STUDENT, id: 'admin' }, { id: 'admin', role: 'ADMIN', isBanned: true }, null]) {
    const h = harness({ status: 'REJECTED', sessionUser: { id: 'admin', role: 'ADMIN' }, currentUser });
    await assert.rejects(h.page().default(params), error => error.digest === 'NEXT_NOT_FOUND');
    assert.equal((await h.detail()(request, detailParams)).status, 404);
    assert.equal(h.userQueries.every(query => query.select.isBanned === true && query.select.role === true), true);
  }
  const demotedOwner = harness({ status: 'PENDING', sessionUser: TEACHER, currentUser: { ...TEACHER, role: 'STUDENT' } });
  await assert.rejects(demotedOwner.page().default(params), error => error.digest === 'NEXT_NOT_FOUND');
});

test('mobile course authorization verifies bearer signature and current role rather than trusting token claims', async t => {
  const previous = process.env.NEXTAUTH_SECRET;
  process.env.NEXTAUTH_SECRET = 'course-security-test-only-secret';
  t.after(() => { if (previous === undefined) delete process.env.NEXTAUTH_SECRET; else process.env.NEXTAUTH_SECRET = previous; });
  const token = jwt.sign({ id: STUDENT.id, role: 'ADMIN' }, process.env.NEXTAUTH_SECRET, { expiresIn: '1h' });
  const bearer = value => new Request(request.url, { headers: { Authorization: `Bearer ${value}` } });
  const noEnrollment = harness({ status: 'PENDING', currentUser: STUDENT });
  assert.equal((await noEnrollment.detail()(bearer(token), detailParams)).status, 404);
  const enrolled = harness({ status: 'PENDING', currentUser: STUDENT, enrolled: true });
  assert.equal((await enrolled.detail()(bearer(token), detailParams)).status, 200);
  assert.equal(enrolled.enrollmentQueries[0].where.userId_courseId.userId, STUDENT.id);
  for (const invalid of [
    jwt.sign({ id: STUDENT.id }, 'wrong-key'),
    jwt.sign({ id: STUDENT.id }, process.env.NEXTAUTH_SECRET, { expiresIn: -1 }),
    jwt.sign({ id: STUDENT.id }, process.env.NEXTAUTH_SECRET, { algorithm: 'HS384' }),
  ]) {
    const h = harness({ status: 'PENDING', currentUser: STUDENT, enrolled: true });
    assert.equal((await h.detail()(bearer(invalid), detailParams)).status, 404);
    assert.equal(h.userQueries.length, 0);
    assert.equal(h.enrollmentQueries.length, 0);
  }
});

test('unpublished lessons are not exposed through the learn page and missing courses stay 404', async () => {
  const h = harness({ status: 'PENDING', sessionUser: STUDENT });
  await assert.rejects(h.learn()({ ...params, searchParams: Promise.resolve({}) }), error => error.digest === 'NEXT_NOT_FOUND');
  const missing = harness({ missing: true });
  await assert.rejects(missing.page().default(params), error => error.digest === 'NEXT_NOT_FOUND');
  assert.equal((await missing.detail()(request, detailParams)).status, 404);
});

test('public bundle and career-path lists filter unpublished course relations at the database boundary', async () => {
  const calls = [];
  const published = { ...COURSE, instructor: { name: 'Visible teacher' } };
  const hidden = { ...published, id: 'hidden', status: 'PENDING', title: 'PRIVATE_DRAFT_TITLE' };
  const bundles = [
    { id: 'published-bundle', isActive: true, courses: [{ course: published }] },
    { id: 'mixed-bundle', isActive: true, courses: [{ course: published }, { course: hidden }] },
  ];
  const bundleRoute = loadTs('../src/app/api/bundles/route.ts', {
    '@/lib/db': { prisma: { courseBundle: { findMany: async query => {
      calls.push(query);
      return bundles.filter(bundle => !query.where.courses?.every
        || bundle.courses.every(item => item.course.status === query.where.courses.every.course.status))
        .map(bundle => project(bundle, query));
    } } } },
  }).GET;
  const body = await (await bundleRoute()).json();
  assert.deepEqual(body.bundles.map(bundle => bundle.id), ['published-bundle']);
  assert.equal(JSON.stringify(body).includes('PRIVATE_DRAFT_TITLE'), false);
  const pathsRoute = loadTs('../src/app/api/career-paths/route.ts', {
    '@/lib/auth': { authOptions: {} }, 'next-auth': { getServerSession: async () => null },
    '@/lib/db': { prisma: { careerPath: { findMany: async query => {
      calls.push(query);
      const courses = [published, hidden].filter(course => !query.include.courses.where
        || course.status === query.include.courses.where.course.status).map(course => ({ course }));
      return [{ id: 'path', courses: courses.map(item => project(item, query.include.courses)) }];
    } } } },
  }).GET;
  const paths = await (await pathsRoute()).json();
  assert.equal(paths[0].courses.length, 1);
  assert.equal(JSON.stringify(paths).includes('PRIVATE_DRAFT_TITLE'), false);
  assert.equal(calls[0].where.courses.every.course.status, 'PUBLISHED');
  assert.equal(calls[1].include.courses.where.course.status, 'PUBLISHED');
});

test('public shorts and mobile live classes cannot reveal unpublished linked courses', async () => {
  const rows = [
    { id: 'published', courseId: 'course', course: { status: 'PUBLISHED', title: 'Visible course' } },
    { id: 'independent', courseId: null, course: null },
    { id: 'pending', courseId: 'hidden', course: { status: 'PENDING', title: 'PRIVATE_DRAFT_TITLE' } },
    { id: 'rejected', courseId: 'hidden2', course: { status: 'REJECTED', title: 'PRIVATE_DRAFT_TITLE' } },
  ];
  for (const modulePath of ['../src/app/api/shorts/route.ts', '../src/app/api/mobile/shorts/route.ts']) {
    const route = loadTs(modulePath, { '@/lib/db': { prisma: { short: { findMany: async query => {
      assert.deepEqual(query.where, { OR: [{ courseId: null }, { course: { status: 'PUBLISHED' } }] });
      return rows.filter(row => query.where.OR.some(condition => condition.courseId === null
        ? row.courseId === null : row.course?.status === condition.course.status));
    } } } } }).GET;
    const response = await route(request);
    assert.equal(response.status, 200);
    const body = await response.json();
    assert.deepEqual(body.map(row => row.id), ['published', 'independent']);
    assert.equal(JSON.stringify(body).includes('PRIVATE_DRAFT_TITLE'), false);
  }
  const live = loadTs('../src/app/api/mobile/live-classes/route.ts', {
    '@/lib/db': { prisma: { liveClass: { findMany: async query => {
      assert.deepEqual(query.where, { course: { status: 'PUBLISHED' } });
      return rows.filter(row => row.course?.status === query.where.course.status);
    } } } },
  }).GET;
  const body = await (await live(request)).json();
  assert.deepEqual(body.map(row => row.id), ['published']);
});

test('coupon validation cannot disclose pricing for unpublished courses', async () => {
  for (const status of ['PUBLISHED', 'PENDING', 'REJECTED']) {
    const route = loadTs('../src/app/api/coupons/validate/route.ts', {
      '@/lib/db': { prisma: {
        coupon: { findUnique: async () => ({ id: 'coupon', code: 'TEST', discount: 10 }) },
        course: { findUnique: async query => {
          assert.deepEqual(query.where, { id: 'course', status: 'PUBLISHED' });
          assert.deepEqual(query.select, { price: true });
          return query.where.status === status ? { price: 100 } : null;
        } },
      } },
    }).POST;
    const response = await route(new Request('https://academy.test/api/coupons/validate', {
      method: 'POST', body: JSON.stringify({ code: 'test', courseId: 'course' }),
    }));
    assert.equal(response.status, status === 'PUBLISHED' ? 200 : 404);
    const body = await response.json();
    assert.equal(body.finalPrice, status === 'PUBLISHED' ? 90 : undefined);
  }
});

test('instructor live page uses public profile fields, fresh authorization and a course-scoped lesson lookup', async () => {
  function Client() { return null; }
  const routeParams = { params: Promise.resolve({ courseId: COURSE.id, lessonId: 'live-lesson' }) };
  const navigation = path => { throw Object.assign(new Error(path), { digest: `REDIRECT:${path}` }); };
  for (const options of [
    { user: TEACHER, lessonCourseId: COURSE.id, allowed: true },
    { user: { id: 'admin', role: 'ADMIN' }, lessonCourseId: COURSE.id, allowed: true },
    { user: TEACHER, lessonCourseId: 'other-course', allowed: false },
    { user: { ...TEACHER, role: 'STUDENT' }, lessonCourseId: COURSE.id, allowed: false },
    { user: { ...TEACHER, isBanned: true }, lessonCourseId: COURSE.id, allowed: false },
    { user: { id: 'unrelated', role: 'INSTRUCTOR' }, lessonCourseId: COURSE.id, allowed: false },
  ]) {
    const page = loadTs('../src/app/instructor/courses/[courseId]/live/[lessonId]/page.tsx', {
      './LiveInstructorClient': Client,
      'next/navigation': { redirect: navigation },
      'next-auth': { getServerSession: async () => ({ user: TEACHER }) },
      '@/lib/auth': { authOptions: {} },
      '@/lib/db': { prisma: {
        user: { findUnique: async () => options.user },
        course: { findUnique: async query => project(COURSE, query) },
        lesson: { findUnique: async query => {
          assert.deepEqual(query.where, { id: 'live-lesson', chapter: { courseId: COURSE.id } });
          return query.where.chapter.courseId === options.lessonCourseId ? { id: 'live-lesson', isLive: true } : null;
        } },
      } },
    }).default;
    if (!options.allowed) {
      await assert.rejects(page(routeParams), error => error.digest?.startsWith('REDIRECT:'));
    } else {
      const result = await page(routeParams);
      assert.equal(result.type, Client);
      const profile = result.props.course.instructor;
      assert.deepEqual(profile, { name: 'Visible teacher', image: '/teacher.png', bio: 'Visible bio' });
      for (const field of Object.keys(PRIVATE)) assert.equal(Object.hasOwn(profile, field), false);
    }
  }
});
