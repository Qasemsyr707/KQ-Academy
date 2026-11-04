const assert = require('node:assert/strict');
const test = require('node:test');
const { loadTs } = require('./load-ts.cjs');

const VIDEO = '11111111-2222-3333-4444-555555555555';
const URL = `https://iframe.mediadelivery.net/embed/123/${VIDEO}`;
const USER = { id: 'instructor-1', role: 'INSTRUCTOR' };

function harness(t, { user = USER, owner = USER.id, status = 4, providerStatus = 200 } = {}) {
  const oldLibrary = process.env.BUNNY_LIBRARY_ID;
  const oldKey = process.env.BUNNY_API_KEY;
  process.env.BUNNY_LIBRARY_ID = '123';
  process.env.BUNNY_API_KEY = 'test-only-key';
  t.after(() => {
    if (oldLibrary === undefined) delete process.env.BUNNY_LIBRARY_ID;
    else process.env.BUNNY_LIBRARY_ID = oldLibrary;
    if (oldKey === undefined) delete process.env.BUNNY_API_KEY;
    else process.env.BUNNY_API_KEY = oldKey;
  });
  const writes = [];
  const requests = [];
  const prisma = {
    chapter: { findUnique: async () => owner ? { course: { instructorId: owner } } : null },
    course: {
      findUnique: async () => owner ? { instructorId: owner } : null,
      update: async args => { writes.push({ type: 'course', ...args }); return args.data; },
    },
    lesson: {
      count: async () => 0,
      create: async args => { writes.push({ type: 'lesson', ...args }); return { id: 'lesson-1', ...args.data }; },
    },
    short: { create: async args => { writes.push({ type: 'short', ...args }); return args.data; } },
  };
  t.mock.method(globalThis, 'fetch', async (url, config) => {
    requests.push({ url, config });
    assert.equal(url, `https://video.bunnycdn.com/library/123/videos/${VIDEO}`);
    return Response.json({ guid: VIDEO, videoLibraryId: 123, status }, { status: providerStatus });
  });
  const mocks = {
    '@/lib/db': { prisma },
    '@/lib/auth': { authOptions: {} },
    'next-auth': { getServerSession: async () => user ? { user } : null },
    '@/lib/rbac': { requireRoleApi: async () => ({ authorized: true, session: { user } }) },
  };
  // Share the real helper instance so instanceof keeps its production behavior.
  const helper = loadTs('../src/lib/bunny-upload-server.ts', mocks);
  mocks['@/lib/bunny-upload-server'] = helper;
  return {
    writes, requests,
    lesson: loadTs('../src/app/api/lessons/route.ts', mocks).POST,
    preview: loadTs('../src/app/api/courses/[id]/route.ts', mocks).PUT,
    short: loadTs('../src/app/api/instructor/shorts/route.ts', mocks).POST,
  };
}

const request = body => new Request('https://academy.test/api/save', {
  method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
});
const lesson = extra => ({ title: 'Lecture', chapterId: 'chapter-1', videoUrl: URL, ...extra });

test('no Lesson is written for uploading, processing, partially playable, or failed Bunny videos', async t => {
  for (const status of [0, 1, 2, 3, 5, 6, 7, 8]) {
    await t.test(`Bunny status ${status}`, async child => {
      const h = harness(child, { status });
      const response = await h.lesson(request(lesson()));
      assert.equal(response.status, 409);
      assert.equal(h.writes.length, 0);
      assert.equal(h.requests.length, 1);
    });
  }
});

test('Ready Bunny video is verified server-side before saving the Lesson', async t => {
  const h = harness(t);
  assert.equal((await h.lesson(request(lesson()))).status, 201);
  assert.equal(h.requests.length, 1);
  assert.equal(h.requests[0].config.cache, 'no-store');
  assert.equal(h.requests[0].config.headers.AccessKey, 'test-only-key');
  assert.equal(h.writes.length, 1);
  assert.equal(h.writes[0].data.videoUrl, URL);
});

test('an unauthorized instructor, student, or absent session cannot save a Lesson', async t => {
  for (const config of [{ owner: 'other-instructor' }, { user: { id: 'student', role: 'STUDENT' } }, { user: null }]) {
    await t.test(JSON.stringify(config), async child => {
      const h = harness(child, config);
      assert.ok([401, 403].includes((await h.lesson(request(lesson()))).status));
      assert.equal(h.writes.length, 0);
      assert.equal(h.requests.length, 0);
    });
  }
});

test('provider outage or missing video cannot publish a ready Lesson', async t => {
  for (const providerStatus of [404, 503]) {
    await t.test(String(providerStatus), async child => {
      const h = harness(child, { providerStatus });
      assert.ok([404, 502].includes((await h.lesson(request(lesson()))).status));
      assert.equal(h.writes.length, 0);
    });
  }
});

test('a manually pasted malformed or foreign-library Bunny link is rejected before any write', async t => {
  const h = harness(t);
  for (const videoUrl of [URL.replace('/123/', '/999/'), URL.replace('/embed/', '/other/'), URL.replace('https:', 'http:')]) {
    assert.equal((await h.lesson(request(lesson({ videoUrl })))).status, 400);
  }
  assert.equal(h.requests.length, 0);
  assert.equal(h.writes.length, 0);
});

test('live Lessons and existing non-video attachments keep their save behavior', async t => {
  const h = harness(t);
  assert.equal((await h.lesson(request(lesson({ isLive: true, videoUrl: null })))).status, 201);
  assert.equal((await h.lesson(request(lesson({ videoUrl: '/uploads/handout.pdf' })))).status, 201);
  assert.equal(h.requests.length, 0);
  assert.equal(h.writes[0].data.videoUrl, null);
  assert.equal(h.writes[1].data.videoUrl, '/uploads/handout.pdf');
});

test('processing course preview and short cannot be published by bypassing the upload UI', async t => {
  const h = harness(t, { status: 2 });
  assert.equal((await h.preview(request({ previewVideoUrl: URL }), { params: Promise.resolve({ id: 'course-1' }) })).status, 409);
  assert.equal((await h.short(request({ title: 'Short', videoUrl: URL, courseId: 'course-1' }))).status, 409);
  assert.equal(h.writes.length, 0);
});

test('Ready previews and shorts are accepted, with course ownership checked before Bunny', async t => {
  const h = harness(t);
  assert.equal((await h.preview(request({ previewVideoUrl: URL }), { params: Promise.resolve({ id: 'course-1' }) })).status, 200);
  assert.equal((await h.short(request({ title: 'Short', videoUrl: URL, courseId: 'course-1' }))).status, 200);
  assert.deepEqual(h.writes.map(write => write.type), ['course', 'short']);
});

test('instructor cannot attach a short to another instructor course', async t => {
  const h = harness(t, { owner: 'other-instructor' });
  assert.equal((await h.short(request({ title: 'Short', videoUrl: URL, courseId: 'course-1' }))).status, 403);
  assert.equal(h.requests.length, 0);
  assert.equal(h.writes.length, 0);
});
