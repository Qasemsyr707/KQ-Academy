/* eslint-disable @typescript-eslint/no-require-imports -- Node's CommonJS test runner. */
const assert = require('node:assert/strict');
const test = require('node:test');
const { loadTs } = require('./load-ts.cjs');
const jwt = require('jsonwebtoken');

const LESSON = 'c123456789012345678901234';
const VIDEO = 'https://iframe.mediadelivery.net/embed/123/11111111-2222-3333-4444-555555555555';
const STUDENT = { id: 'student', role: 'STUDENT' };

function harness({ user = STUDENT, enrolled = false, free = false, price = 100, status = 'PUBLISHED', missing = false, videoUrl = VIDEO, providerError, bearerUser = user || STUDENT } = {}) {
  const events = [];
  class BunnyServerError extends Error {
    constructor(status, message) { super(message); this.status = status; }
  }
  const mocks = {
    '@/lib/db': { prisma: {
      user: { findUnique: async () => bearerUser },
      lesson: { findUnique: async () => { events.push('lesson'); return missing ? null : {
        videoUrl, isLive: false,
        chapter: { isFree: free, course: { id: 'course', instructorId: 'teacher', status, price, priceSYP: price } },
      }; } },
      enrollment: { findUnique: async args => { events.push(['enrollment', args.where.userId_courseId]); return enrolled ? { id: 'enrollment' } : null; } },
    } },
    '@/lib/auth': { authOptions: {} },
    'next-auth': { getServerSession: async () => user ? { user } : null },
    '@/lib/bunny-playback': { getBunnyPlaybackUrl: value => { events.push('sign'); return `${value}${value.includes('?') ? '&' : '?'}token=signed`; } },
    '@/lib/bunny-upload-server': { BunnyServerError, assertBunnyVideoReady: async () => {
      events.push('provider');
      if (providerError) throw new BunnyServerError(providerError, 'الفيديو غير متاح للمشاهدة حالياً');
    } },
  };
  const helper = loadTs('../src/lib/lesson-playback.ts', mocks);
  mocks['@/lib/lesson-playback'] = helper;
  return { events, helper, route: loadTs('../src/app/api/lessons/[id]/playback/route.ts', mocks).GET };
}

const request = new Request('https://academy.test/api/lessons/lesson/playback');
const params = () => ({ params: Promise.resolve({ id: LESSON }) });

test('paid playback denies anonymous, unrelated student and unrelated instructor before provider checks or signing', async () => {
  for (const user of [null, STUDENT, { id: 'other-teacher', role: 'INSTRUCTOR' }]) {
    const h = harness({ user });
    const response = await h.route(request, params());
    assert.equal(response.status, user ? 403 : 401);
    assert.equal(h.events.includes('provider'), false);
    assert.equal(h.events.includes('sign'), false);
    assert.equal(JSON.stringify(await response.json()).includes(VIDEO), false);
  }
});

test('enrolled student, course instructor, ADMIN and OWNER receive playback only after authorization', async () => {
  for (const options of [{ enrolled: true }, { user: { id: 'teacher', role: 'INSTRUCTOR' } }, { user: { id: 'admin', role: 'ADMIN' } }, { user: { id: 'owner', role: 'OWNER' } }]) {
    const h = harness(options);
    const response = await h.route(request, params());
    assert.equal(response.status, 200);
    assert.equal((await response.json()).url, `${VIDEO}?token=signed`);
    assert.equal(response.headers.get('Cache-Control'), 'private, no-store');
    assert.equal(response.headers.get('CDN-Cache-Control'), 'no-store');
    assert.match(response.headers.get('Vary'), /Cookie/);
    assert.deepEqual(h.events.slice(-2), ['provider', 'sign']);
  }
});

test('published free chapters and zero-price courses allow previews; unpublished free chapters remain protected', async () => {
  for (const options of [{ free: true }, { price: 0 }]) {
    const h = harness({ ...options, user: null });
    assert.equal((await h.route(request, params())).status, 200);
  }
  const unpublished = harness({ free: true, status: 'PENDING', user: null });
  assert.equal((await unpublished.route(request, params())).status, 401);
  assert.equal(unpublished.events.includes('sign'), false);
});

test('missing, malformed, processing and deleted videos never return playback references', async () => {
  const missing = harness({ missing: true, enrolled: true });
  assert.equal((await missing.route(request, params())).status, 404);
  const invalid = harness({ enrolled: true });
  assert.equal((await invalid.route(request, { params: Promise.resolve({ id: '../other' }) })).status, 400);
  assert.deepEqual(invalid.events, []);
  for (const providerError of [404, 409, 502]) {
    const h = harness({ enrolled: true, providerError });
    assert.equal((await h.route(request, params())).status, providerError);
    assert.equal(h.events.includes('sign'), false);
  }
});

test('old media and PDF lesson sources remain supported; executable sources are rejected', async () => {
  for (const videoUrl of ['/uploads/old.mp4', '/api/files/original.pdf', 'https://legacy.test/lesson.mp4']) {
    const h = harness({ videoUrl, enrolled: true });
    assert.equal((await h.route(request, params())).status, 200);
  }
  for (const videoUrl of ['javascript:alert(1)', 'data:text/html,<script>x</script>', '//evil.test/video.mp4', 'https://user:password@example.test/video.mp4']) {
    const h = harness({ videoUrl, enrolled: true });
    assert.equal((await h.route(request, params())).status, 422);
    assert.equal(h.events.includes('provider'), false);
  }
});

test('student and public course DTOs remove raw URLs and locked bodies without mutating lessons or PDF attachments', () => {
  const links = loadTs('../src/lib/lesson-links.ts');
  const attachment = { id: 'pdf', url: '/api/files/original.pdf' };
  const lesson = { id: LESSON, title: 'Lecture', videoUrl: VIDEO, content: 'private notes', liveRoomName: 'private-room', liveStartTime: 'tomorrow', attachments: [attachment] };
  const locked = links.protectLessonSource(lesson, false);
  assert.equal(locked.videoUrl, null);
  assert.equal(locked.content, undefined);
  assert.equal(locked.liveRoomName, undefined);
  assert.equal(locked.liveStartTime, undefined);
  assert.equal(locked.playbackUrl, `/api/lessons/${LESSON}/playback`);
  assert.equal(locked.isBunnyVideo, true);
  assert.equal(links.protectLessonSource({ id: LESSON, videoUrl: '/api/files/original.pdf' }).isBunnyVideo, false);
  const readable = links.protectLessonSource(lesson, true);
  assert.equal(readable.content, 'private notes');
  assert.deepEqual(readable.attachments, [attachment]);
  const publicCourse = links.protectCourseLessonSources({ chapters: [{ lessons: [lesson] }] });
  assert.equal(publicCourse.chapters[0].lessons[0].videoUrl, null);
  assert.equal(publicCourse.chapters[0].lessons[0].content, undefined);
  assert.equal(lesson.videoUrl, VIDEO);
  assert.equal(attachment.url, '/api/files/original.pdf');
});

test('anonymous mobile catalogue and detail responses redact paid lesson sources', async () => {
  const course = { id: 'course', status: 'PUBLISHED', chapters: [{ lessons: [{ id: LESSON, title: 'Private', videoUrl: VIDEO, content: 'private notes', liveRoomName: 'private-room' }] }] };
  const mocks = { '@/lib/db': { prisma: { course: { findMany: async () => [course], findUnique: async () => course } } } };
  const list = loadTs('../src/app/api/mobile/courses/route.ts', mocks).GET;
  const detail = loadTs('../src/app/api/mobile/courses/[id]/route.ts', mocks).GET;
  for (const response of [await list(), await detail(request, { params: Promise.resolve({ id: 'course' }) })]) {
    const json = JSON.stringify(await response.json());
    assert.equal(json.includes(VIDEO), false);
    assert.equal(json.includes('private notes'), false);
    assert.equal(json.includes('private-room'), false);
    assert.equal(json.includes('Private'), true);
  }
});

test('enrolled mobile dashboard retains enrollment and certificate metadata while removing reusable lesson sources', async t => {
  const originalSecret = process.env.NEXTAUTH_SECRET;
  process.env.NEXTAUTH_SECRET = 'dashboard-playback-unit-test-only';
  t.after(() => {
    if (originalSecret === undefined) delete process.env.NEXTAUTH_SECRET;
    else process.env.NEXTAUTH_SECRET = originalSecret;
  });
  const course = { id: 'course', chapters: [{ lessons: [{ id: LESSON, title: 'Private', videoUrl: VIDEO, content: 'private notes', liveRoomName: 'private-room' }] }] };
  const certificate = { id: 'certificate', course: { title: 'Course' } };
  const mocks = {
    '@/lib/db': { prisma: {
      enrollment: { findMany: async () => [{ id: 'enrollment', course }] },
      certificate: { findMany: async () => [certificate] },
    } },
    jsonwebtoken: { verify: () => ({ id: STUDENT.id }) },
  };
  const dashboard = loadTs('../src/app/api/mobile/dashboard/route.ts', mocks).GET;
  const response = await dashboard(new Request('https://academy.test/api/mobile/dashboard', { headers: { Authorization: 'Bearer test-token' } }));
  assert.equal(response.status, 200);
  const body = await response.json();
  assert.equal(body.enrollments[0].id, 'enrollment');
  assert.deepEqual(body.certificates, [certificate]);
  assert.equal(body.user.id, STUDENT.id);
  const lesson = body.enrollments[0].course.chapters[0].lessons[0];
  assert.equal(lesson.videoUrl, null);
  assert.equal(lesson.playbackUrl, `/api/lessons/${LESSON}/playback`);
  assert.equal(JSON.stringify(body).includes(VIDEO), false);
  assert.equal(JSON.stringify(body).includes('private notes'), false);
  assert.equal(JSON.stringify(body).includes('private-room'), false);
});

test('cookie playback rechecks current database role and rejects banned or deleted session users', async () => {
  const demoted = harness({ user: { id: STUDENT.id, role: 'ADMIN' }, bearerUser: STUDENT });
  assert.equal((await demoted.route(request, params())).status, 403);
  assert.equal(demoted.events.includes('sign'), false);
  for (const bearerUser of [{ ...STUDENT, isBanned: true }, null]) {
    const h = harness({ enrolled: true, bearerUser });
    assert.equal((await h.route(request, params())).status, 401);
    assert.equal(h.events.includes('provider'), false);
    assert.equal(h.events.includes('sign'), false);
  }
});

test('demoted course owners need enrollment; existing enrollment on unpublished courses stays valid', async () => {
  const demoted = harness({ user: { id: 'teacher', role: 'INSTRUCTOR' }, bearerUser: { id: 'teacher', role: 'STUDENT' } });
  assert.equal((await demoted.route(request, params())).status, 403);
  assert.equal(demoted.events.includes('sign'), false);
  for (const status of ['PENDING', 'REJECTED', 'UNPUBLISHED']) {
    const enrolled = harness({ status, enrolled: true });
    assert.equal((await enrolled.route(request, params())).status, 200);
    const denied = harness({ status, free: true, user: null });
    assert.equal((await denied.route(request, params())).status, 401);
    assert.equal(denied.events.includes('sign'), false);
  }
});

test('legacy sources still require authorization before any playback URL is disclosed', async () => {
  for (const videoUrl of ['/uploads/old.mp4', '/api/files/original.pdf', 'https://legacy.test/lesson.mp4']) {
    for (const user of [null, STUDENT]) {
      const h = harness({ videoUrl, user });
      const response = await h.route(request, params());
      assert.equal(response.status, user ? 403 : 401);
      assert.equal((await response.text()).includes(videoUrl), false);
      assert.equal(h.events.includes('sign'), false);
    }
  }
});

test('course iframe CSP allows only same-origin files and exact approved Bunny player domains', async () => {
  const config = loadTs('../next.config.ts').default;
  const rules = await config.headers();
  assert.deepEqual(rules.map(rule => rule.source), ['/courses/:courseId', '/courses/:courseId/learn']);
  for (const rule of rules) {
    const csp = rule.headers.find(header => header.key === 'Content-Security-Policy').value;
    assert.equal(csp, "frame-src 'self' https://iframe.mediadelivery.net https://player.mediadelivery.net;");
    assert.equal(csp.includes('*'), false);
  }
});

test('mobile bearer playback verifies the real secret, algorithm, expiration and current database role', async t => {
  const original = process.env.NEXTAUTH_SECRET;
  process.env.NEXTAUTH_SECRET = 'test-only-existing-session-secret';
  t.after(() => { if (original === undefined) delete process.env.NEXTAUTH_SECRET; else process.env.NEXTAUTH_SECRET = original; });
  const bearer = token => new Request(request.url, { headers: { Authorization: `Bearer ${token}` } });
  const token = jwt.sign({ id: STUDENT.id, role: 'ADMIN' }, process.env.NEXTAUTH_SECRET, { expiresIn: '1h' });
  const authorized = harness({ user: null, enrolled: true });
  assert.equal((await authorized.route(bearer(token), params())).status, 200);
  const unrelated = harness({ user: null });
  assert.equal((await unrelated.route(bearer(token), params())).status, 403);
  assert.equal(unrelated.events.includes('sign'), false);
  const banned = harness({ user: null, enrolled: true, bearerUser: { ...STUDENT, isBanned: true } });
  assert.equal((await banned.route(bearer(token), params())).status, 401);
  for (const invalidToken of [
    jwt.sign({ id: STUDENT.id }, 'different-secret', { expiresIn: '1h' }),
    jwt.sign({ id: STUDENT.id }, process.env.NEXTAUTH_SECRET, { expiresIn: -1 }),
    jwt.sign({ id: STUDENT.id }, process.env.NEXTAUTH_SECRET, { algorithm: 'HS384', expiresIn: '1h' }),
  ]) {
    const h = harness({ user: null, enrolled: true });
    assert.equal((await h.route(bearer(invalidToken), params())).status, 401);
    assert.equal(h.events.includes('sign'), false);
  }
  delete process.env.NEXTAUTH_SECRET;
  assert.equal((await harness({ user: null, enrolled: true }).route(bearer(token), params())).status, 401);
});
