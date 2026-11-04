const assert = require('node:assert/strict');
const { createHash } = require('node:crypto');
const { mkdtemp, rm } = require('node:fs/promises');
const path = require('node:path');
const os = require('node:os');
const test = require('node:test');
const { loadTs } = require('./load-ts.cjs');

const VIDEO = '11111111-2222-3333-4444-555555555555';
const OTHER = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';
const LIBRARY = '1234';
const KEY = 'test-only-bunny-key';
const NOW = 1793491200;
const USER = { id: 'instructor-1', role: 'INSTRUCTOR' };
const SCOPE = { operationId: '11111111-1111-4111-8111-111111111111', courseId: 'course-a', purpose: 'lesson' };

async function harness(t, { user = USER, owner = USER.id, responder = async () => { throw Error('Unexpected Bunny request'); } } = {}) {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'kq-bunny-test-'));
  const old = Object.fromEntries(['BUNNY_LIBRARY_ID', 'BUNNY_API_KEY', 'BUNNY_UPLOAD_STATE_DIR'].map(key => [key, process.env[key]]));
  process.env.BUNNY_LIBRARY_ID = LIBRARY;
  process.env.BUNNY_API_KEY = KEY;
  process.env.BUNNY_UPLOAD_STATE_DIR = directory;
  t.after(async () => {
    for (const [key, value] of Object.entries(old)) {
      if (value === undefined) delete process.env[key]; else process.env[key] = value;
    }
    await rm(directory, { recursive: true, force: true });
  });
  t.mock.method(Date, 'now', () => NOW * 1000);
  const calls = [];
  t.mock.method(globalThis, 'fetch', async (...args) => { calls.push(args); return responder(...args); });
  const mocks = {
    'next-auth': { getServerSession: async () => user ? { user } : null },
    '@/lib/auth': { authOptions: {} },
    '@/lib/db': { prisma: { course: { findUnique: async () => owner === null ? null : { instructorId: owner } } } },
  };
  const helpers = loadTs('../src/lib/bunny-upload-server.ts', mocks);
  return { helpers, calls,
    reloadCreate: () => loadTs('../src/app/api/bunny/create-video/route.ts', mocks).POST,
    create: loadTs('../src/app/api/bunny/create-video/route.ts', mocks).POST,
    refresh: loadTs('../src/app/api/bunny/refresh-upload/route.ts', mocks).POST,
    status: loadTs('../src/app/api/bunny/upload-status/route.ts', mocks).POST,
    proof: (overrides = {}, userId = USER.id, now = NOW) => helpers.createResumeToken(userId, LIBRARY, VIDEO, { ...SCOPE, ...overrides }, KEY, now),
  };
}

const request = body => new Request('https://academy.test/api/bunny/upload', {
  method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
});
const pending = (video = {}) => Response.json({ guid: VIDEO, videoLibraryId: Number(LIBRARY), status: 0, ...video });
const payload = (proof, extra = {}) => ({ ...SCOPE, videoId: VIDEO, resumeToken: proof, ...extra });

test('signature has exact video/library and a 24 hour Unix-seconds lifetime; no API secret is exposed', async t => {
  const { helpers, proof } = await harness(t);
  const credentials = helpers.signBunnyUpload(LIBRARY, KEY, VIDEO, proof(), SCOPE.operationId, NOW);
  assert.equal(credentials.expireTime, NOW + 86400);
  assert.equal(credentials.signature, createHash('sha256').update(`${LIBRARY}${KEY}${NOW + 86400}${VIDEO}`).digest('hex'));
  assert.equal(credentials.videoId, VIDEO);
  assert.equal(credentials.operationId, SCOPE.operationId);
  assert.equal(JSON.stringify(credentials).includes(KEY), false);
});

test('proof binds user, video, library, course, purpose and operation, and rejects expiry and tampering', async t => {
  const { helpers, proof } = await harness(t);
  const token = proof();
  const verify = (scope = SCOPE, user = USER.id, lib = LIBRARY, video = VIDEO, key = KEY, now = NOW) => helpers.verifyResumeToken(token, user, lib, video, scope, key, now);
  assert.equal(verify(), true);
  for (const scope of [{ ...SCOPE, courseId: 'other' }, { ...SCOPE, purpose: 'preview' }, { ...SCOPE, operationId: OTHER }]) assert.equal(verify(scope), false);
  assert.equal(verify(SCOPE, 'other'), false);
  assert.equal(verify(SCOPE, USER.id, '999'), false);
  assert.equal(verify(SCOPE, USER.id, LIBRARY, OTHER), false);
  assert.equal(verify(SCOPE, USER.id, LIBRARY, VIDEO, 'wrong-key'), false);
  assert.equal(verify(SCOPE, USER.id, LIBRARY, VIDEO, KEY, NOW + 7 * 86400), false);
  for (const invalid of [undefined, '', 'malformed', token + '.extra', token.slice(0, -1) + '!', 'a'.repeat(5000)]) assert.equal(helpers.verifyResumeToken(invalid, USER.id, LIBRARY, VIDEO, SCOPE, KEY, NOW), false);
});

test('create is private and idempotent across repeated requests: only one upstream video POST', async t => {
  const { create, reloadCreate, calls, helpers } = await harness(t, { responder: async () => pending() });
  const first = await create(request({ ...SCOPE, title: ' Lesson ' }));
  assert.equal(first.status, 200);
  assert.equal(first.headers.get('cache-control'), 'private, no-store');
  const data = await first.json();
  assert.equal(data.expireTime, NOW + 86400);
  assert.equal(helpers.verifyResumeToken(data.resumeToken, USER.id, LIBRARY, VIDEO, SCOPE, KEY, NOW), true);
  const second = await reloadCreate()(request({ ...SCOPE, title: 'Lesson' }));
  assert.equal(second.status, 200);
  assert.equal((await second.json()).videoId, data.videoId);
  assert.deepEqual(calls.map(([, config]) => config.method || 'GET'), ['POST', 'GET']);
  assert.deepEqual(JSON.parse(calls[0][1].body), { title: 'Lesson' });
  assert.equal(calls[0][1].cache, 'no-store');
});

test('anonymous, student, missing ID and an unauthorized instructor cannot create, refresh or inspect', async t => {
  for (const options of [{ user: null }, { user: { id: 'student', role: 'STUDENT' } }, { user: { role: 'INSTRUCTOR' } }, { owner: 'another-instructor' }]) {
    await t.test(JSON.stringify(options), async child => {
      const { create, refresh, status, calls, proof } = await harness(child, options);
      const expected = options.owner ? 403 : 401;
      assert.equal((await create(request({ ...SCOPE, title: 'Lesson' }))).status, expected);
      assert.equal((await refresh(request(payload(proof())))).status, expected);
      assert.equal((await status(request(payload(proof())))).status, expected);
      assert.equal(calls.length, 0);
    });
  }
});

test('current ownership is checked even with a valid proof, while administrators can manage courses', async t => {
  for (const role of ['ADMIN', 'OWNER']) {
    await t.test(role, async child => {
      const { create } = await harness(child, { user: { id: 'admin', role }, owner: 'other', responder: async () => pending() });
      assert.equal((await create(request({ ...SCOPE, title: 'Lesson' }))).status, 200);
    });
  }
});

test('malformed JSON, scope, course and title fail before Bunny', async t => {
  const { create, calls } = await harness(t);
  const invalid = [null, {}, { ...SCOPE, title: ' ' }, { ...SCOPE, title: [] }, { ...SCOPE, title: 'a'.repeat(1001) },
    { ...SCOPE, title: 'Lesson', operationId: '../../victim' }, { ...SCOPE, title: 'Lesson', courseId: undefined },
    { ...SCOPE, title: 'Lesson', courseId: '' }, { ...SCOPE, title: 'Lesson', purpose: 'other' },
    { ...SCOPE, title: 'Lesson', purpose: ['lesson'] }];
  for (const body of invalid) assert.equal((await create(request(body))).status, 400);
  assert.equal((await create(new Request('https://academy.test/api/bunny', { method: 'POST', body: '{' }))).status, 400);
  assert.equal(calls.length, 0);
});

test('optional unlinked shorts are scoped, but linked shorts must pass course ownership', async t => {
  const { create, calls } = await harness(t, { owner: 'other', responder: async () => pending() });
  assert.equal((await create(request({ operationId: SCOPE.operationId, purpose: 'short', title: 'Short' }))).status, 200);
  assert.equal((await create(request({ ...SCOPE, purpose: 'short', title: 'Short' }))).status, 403);
  assert.equal(calls.length, 1);
});

test('refresh signs the SAME pending video, preserves proof expiry and contacts Bunny with GET only', async t => {
  const { refresh, calls, proof } = await harness(t, { responder: async () => pending() });
  const token = proof({}, USER.id, NOW - 2 * 86400);
  const response = await refresh(request(payload(token)));
  assert.equal(response.status, 200);
  const data = await response.json();
  assert.equal(data.videoId, VIDEO);
  assert.equal(data.resumeToken, token);
  assert.equal(data.expireTime, NOW + 86400);
  assert.equal(data.state, 'uploading');
  assert.equal(calls.length, 1);
  assert.equal(calls[0][0], `https://video.bunnycdn.com/library/${LIBRARY}/videos/${VIDEO}`);
  assert.equal(calls[0][1].cache, 'no-store');
});

test('refresh rejects arbitrary, expired and cross-course proofs before contacting Bunny', async t => {
  const { refresh, calls, proof } = await harness(t);
  for (const token of [undefined, 'invalid', proof({}, 'other'), proof({ courseId: 'other' }), proof({ purpose: 'preview' }), proof({ operationId: OTHER }), proof({}, USER.id, NOW - 7 * 86400)]) {
    assert.equal((await refresh(request(payload(token)))).status, 403);
  }
  assert.equal(calls.length, 0);
});

test('processing, ready and failed refreshes return state WITHOUT issuing upload credentials or creating videos', async t => {
  for (const [status, state] of [[1, 'processing'], [2, 'processing'], [3, 'processing'], [4, 'ready'], [5, 'failed'], [6, 'failed'], [7, 'processing'], [8, 'processing']]) {
    await t.test(`Bunny status ${status}`, async child => {
      const { refresh, proof, calls } = await harness(child, { responder: async () => pending({ status }) });
      const response = await refresh(request(payload(proof())));
      assert.equal(response.status, 200);
      const data = await response.json();
      assert.equal(data.state, state);
      assert.equal(data.signature, undefined);
      assert.equal(Boolean(data.embedUrl), state === 'ready');
      assert.equal(calls.length, 1);
    });
  }
});

test('status never returns an embed until finished and rejects deleted or mismatched videos', async t => {
  for (const video of [{ status: 0 }, { status: 3 }, { status: 4 }, { guid: OTHER }, { videoLibraryId: 999 }]) {
    await t.test(JSON.stringify(video), async child => {
      const { status, proof } = await harness(child, { responder: async () => pending(video) });
      const response = await status(request(payload(proof())));
      if (video.guid || video.videoLibraryId) assert.equal(response.status, 502);
      else {
        assert.equal(response.status, 200);
        assert.equal(Boolean((await response.json()).embedUrl), video.status === 4);
      }
    });
  }
  await t.test('deleted video', async child => {
    const { refresh, proof, calls } = await harness(child, { responder: async () => new Response('', { status: 404 }) });
    assert.equal((await refresh(request(payload(proof())))).status, 404);
    assert.equal(calls.length, 1);
  });
});

test('uncertain provider create outcome cannot cause a second POST even across fresh handler instances', async t => {
  const { create, reloadCreate, calls } = await harness(t, { responder: async () => { throw Error('connection lost after POST'); } });
  assert.equal((await create(request({ ...SCOPE, title: 'Lesson' }))).status, 500);
  assert.equal((await reloadCreate()(request({ ...SCOPE, title: 'Lesson' }))).status, 409);
  assert.equal(calls.length, 1);
});

test('an existing operation cannot be repurposed to another title/course', async t => {
  const { create, calls } = await harness(t, { responder: async () => pending() });
  assert.equal((await create(request({ ...SCOPE, title: 'Lesson' }))).status, 200);
  assert.equal((await create(request({ ...SCOPE, title: 'Different' }))).status, 409);
  assert.equal((await create(request({ ...SCOPE, courseId: 'another', title: 'Lesson' }))).status, 409);
  assert.equal(calls.length, 1);
});

test('concurrent identical operations have one exclusive upstream POST and retain the same ID', async t => {
  let release;
  let started;
  const signal = new Promise(resolve => { started = resolve; });
  const held = new Promise(resolve => { release = resolve; });
  const { create, calls } = await harness(t, { responder: async (_url, options) => {
    if (options.method === 'POST') { started(); await held; }
    return pending();
  } });
  const first = create(request({ ...SCOPE, title: 'Lesson' }));
  await signal;
  const competing = await create(request({ ...SCOPE, title: 'Lesson' }));
  assert.equal(competing.status, 409);
  release();
  assert.equal((await first).status, 200);
  assert.equal((await create(request({ ...SCOPE, title: 'Lesson' }))).status, 200);
  assert.equal(calls.filter(([, config]) => config.method === 'POST').length, 1);
});

test('server save guard validates Bunny readiness, library and URL before permitting an embed write', async t => {
  const { helpers, calls } = await harness(t, { responder: async () => pending({ status: 4 }) });
  await helpers.assertBunnyVideoReady(`https://iframe.mediadelivery.net/embed/${LIBRARY}/${VIDEO}`);
  await helpers.assertBunnyVideoReady('https://external.test/video.mp4');
  assert.equal(calls.length, 1);
  for (const url of [`https://iframe.mediadelivery.net/embed/999/${VIDEO}`, 'https://iframe.mediadelivery.net/embed/1234/bad',
    `http://iframe.mediadelivery.net/embed/${LIBRARY}/${VIDEO}`, `https://iframe.mediadelivery.net./embed/${LIBRARY}/${VIDEO}`,
    `https://user:password@iframe.mediadelivery.net/embed/${LIBRARY}/${VIDEO}`, `https://iframe.mediadelivery.net:444/embed/${LIBRARY}/${VIDEO}`]) {
    await assert.rejects(helpers.assertBunnyVideoReady(url), error => error.status === 400);
  }
});

test('server save guard refuses an uploaded but processing video', async t => {
  const { helpers } = await harness(t, { responder: async () => pending({ status: 3 }) });
  await assert.rejects(helpers.assertBunnyVideoReady(`https://iframe.mediadelivery.net/embed/${LIBRARY}/${VIDEO}`), error => error.status === 409);
});

test('POSIX operation claims must reach durable storage before any upstream video creation', async () => {
  const platform = Object.getOwnPropertyDescriptor(process, 'platform');
  Object.defineProperty(process, 'platform', { value: 'linux', configurable: true });
  try {
    for (const failSync of [true, false]) {
      const events = [];
      const { createOrGetBunnyOperation } = loadTs('../src/lib/bunny-upload-operations.ts', {
        'node:fs/promises': {
          mkdir: async () => {},
          open: async (filename, flags) => ({
            writeFile: async () => { events.push('write'); },
            sync: async () => {
              if (flags === 'r') {
                events.push('directory-sync');
                if (failSync) throw Object.assign(Error('disk I/O failure'), { code: 'EIO' });
              } else events.push('file-sync');
            },
            close: async () => {},
          }),
          rename: async () => { events.push('rename'); },
        },
      });
      const operation = createOrGetBunnyOperation({ userId: USER.id, libraryId: LIBRARY, ...SCOPE, title: 'Lesson' }, async () => {
        events.push('upstream-create');
        return VIDEO;
      });
      if (failSync) {
        await assert.rejects(operation, /disk I\/O failure/);
        assert.equal(events.includes('upstream-create'), false);
      } else {
        assert.equal((await operation).videoId, VIDEO);
        assert.ok(events.indexOf('file-sync') < events.indexOf('upstream-create'));
        assert.ok(events.indexOf('directory-sync') < events.indexOf('upstream-create'));
        assert.equal(events.at(-2), 'rename');
        assert.equal(events.at(-1), 'directory-sync');
      }
    }
  } finally { Object.defineProperty(process, 'platform', platform); }
});
