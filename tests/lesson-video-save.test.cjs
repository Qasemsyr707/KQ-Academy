/* eslint-disable @typescript-eslint/no-require-imports */
const assert = require('node:assert/strict');
const test = require('node:test');
const { loadTs } = require('./load-ts.cjs');

const VIDEO = '11111111-2222-3333-4444-555555555555';
const OTHER_VIDEO = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';
const OPERATION = '12345678-1234-4123-8123-123456789abc';
const BUNNY_URL = `https://player.mediadelivery.net/embed/123/${VIDEO}`;
const STORED_URL = `https://iframe.mediadelivery.net/embed/123/${VIDEO}`;
const USER = { id: 'teacher-1', role: 'INSTRUCTOR' };
const EXISTING = {
  id: 'legacy-lesson', chapterId: 'chapter-1', title: 'Original title',
  videoUrl: 'https://legacy.video.test/existing.mp4?keep=exact',
  order: 8, isLive: false, liveRoomName: null, liveStartTime: null,
  content: 'Existing lesson content', attachments: [{ id: 'pdf-1', url: '/api/files/original-pdf' }],
};

function harness(t, { user = USER, owner = USER.id, videoStatus = 4,
  providerStatus = 200, networkError = false, wrongMetadata = false,
  existing = EXISTING, failWrite = false } = {}) {
  const oldValues = { BUNNY_LIBRARY_ID: process.env.BUNNY_LIBRARY_ID, BUNNY_API_KEY: process.env.BUNNY_API_KEY };
  process.env.BUNNY_LIBRARY_ID = '123';
  process.env.BUNNY_API_KEY = 'test-management-key';
  t.after(() => {
    for (const [key, value] of Object.entries(oldValues)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  });
  const rows = new Map(existing ? [[existing.id, structuredClone(existing)]] : []);
  const writes = [];
  const requests = [];
  let inserted = 0;
  const prisma = {
    chapter: { findUnique: async () => owner ? { course: { instructorId: owner } } : null },
    lesson: {
      findUnique: async args => {
        const row = rows.get(args.where.id);
        return row ? { ...row, ...(args.include ? { chapter: { course: { instructorId: owner } } } : {}) } : null;
      },
      count: async ({ where }) => [...rows.values()].filter(row => row.chapterId === where.chapterId).length,
      create: async args => {
        await Promise.resolve();
        if (failWrite) throw new Error('INTERNAL_DATABASE_DETAIL');
        const id = args.data.id || `created-${inserted + 1}`;
        if (rows.has(id)) throw Object.assign(new Error('duplicate primary key'), { code: 'P2002' });
        const row = { id, ...args.data };
        rows.set(id, row);
        inserted += 1;
        writes.push({ action: 'create', ...args });
        return row;
      },
      update: async args => {
        if (failWrite) throw new Error('INTERNAL_DATABASE_DETAIL');
        const row = { ...rows.get(args.where.id), ...args.data };
        rows.set(row.id, row);
        writes.push({ action: 'update', ...args });
        return row;
      },
    },
  };
  t.mock.method(globalThis, 'fetch', async (url, config) => {
    requests.push({ url, config });
    // A link is verified through a read-only metadata call. These assertions
    // deliberately fail on a create-video, transfer, or arbitrary upstream URL.
    assert.match(url, /^https:\/\/video\.bunnycdn\.com\/library\/123\/videos\/[0-9a-f-]{36}$/);
    assert.ok(!config.method || config.method === 'GET');
    assert.equal(config.cache, 'no-store');
    if (networkError) throw new Error('INTERNAL_PROVIDER_DETAIL');
    const guid = String(url).split('/').at(-1);
    return Response.json({ guid: wrongMetadata ? OTHER_VIDEO : guid, videoLibraryId: 123, status: videoStatus },
      { status: providerStatus });
  });
  const mocks = {
    '@/lib/db': { prisma },
    '@/lib/auth': { authOptions: {} },
    'next-auth': { getServerSession: async () => user ? { user } : null },
  };
  const helper = loadTs('../src/lib/bunny-upload-server.ts', mocks);
  mocks['@/lib/bunny-upload-server'] = helper;
  return { rows, writes, requests,
    create: loadTs('../src/app/api/lessons/route.ts', mocks).POST,
    update: loadTs('../src/app/api/lessons/[id]/route.ts', mocks).PUT,
  };
}

const request = (body, method = 'POST') => new Request('https://academy.test/api/lessons', {
  method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
});
const createBody = extra => ({ title: 'A lesson', chapterId: 'chapter-1', videoSource: 'url', videoUrl: BUNNY_URL, ...extra });
const updateContext = id => ({ params: Promise.resolve({ id: id || EXISTING.id }) });

test('a linked official player URL saves a canonical reference using only a metadata GET', async t => {
  const h = harness(t);
  const res = await h.create(request(createBody()));
  assert.equal(res.status, 201);
  assert.equal((await res.json()).message, 'تم ربط الفيديو بالدرس بنجاح');
  assert.equal(h.writes.length, 1);
  assert.equal(h.writes[0].data.videoUrl, STORED_URL);
  assert.equal(h.requests.length, 1);
  assert.equal(h.requests[0].config.headers.AccessKey, 'test-management-key');
  assert.ok(!Object.hasOwn(h.writes[0].data, 'videoSource'));
});

test('official iframe code saves only safe src parameters, without HTML or pasted credentials', async t => {
  const h = harness(t);
  const embed = `<div style="position:relative"><iframe src="${BUNNY_URL}?autoplay=false&amp;preload=1&amp;t=1h20m45s&amp;captions=ar-auto&amp;lang=ar&amp;nativeHls=auto&amp;token=old-secret&amp;expires=12&amp;redirect=https://evil.test" onload="alert(1)"></iframe></div>`;
  const res = await h.create(request(createBody({ videoUrl: embed })));
  assert.equal(res.status, 201);
  const stored = new URL(h.writes[0].data.videoUrl);
  assert.equal(stored.origin, 'https://iframe.mediadelivery.net');
  assert.deepEqual(Object.fromEntries(stored.searchParams), {
    autoplay: 'false', preload: '1', t: '1h20m45s', captions: 'ar-auto', lang: 'ar', nativeHls: 'auto',
  });
  assert.doesNotMatch(h.writes[0].data.videoUrl, /<|onload|token|expires|redirect|old-secret/);
  assert.equal(h.requests.length, 1);
});

test('empty, external, deceptive, malformed, and foreign-library sources never write or call Bunny', async t => {
  const h = harness(t);
  const invalid = ['', '   ', null, 42, 'javascript:alert(1)', 'https://external.test/video.mp4',
    BUNNY_URL.replace('/123/', '/999/'), BUNNY_URL.replace('https:', 'http:'),
    BUNNY_URL.replace('player.mediadelivery.net', 'player.mediadelivery.net.evil.test'),
    BUNNY_URL.replace('player.mediadelivery.net', 'player.mediadelivery.net@evil.test'),
    BUNNY_URL.replace('/embed/', '/unknown/'), BUNNY_URL.replace(VIDEO, 'invalid-video'),
    `<iframe src="javascript:alert(1)"></iframe>`,
    `<iframe src="${BUNNY_URL}" srcdoc="<script>alert(1)</script>"></iframe>`,
    `<iframe src="${BUNNY_URL}"></iframe><iframe src="${BUNNY_URL}"></iframe>`,
    `<iframe src="${BUNNY_URL}" src="https://evil.test"></iframe>`];
  for (const videoUrl of invalid) {
    const response = await h.create(request(createBody({ videoUrl })));
    assert.equal(response.status, 400, String(videoUrl));
  }
  assert.equal(h.writes.length, 0);
  assert.equal(h.requests.length, 0);
});

test('missing, unready, failed, unavailable, and mismatched videos cannot create a lesson', async t => {
  for (const [config, expected] of [
    [{ providerStatus: 404 }, 404], [{ videoStatus: 0 }, 409], [{ videoStatus: 2 }, 409],
    [{ videoStatus: 5 }, 409], [{ providerStatus: 503 }, 502], [{ networkError: true }, 502],
    [{ wrongMetadata: true }, 502],
  ]) {
    await t.test(JSON.stringify(config), async child => {
      const h = harness(child, config);
      const response = await h.create(request(createBody()));
      assert.equal(response.status, expected);
      assert.doesNotMatch(JSON.stringify(await response.json()), /INTERNAL_/);
      assert.equal(h.writes.length, 0);
    });
  }
});

test('role and ownership are checked before create or edit reaches Bunny', async t => {
  for (const [config, expected] of [
    [{ user: null }, 401], [{ user: { id: 'student-1', role: 'STUDENT' } }, 401],
    [{ owner: 'another-teacher' }, 403],
  ]) {
    await t.test(JSON.stringify(config), async child => {
      const h = harness(child, config);
      assert.equal((await h.create(request(createBody()))).status, expected);
      assert.equal((await h.update(request({ title: 'Changed', videoSource: 'url', videoUrl: BUNNY_URL }, 'PUT'), updateContext())).status, expected);
      assert.equal(h.requests.length, 0);
      assert.equal(h.writes.length, 0);
    });
  }
});

test('title-only edits preserve the exact legacy video and all attachments without contacting Bunny', async t => {
  const h = harness(t);
  const response = await h.update(request({ title: 'Renamed lesson' }, 'PUT'), updateContext());
  assert.equal(response.status, 200);
  assert.deepEqual(h.writes[0].data, { title: 'Renamed lesson' });
  assert.equal(h.rows.get(EXISTING.id).videoUrl, EXISTING.videoUrl);
  assert.deepEqual(h.rows.get(EXISTING.id).attachments, EXISTING.attachments);
  assert.equal(h.requests.length, 0);
});

test('a saved lesson can replace its source with either a ready link or a completed upload reference', async t => {
  const h = harness(t);
  for (const [videoSource, videoUrl] of [['url', BUNNY_URL], ['file', STORED_URL.replace(VIDEO, OTHER_VIDEO)]]) {
    const response = await h.update(request({ title: 'Changed source', videoSource, videoUrl }, 'PUT'), updateContext());
    assert.equal(response.status, 200);
    assert.equal(h.rows.get(EXISTING.id).videoUrl, videoUrl.replace('player.', 'iframe.'));
  }
  assert.equal(h.requests.length, 2);
  assert.equal(h.rows.get(EXISTING.id).chapterId, EXISTING.chapterId);
  assert.equal(h.rows.get(EXISTING.id).order, EXISTING.order);
  assert.deepEqual(h.rows.get(EXISTING.id).attachments, EXISTING.attachments);
});

test('edit failure keeps the previous video, and unrelated lesson fields cannot be overwritten', async t => {
  const h = harness(t);
  for (const invalid of [{ videoSource: 'url' }, { videoUrl: '' }, { videoSource: 'url', videoUrl: 'https://evil.test/video' }]) {
    assert.equal((await h.update(request({ title: 'Changed', ...invalid }, 'PUT'), updateContext())).status, 400);
  }
  assert.equal(h.rows.get(EXISTING.id).videoUrl, EXISTING.videoUrl);
  assert.equal(h.writes.length, 0);
  const response = await h.update(request({ title: 'Allowed title', chapterId: 'foreign-chapter', order: -50,
    isLive: true, liveRoomName: 'injected-room', content: 'replace-content', attachments: [] }, 'PUT'), updateContext());
  assert.equal(response.status, 200);
  assert.deepEqual(h.writes[0].data, { title: 'Allowed title' });
  assert.deepEqual(h.rows.get(EXISTING.id), { ...EXISTING, title: 'Allowed title' });
});

test('an unready replacement or live lesson never loses its existing source', async t => {
  for (const [config, expected] of [[{ videoStatus: 2 }, 409], [{ existing: { ...EXISTING, isLive: true } }, 400]]) {
    await t.test(JSON.stringify(config), async child => {
      const h = harness(child, config);
      const response = await h.update(request({ title: 'Changed', videoSource: 'url', videoUrl: BUNNY_URL }, 'PUT'), updateContext());
      assert.equal(response.status, expected);
      assert.equal(h.rows.get(EXISTING.id).videoUrl, EXISTING.videoUrl);
      assert.equal(h.writes.length, 0);
    });
  }
});

test('retrying a create after a lost success response returns the same lesson without another lookup or write', async t => {
  const h = harness(t);
  const body = createBody({ operationId: OPERATION });
  await h.create(request(body)); // The browser can lose this response.
  const response = await h.create(request(body));
  assert.equal(response.status, 201);
  const lesson = (await response.json()).lesson;
  assert.equal(h.writes.length, 1);
  assert.equal(lesson.id, h.writes[0].data.id);
  assert.equal(h.requests.length, 1);
  assert.equal(h.rows.size, 2); // Original lesson plus exactly one new lesson.
});

test('concurrent create retries share a database primary key and create exactly one lesson', async t => {
  const h = harness(t);
  const body = createBody({ operationId: OPERATION });
  const responses = await Promise.all([h.create(request(body)), h.create(request(body))]);
  assert.deepEqual(responses.map(response => response.status), [201, 201]);
  const lessons = await Promise.all(responses.map(async response => (await response.json()).lesson));
  assert.equal(lessons[0].id, lessons[1].id);
  assert.equal(h.writes.length, 1);
  assert.equal(h.rows.size, 2);
});

test('reusing an operation for different lesson content is rejected instead of duplicating or changing it', async t => {
  const h = harness(t);
  const body = createBody({ operationId: OPERATION });
  assert.equal((await h.create(request(body))).status, 201);
  for (const extra of [{ title: 'Different title' }, { chapterId: 'chapter-2' }, { videoUrl: BUNNY_URL.replace(VIDEO, OTHER_VIDEO) }]) {
    assert.equal((await h.create(request({ ...body, ...extra }))).status, 409);
  }
  assert.equal(h.writes.length, 1);
  assert.equal(h.requests.length, 1);
});

test('database failures return a safe failure response and cannot be mistaken for a saved lesson', async t => {
  const h = harness(t, { failWrite: true });
  t.mock.method(console, 'error', () => {});
  for (const response of [await h.create(request(createBody())),
    await h.update(request({ title: 'Rename' }, 'PUT'), updateContext())]) {
    assert.equal(response.status, 500);
    const body = await response.json();
    assert.ok(body.error);
    assert.equal(body.lesson, undefined);
    assert.doesNotMatch(JSON.stringify(body), /INTERNAL_DATABASE_DETAIL/);
  }
  assert.equal(h.writes.length, 0);
  assert.equal(h.rows.get(EXISTING.id).title, EXISTING.title);
});
