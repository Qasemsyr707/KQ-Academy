const assert = require('node:assert/strict');
const test = require('node:test');
const tus = require('tus-js-client');
const { loadTs } = require('./load-ts.cjs');

const CHUNK = 16 * 1024 * 1024;
const ENDPOINT = 'https://video.bunnycdn.com/tusupload';
const VIDEO = '11111111-2222-3333-4444-555555555555';
const OTHER_VIDEO = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';
const CONTEXT = { purpose: 'lesson', courseId: 'course-1' };

function ticket(extra = {}) {
  return { state: 'uploading', videoId: VIDEO, libraryId: '123', signature: 'a'.repeat(64),
    expireTime: Math.floor(Date.now() / 1000) + 86400, resumeToken: 'scoped-ownership-proof', ...extra };
}
function ready(extra = {}) {
  const videoId = extra.videoId ?? VIDEO;
  const libraryId = extra.libraryId ?? '123';
  return { state: 'ready', videoId, libraryId,
    embedUrl: `https://iframe.mediadelivery.net/embed/${libraryId}/${videoId}`, ...extra };
}
function response(status, headers = {}) {
  const lowered = Object.fromEntries(Object.entries(headers).map(([name, value]) => [name.toLowerCase(), value]));
  return { getStatus: () => status, getHeader: name => lowered[name.toLowerCase()],
    getBody: () => '', getUnderlyingObject: () => null };
}

// Use the installed tus-js-client state machine, not a mock of its resume,
// retry, HEAD fallback, or request-hook behavior. Only transport is scripted.
async function scenario(run, config = {}) {
  const { steps = [], size = CHUNK + 3, apiSteps, storage = new Map() } = config;
  const requests = [], apiCalls = [], options = [], aborted = [], progress = [], states = [], writes = [];
  const originalFetch = globalThis.fetch;
  const storageDescriptor = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
  const now = Date.now;
  let index = 0;
  const httpStack = {
    getName: () => 'scripted-bunny-test',
    createRequest(method, url) {
      const headers = {};
      let abortSend;
      return {
        getMethod: () => method, getURL: () => url,
        setHeader: (name, value) => { headers[name] = value; },
        getHeader: name => headers[name], setProgressHandler() {}, getUnderlyingObject: () => null,
        abort: async () => { aborted.push({ method, url }); abortSend?.(Error('request aborted')); },
        async send(body) {
          const request = { method, url, headers, size: body?.length ?? 0 };
          requests.push(request);
          const step = steps[index++];
          assert.ok(step, `Unexpected ${method} ${url}`);
          assert.equal(method, step.method);
          if (step.url) assert.equal(url, step.url);
          await step.inspect?.(request);
          if (step.error) throw step.error;
          if (step.block) return new Promise((resolve, reject) => { abortSend = reject; step.block(); });
          return response(step.status, step.headers);
        },
      };
    },
  };
  class Upload extends tus.Upload {
    constructor(file, config) {
      options.push(config);
      super(file, { ...config, httpStack,
        retryDelays: config.retryDelays.map(() => 0),
        urlStorage: {
          findUploadsByFingerprint: () => { throw Error('Legacy tus URL storage must not be read'); },
          addUpload: () => { throw Error('Operation storage manages the scoped URL'); },
          removeUpload: async () => {},
        },
      });
    }
  }
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: {
    getItem: key => storage.get(key) ?? null,
    setItem: (key, value) => { storage.set(key, value); writes.push({ key, record: JSON.parse(value) }); },
    removeItem: key => storage.delete(key),
  } });
  globalThis.fetch = async (url, init) => {
    const data = JSON.parse(init.body);
    apiCalls.push({ url, ...init, data });
    const step = apiSteps?.[apiCalls.length - 1];
    if (apiSteps) assert.ok(step, `Unexpected API request ${url}`);
    if (step?.path) assert.equal(url, `/api/bunny/${step.path}`);
    await step?.inspect?.(data);
    if (step?.error) throw step.error;
    const value = step?.body ?? (url.endsWith('upload-status') ? ready() : ticket());
    return { ok: !step?.status || step.status < 400, status: step?.status ?? 200, json: async () => value };
  };
  const file = Object.assign(Buffer.alloc(size), { name: 'lecture.mp4', size, type: 'video/mp4', lastModified: 1700000000000 });
  // Node's tus transport consumes a Buffer; expose browser-style sample reads
  // as well so the actual bounded file digest and persistent resume are tested.
  file.slice = (start, end) => {
    const sample = Buffer.prototype.subarray.call(file, start, end);
    sample.arrayBuffer = async () => Uint8Array.from(sample).buffer;
    return sample;
  };
  const module = loadTs('../src/lib/bunny-upload.ts', { 'tus-js-client': { Upload } });
  const createController = (extra = {}) => module.createBunnyUpload(file, 'Lesson title', {
    ...CONTEXT, onProgress: value => progress.push(value), onStateChange: value => states.push(value), ...extra,
  });
  try {
    await run({ ...module, createController, reload: () => loadTs('../src/lib/bunny-upload.ts', { 'tus-js-client': { Upload } }),
      file, requests, apiCalls, options, aborted, progress, states, storage, writes });
    assert.equal(index, steps.length, 'Every scripted TUS request was consumed');
    if (apiSteps) assert.equal(apiCalls.length, apiSteps.length, 'Every scripted API request was consumed');
  } finally {
    globalThis.fetch = originalFetch;
    Date.now = now;
    if (storageDescriptor) Object.defineProperty(globalThis, 'localStorage', storageDescriptor);
    else delete globalThis.localStorage;
  }
}

const create = (url = '/tusupload/one') => ({ method: 'POST', status: 201, headers: { Location: url } });
const patch = (offset, extra = {}) => ({ method: 'PATCH', status: 204, headers: { 'upload-offset': String(offset) }, ...extra });
const head = (offset, size = CHUNK + 3, extra = {}) => ({ method: 'HEAD', status: 200,
  headers: { 'upload-offset': String(offset), 'upload-length': String(size) }, ...extra });

test('successful direct upload uses exact signed headers, 16MiB sequential chunks, and a video/library-bound fingerprint', async () => {
  await scenario(async ({ createController, requests, options, apiCalls, states, progress, storage, file }) => {
    const controller = createController();
    const result = await controller.start();
    assert.deepEqual(result, { videoId: VIDEO, libraryId: '123', embedUrl: ready().embedUrl });
    assert.equal(options[0].chunkSize, CHUNK);
    assert.equal(options[0].parallelUploads, 1);
    assert.deepEqual(options[0].retryDelays, [0, 3000, 5000, 10000, 20000, 60000, 60000]);
    assert.deepEqual(options[0].metadata, { filetype: 'video/mp4', title: 'Lesson title' });
    assert.match(await options[0].fingerprint(file), new RegExp(`^[a-f0-9]{64}:123:${VIDEO}$`));
    for (const request of requests) {
      assert.equal(request.headers.VideoId, VIDEO);
      assert.equal(request.headers.LibraryId, '123');
      assert.equal(request.headers.AuthorizationSignature, 'a'.repeat(64));
      assert.ok(Number(request.headers.AuthorizationExpire) > Math.floor(Date.now() / 1000));
    }
    assert.equal(apiCalls[0].url, '/api/bunny/create-video');
    assert.deepEqual({ ...apiCalls[0].data, operationId: 'stable-uuid' }, { ...CONTEXT, operationId: 'stable-uuid', title: 'Lesson title' });
    assert.match(apiCalls[0].data.operationId, /^[a-f0-9-]{36}$/);
    assert.equal(apiCalls[1].url, '/api/bunny/upload-status');
    assert.equal(apiCalls[1].data.operationId, apiCalls[0].data.operationId);
    assert.ok(apiCalls.every(call => call.cache === 'no-store'));
    assert.ok(states.includes('Uploading'));
    assert.ok(states.includes('Processing'));
    assert.equal(states.at(-1), 'Ready');
    assert.equal(progress.at(-1), 100);
    assert.ok([...storage.values()].every(raw => JSON.parse(raw).uploadUrl === undefined));
    assert.ok([...storage.values()].every(raw => JSON.parse(raw).uploadFingerprint === undefined));
    controller.complete();
    assert.equal(storage.size, 0);
  }, { steps: [create(), patch(CHUNK), patch(CHUNK + 3)] });
});

test('small upload resolves only after Bunny readiness, never merely after transport completion', async () => {
  let statusChecked = false;
  await scenario(async ({ createController, states }) => {
    const result = await createController().start();
    assert.equal(statusChecked, true);
    assert.equal(result.embedUrl, ready().embedUrl);
    assert.ok(states.indexOf('Processing') < states.indexOf('Ready'));
  }, { size: 3, steps: [create(), patch(3)], apiSteps: [
    { path: 'create-video', body: ticket() },
    { path: 'upload-status', body: ready(), inspect: () => { statusChecked = true; } },
  ] });
});

test('network interruption resumes acknowledged bytes with HEAD on the SAME TUS URL and VideoId', async () => {
  await scenario(async ({ createController, requests, apiCalls, states }) => {
    await createController().start();
    assert.equal(apiCalls.filter(call => call.url.endsWith('create-video')).length, 1);
    assert.deepEqual(requests.map(r => r.method), ['POST', 'PATCH', 'PATCH', 'HEAD', 'PATCH']);
    assert.equal(requests.at(-1).headers['Upload-Offset'], String(CHUNK));
    assert.ok(requests.slice(1).every(r => r.url === `${ENDPOINT}/one`));
    assert.ok(requests.every(r => r.headers.VideoId === VIDEO));
    assert.ok(states.includes('Retrying'));
  }, { steps: [create(), patch(CHUNK), patch(0, { error: Error('offline') }), head(CHUNK), patch(CHUNK + 3)] });
});

test('PATCH 404 or 410 discards the old resource, checks Bunny, and restarts from zero exactly once for the same video', async () => {
  for (const status of [404, 410]) {
    await scenario(async ({ createController, requests, apiCalls, progress, writes }) => {
      await createController().start();
      assert.deepEqual(requests.map(r => r.method), ['POST', 'PATCH', 'PATCH', 'POST', 'PATCH', 'PATCH']);
      assert.equal(requests[4].headers['Upload-Offset'], '0');
      assert.equal(requests[4].url, `${ENDPOINT}/two`);
      assert.ok(requests.every(r => r.headers.VideoId === VIDEO));
      assert.equal(apiCalls.filter(call => call.url.endsWith('create-video')).length, 1);
      assert.equal(apiCalls[1].url, '/api/bunny/refresh-upload');
      assert.equal(apiCalls[1].data.videoId, VIDEO);
      assert.equal(apiCalls[1].data.operationId, apiCalls[0].data.operationId);
      assert.ok(progress.includes(0));
      assert.ok(writes.some(({ record }) => record.lostResource && !record.uploadUrl));
    }, { steps: [create(), patch(CHUNK), patch(0, { status }), create('/tusupload/two'), patch(CHUNK), patch(CHUNK + 3)] });
  }
});

test('repeated PATCH 404 is bounded across manual resume, with no third TUS resource and no duplicate video', async () => {
  await scenario(async ({ createController, apiCalls, requests, states, storage }) => {
    const controller = createController();
    await assert.rejects(controller.start(), error => error.status === 404 && error.videoId === VIDEO);
    await assert.rejects(controller.resume(), /المحاولة المحدودة/);
    assert.equal(requests.filter(r => r.method === 'POST').length, 2);
    assert.equal(apiCalls.filter(call => call.url.endsWith('create-video')).length, 1);
    assert.equal(states.at(-1), 'Failed');
    const record = JSON.parse([...storage.values()][0]);
    assert.equal(record.restarts, 1);
    assert.equal(record.lostResource, true);
    assert.equal(record.uploadUrl, undefined);
  }, { steps: [create(), patch(0, { status: 404 }), create('/tusupload/two'), patch(0, { status: 404 })] });
});

test('a missing session whose video is already processing does not resend any bytes', async () => {
  await scenario(async ({ createController, requests, states }) => {
    await createController().start();
    assert.equal(requests.filter(r => r.method === 'POST').length, 1);
    assert.ok(states.includes('Processing'));
  }, { size: 3, steps: [create(), patch(0, { status: 404 })], apiSteps: [
    { path: 'create-video', body: ticket() },
    { path: 'refresh-upload', body: { state: 'processing', videoId: VIDEO, libraryId: '123' } },
    { path: 'upload-status', body: ready() },
  ] });
});

test('HEAD 404 after a network interruption follows controlled recovery instead of tus implicit fallback', async () => {
  await scenario(async ({ createController, apiCalls, requests }) => {
    await createController().start();
    assert.equal(apiCalls[1].url, '/api/bunny/refresh-upload');
    assert.deepEqual(requests.map(r => r.method), ['POST', 'PATCH', 'HEAD', 'POST', 'PATCH']);
  }, { size: 3, steps: [create(), patch(0, { error: Error('network') }), head(0, 3, { status: 404 }), create('/tusupload/two'), patch(3)] });
});

test('HEAD 401/403 cannot silently create another TUS resource', async () => {
  for (const status of [401, 403]) {
    await scenario(async ({ createController, requests, apiCalls }) => {
      await assert.rejects(createController().start(), error => error.status === status && error.method === 'HEAD');
      assert.equal(requests.filter(r => r.method === 'POST').length, 1);
      assert.equal(apiCalls.length, 1);
    }, { steps: [create(), patch(0, { error: Error('network') }), head(0, CHUNK + 3, { status })] });
  }
});

test('HEAD 503 retries the original resource without POST fallback', async () => {
  await scenario(async ({ createController, requests }) => {
    await createController().start();
    assert.deepEqual(requests.map(r => r.method), ['POST', 'PATCH', 'HEAD', 'HEAD', 'PATCH']);
  }, { size: 3, steps: [create(), patch(0, { error: Error('network') }), head(0, 3, { status: 503 }), head(0, 3), patch(3)] });
});

test('temporary 408/409/423/429/5xx resync from the acknowledged offset', async () => {
  for (const status of [408, 409, 423, 429, 500]) {
    await scenario(async ({ createController, requests }) => {
      await createController().start();
      assert.equal(requests.at(-1).headers['Upload-Offset'], String(CHUNK));
      assert.equal(requests.filter(r => r.method === 'POST').length, 1);
    }, { steps: [create(), patch(CHUNK), patch(0, { status }), head(CHUNK), patch(CHUNK + 3)] });
  }
});

test('permanent PATCH errors and endpoint POST 404 fail without credential refresh or duplicate video', async () => {
  for (const status of [400, 401, 403, 413]) {
    await scenario(async ({ createController, apiCalls }) => {
      await assert.rejects(createController().start(), error => error.status === status && error.method === 'PATCH');
      assert.equal(apiCalls.length, 1);
    }, { steps: [create(), patch(0, { status })] });
  }
  await scenario(async ({ createController, apiCalls }) => {
    await assert.rejects(createController().start(), error => error.status === 404 && error.method === 'POST');
    assert.equal(apiCalls.length, 1);
  }, { steps: [{ method: 'POST', status: 404 }] });
});

test('network retry exhaustion keeps the same URL and remains bounded', async () => {
  await scenario(async ({ createController, requests, apiCalls }) => {
    await assert.rejects(createController().start(), error => error.status === 503);
    assert.equal(apiCalls.length, 1);
    assert.equal(requests.filter(r => r.method === 'POST').length, 1);
  }, { steps: [create(), patch(0, { status: 503 }), ...Array.from({ length: 7 }, () => head(0, CHUNK + 3, { status: 503 }))] });
});

test('an expiring signature is renewed safely before the next PATCH without changing the TUS URL or offset', async () => {
  const start = Date.now();
  let now = start;
  const first = ticket();
  await scenario(async ({ createController, requests, apiCalls, writes }) => {
    Date.now = () => now;
    await createController().start();
    assert.deepEqual(requests.map(r => r.method), ['POST', 'PATCH', 'PATCH']);
    assert.equal(requests[2].url, requests[1].url);
    assert.equal(requests[2].headers['Upload-Offset'], String(CHUNK));
    assert.equal(requests[2].headers.AuthorizationSignature, 'b'.repeat(64));
    assert.equal(apiCalls[1].url, '/api/bunny/refresh-upload');
    const renewed = writes.find(({ record }) => record.credentials?.signature === 'b'.repeat(64) && record.uploadUrl);
    assert.equal(renewed.record.sessionExpireTime, first.expireTime, 'Refreshing a signature must not extend the original session lifetime');
  }, { steps: [create(), patch(CHUNK, { inspect: () => { now = start + (86400 - 60) * 1000; } }), patch(CHUNK + 3)], apiSteps: [
    { path: 'create-video', body: first },
    { path: 'refresh-upload', body: ticket({ signature: 'b'.repeat(64), expireTime: first.expireTime + 86400 }) },
    { path: 'upload-status', body: ready() },
  ] });
});

test('original session expiration restarts once from zero after checking Bunny, even with newly signed credentials', async () => {
  const start = Date.now();
  let now = start;
  const first = ticket();
  await scenario(async ({ createController, requests }) => {
    Date.now = () => now;
    await createController().start();
    assert.deepEqual(requests.map(r => r.method), ['POST', 'PATCH', 'POST', 'PATCH', 'PATCH']);
    assert.equal(requests[3].headers['Upload-Offset'], '0');
    assert.ok(requests.every(r => r.headers.VideoId === VIDEO));
  }, { steps: [create(), patch(CHUNK, { inspect: () => { now = start + 86401000; } }), create('/tusupload/two'), patch(CHUNK), patch(CHUNK + 3)], apiSteps: [
    { path: 'create-video', body: first },
    { path: 'refresh-upload', body: ticket({ expireTime: first.expireTime + 86400 }) },
    { path: 'upload-status', body: ready() },
  ] });
});

test('missing, expired, or millisecond authorization values fail before sending any video bytes', async () => {
  for (const expireTime of [undefined, Math.floor(Date.now() / 1000) - 1, Date.now() + 86400000]) {
    await scenario(async ({ createController, requests }) => {
      await assert.rejects(createController().start(), /تفويض/);
      assert.equal(requests.length, 0);
    }, { apiSteps: [{ path: 'create-video', body: ticket({ expireTime }) }] });
  }
});

test('refresh cannot change the VideoId or library for an existing operation', async () => {
  for (const change of [{ videoId: OTHER_VIDEO }, { libraryId: '456' }]) {
    await scenario(async ({ createController, requests }) => {
      await assert.rejects(createController().start(), /هوية الفيديو/);
      assert.equal(requests.length, 2);
    }, { steps: [create(), patch(0, { status: 404 })], apiSteps: [
      { path: 'create-video', body: ticket() }, { path: 'refresh-upload', body: ticket(change) },
    ] });
  }
});

test('untrusted TUS Location cannot send scoped credentials to another host', async () => {
  for (const location of ['https://evil.test/tusupload/one', 'http://video.bunnycdn.com/tusupload/one', '/unrelated/one']) {
    await scenario(async ({ createController, requests }) => {
      await assert.rejects(createController().start(), /عنوان جلسة/);
      assert.equal(requests.length, 1);
    }, { steps: [create(location)] });
  }
});

test('legacy file-only tus resumes are ignored; a stale operation with another video cannot send bytes', async () => {
  const storage = new Map([['tus::legacy-file', JSON.stringify({ uploadUrl: `${ENDPOINT}/other-video` })]]);
  await scenario(async ({ createController, storage, requests, apiCalls, file }) => {
    const controller = createController();
    await assert.rejects(controller.start(), error => error.status === 503);
    const key = [...storage.keys()].find(key => key.startsWith('kq:bunny-upload:v2:'));
    const previous = JSON.parse(storage.get(key));
    previous.credentials.videoId = OTHER_VIDEO;
    previous.uploadFingerprint = `${previous.fileFingerprint}:123:${OTHER_VIDEO}`;
    storage.set(key, JSON.stringify(previous));
    // A fresh module represents reloading the page; its pinned identity must be
    // re-authorized on the server before attempting HEAD against the old URL.
    const reloaded = loadTs('../src/lib/bunny-upload.ts', { 'tus-js-client': { Upload: class extends tus.Upload {
      constructor() { throw Error('No bytes may be sent for an unauthorized stale resume'); }
    } } });
    const next = reloaded.createBunnyUpload(file, 'Lesson title', CONTEXT);
    await assert.rejects(next.start(), error => error.status === 403);
    assert.equal(requests[0].method, 'POST', 'The legacy URL is ignored');
    assert.equal(apiCalls.at(-1).data.videoId, OTHER_VIDEO);
  }, { storage, size: 3, steps: [create(), patch(0, { status: 503 }), ...Array.from({ length: 7 }, () => head(0, 3, { status: 503 }))], apiSteps: [
    { path: 'create-video', body: ticket() }, { path: 'refresh-upload', status: 403 },
  ] });
});

test('unauthorized API responses fail before creating a TUS session', async () => {
  for (const status of [401, 403]) {
    await scenario(async ({ createController, requests }) => {
      await assert.rejects(createController().start(), error => error.status === status);
      assert.equal(requests.length, 0);
    }, { apiSteps: [{ path: 'create-video', status }] });
  }
});

test('persisted URL association for another VideoId is rejected before any HEAD or refresh request', async () => {
  await scenario(async ({ createController, reload, storage, requests, apiCalls, file }) => {
    await assert.rejects(createController().start(), error => error.status === 503);
    const key = [...storage.keys()][0];
    const record = JSON.parse(storage.get(key));
    record.uploadFingerprint = `${record.fileFingerprint}:123:${OTHER_VIDEO}`;
    storage.set(key, JSON.stringify(record));
    await assert.rejects(reload().createBunnyUpload(file, 'Lesson title', CONTEXT).start(), /محاولة الاستكمال القديمة/);
    assert.equal(requests.length, 9);
    assert.equal(apiCalls.length, 1);
  }, { size: 3, steps: [create(), patch(0, { status: 503 }), ...Array.from({ length: 7 }, () => head(0, 3, { status: 503 }))] });
});

test('a page reload resumes only its pinned file/library/video URL after server reauthorization', async () => {
  await scenario(async ({ createController, reload, requests, apiCalls, file }) => {
    await assert.rejects(createController().start(), error => error.status === 503);
    await reload().createBunnyUpload(file, 'Lesson title', CONTEXT).start();
    assert.equal(apiCalls[1].url, '/api/bunny/refresh-upload');
    assert.equal(apiCalls[0].data.operationId, apiCalls[1].data.operationId);
    assert.equal(requests.filter(r => r.method === 'POST').length, 1);
    assert.equal(requests.at(-1).headers['Upload-Offset'], String(CHUNK));
    assert.equal(requests.at(-1).url, `${ENDPOINT}/one`);
  }, { steps: [create(), patch(CHUNK), patch(0, { status: 503 }),
    ...Array.from({ length: 7 }, () => head(0, CHUNK + 3, { status: 503 })), head(CHUNK), patch(CHUNK + 3)] });
});

test('switching accounts isolates persisted operations for the same course and file', async () => {
  await scenario(async ({ createController, apiCalls, storage }) => {
    await assert.rejects(createController({ userId: 'instructor-1' }).start(), /الاتصال/);
    await createController({ userId: 'instructor-2' }).start();
    assert.notEqual(apiCalls[0].data.operationId, apiCalls[1].data.operationId);
    assert.equal(storage.size, 2);
    assert.ok([...storage.keys()].some(key => key.startsWith('kq:bunny-upload:v2:instructor-1:')));
    assert.ok([...storage.keys()].some(key => key.startsWith('kq:bunny-upload:v2:instructor-2:')));
  }, { size: 3, steps: [create(), patch(3)], apiSteps: [
    { path: 'create-video', error: Error('response lost') },
    { path: 'create-video', body: ticket() }, { path: 'upload-status', body: ready() },
  ] });
});

test('a lost create response reuses the persisted operation UUID on manual retry', async () => {
  await scenario(async ({ createController, apiCalls }) => {
    const controller = createController();
    await assert.rejects(controller.start(), /الاتصال/);
    await controller.resume();
    assert.equal(apiCalls[0].data.operationId, apiCalls[1].data.operationId);
    assert.equal(apiCalls.filter(call => call.url.endsWith('create-video')).length, 2);
  }, { size: 3, steps: [create(), patch(3)], apiSteps: [
    { path: 'create-video', error: Error('response lost') },
    { path: 'create-video', body: ticket() }, { path: 'upload-status', body: ready() },
  ] });
});

test('duplicate start calls share one transfer; Ready remains available until application save succeeds', async () => {
  await scenario(async ({ createController, apiCalls, storage }) => {
    const controller = createController();
    const first = controller.start();
    assert.equal(controller.start(), first);
    const result = await first;
    assert.deepEqual(await controller.resume(), result);
    assert.equal(apiCalls.length, 2);
    assert.equal(storage.size, 1, 'Keep operation identity if application save fails');
    controller.complete();
    assert.equal(storage.size, 0);
  }, { size: 3, steps: [create(), patch(3)] });
});

test('pause aborts locally and resumes the SAME video/session through HEAD without deleting either resource', async () => {
  let enteredPatch;
  const waiting = new Promise(resolve => { enteredPatch = resolve; });
  await scenario(async ({ createController, BunnyUploadPaused, requests, states, aborted, apiCalls }) => {
    const controller = createController();
    const pending = controller.start();
    const rejected = assert.rejects(pending, error => error instanceof BunnyUploadPaused);
    await waiting;
    await controller.pause();
    await rejected;
    assert.equal(states.at(-1), 'Paused');
    await controller.resume();
    assert.ok(aborted.length);
    assert.deepEqual(requests.map(r => r.method), ['POST', 'PATCH', 'HEAD', 'PATCH']);
    assert.equal(apiCalls[1].url, '/api/bunny/refresh-upload');
    assert.equal(apiCalls[0].data.operationId, apiCalls[1].data.operationId);
    assert.ok(requests.every(r => r.method !== 'DELETE'));
  }, { size: 3, steps: [create(), patch(0, { block: enteredPatch }), head(0, 3), patch(3)] });
});

test('a video that fails encoding never returns an embeddable URL', async () => {
  await scenario(async ({ createController, states }) => {
    await assert.rejects(createController().start(), /فشلت معالجة/);
    assert.equal(states.at(-1), 'Failed');
    assert.equal(states.includes('Ready'), false);
  }, { size: 3, steps: [create(), patch(3)], apiSteps: [
    { path: 'create-video', body: ticket() },
    { path: 'upload-status', body: { state: 'failed', videoId: VIDEO, libraryId: '123' } },
  ] });
});

test('a recovered create operation already processing does not upload the video again', async () => {
  await scenario(async ({ createController, requests }) => {
    await createController().start();
    assert.equal(requests.length, 0);
  }, { apiSteps: [
    { path: 'create-video', body: { state: 'processing', videoId: VIDEO, libraryId: '123', resumeToken: 'scoped-ownership-proof' } },
    { path: 'upload-status', body: ready() },
  ] });
});

test('processing polling is bounded; a later resume checks readiness without retransferring the video', async () => {
  const timeout = globalThis.setTimeout;
  globalThis.setTimeout = (callback, delay, ...args) => timeout(callback, delay === 5000 ? 0 : delay, ...args);
  try {
    const processing = { state: 'processing', videoId: VIDEO, libraryId: '123' };
    await scenario(async ({ createController, requests, apiCalls, states }) => {
      const controller = createController();
      await assert.rejects(controller.start(), /قيد المعالجة/);
      assert.equal(states.includes('Ready'), false);
      await controller.resume();
      assert.equal(states.at(-1), 'Ready');
      assert.equal(requests.filter(r => r.method === 'POST').length, 1);
      assert.equal(apiCalls.filter(call => call.url.endsWith('upload-status')).length, 121);
    }, { size: 3, steps: [create(), patch(3)], apiSteps: [
      { path: 'create-video', body: ticket() },
      ...Array.from({ length: 120 }, () => ({ path: 'upload-status', body: processing })),
      { path: 'refresh-upload', body: processing }, { path: 'upload-status', body: ready() },
    ] });
  } finally { globalThis.setTimeout = timeout; }
});
