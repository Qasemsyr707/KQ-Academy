const assert = require('node:assert/strict');
const test = require('node:test');
const { PDFDocument } = require('pdf-lib');
const { createHash } = require('node:crypto');
const { mkdtemp, rm, readFile, writeFile, readdir } = require('node:fs/promises');
const path = require('node:path');
const os = require('node:os');
const { loadTs } = require('./load-ts.cjs');

const USER = { id: 'instructor-1', role: 'INSTRUCTOR' };
const IMAGE = Buffer.from('ffd8ffe000104a46494600010100000100010000ffd9', 'hex');
const LEGACY_IMAGE = 'c111111111111111111111111';
async function pdf(empty = false) {
  const document = await PDFDocument.create();
  if (!empty) document.addPage([320, 240]).drawText('Original lesson document');
  return Buffer.from(await document.save({ useObjectStreams: false, addDefaultPage: !empty }));
}

async function harness(t, { user = USER, owner = USER.id, imageStatus = 200 } = {}) {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'kq-private-doc-'));
  const old = Object.fromEntries(['DOCUMENT_STORAGE_DIR', 'NODE_ENV'].map(key => [key, process.env[key]]));
  process.env.DOCUMENT_STORAGE_DIR = directory;
  process.env.NODE_ENV = 'test';
  t.after(async () => {
    for (const [key, value] of Object.entries(old)) {
      if (value === undefined) delete process.env[key]; else process.env[key] = value;
    }
    await rm(directory, { recursive: true, force: true });
  });
  const writes = [];
  const requests = [];
  t.mock.method(globalThis, 'fetch', async (...args) => {
    requests.push(args);
    return Response.json({ success: imageStatus === 200, data: { url: 'https://cdn.test/image.jpg', title: 'receipt' } }, { status: imageStatus });
  });
  const mocks = {
    'next-auth': { getServerSession: async () => user ? { user } : null },
    '@/lib/auth': { authOptions: {} },
    '@/lib/db': { prisma: {
      course: { findUnique: async () => owner === null ? null : { instructorId: owner } },
      storedFile: { create: async args => { writes.push(args); return { id: LEGACY_IMAGE }; } },
    } },
  };
  return { directory, writes, requests,
    upload: loadTs('../src/app/api/upload/route.ts', mocks).POST,
    local: loadTs('../src/app/api/upload-local/route.ts', mocks).POST,
    storage: loadTs('../src/lib/private-file-storage.ts'),
    validator: loadTs('../src/lib/document-validation.ts'),
  };
}

function request(bytes, options = {}) {
  const { filename, type, courseId, requestedType } = { filename: 'محاضرة.pdf', type: 'application/pdf', courseId: 'course-a', requestedType: 'document', ...options };
  const form = new FormData();
  form.append('file', new Blob([bytes], { type }), filename);
  if (requestedType !== undefined) form.append('type', requestedType);
  if (courseId !== undefined) form.append('courseId', courseId);
  return new Request('https://academy.test/api/upload', { method: 'POST', body: form });
}

test('both upload endpoints persist original PDF bytes privately with opaque UUID and correct MIME; no document DB writes', async t => {
  const { upload, local, storage, writes, requests, directory } = await harness(t);
  const original = await pdf();
  for (const handler of [upload, local]) {
    const response = await handler(request(original));
    assert.equal(response.status, 201);
    assert.equal(response.headers.get('cache-control'), 'private, no-store');
    const result = await response.json();
    assert.match(result.url, /^\/api\/files\/[0-9a-f-]{36}$/);
    assert.equal(result.filename, 'محاضرة.pdf');
    assert.equal(result.mimeType, 'application/pdf');
    assert.equal(result.size, original.length);
    const stored = await storage.readPrivateFile(result.fileKey);
    assert.equal(stored.metadata.ownerId, USER.id);
    assert.equal(stored.metadata.sha256, createHash('sha256').update(original).digest('hex'));
    assert.deepEqual(stored.bytes, original);
    assert.deepEqual(await readFile(path.join(directory, result.fileKey, 'original')), original);
  }
  assert.equal(writes.length, 0);
  assert.equal(requests.length, 0);
});

test('an image renamed .pdf or declared application/pdf is rejected415 and is never relabelled or stored', async t => {
  const { upload, local, writes, directory } = await harness(t);
  for (const handler of [upload, local]) for (const file of [{ filename: 'fake.pdf', type: 'image/jpeg' }, { filename: 'fake.jpg', type: 'application/pdf' }]) {
    const response = await handler(request(IMAGE, file));
    assert.equal(response.status, 415);
    assert.equal(typeof (await response.json()).error, 'string');
  }
  assert.equal(writes.length, 0);
  assert.deepEqual(await readdir(directory), []);
});

test('truncated, malformed, zero-page and encrypted PDFs are rejected422, preserving no bogus attachment', async t => {
  const { upload, directory } = await harness(t);
  const original = await pdf();
  const encrypted = Buffer.from(original.toString('latin1').replace('/Root ', '/Encrypt 999 0 R\n/Root '), 'latin1');
  for (const bytes of [original.subarray(0, original.length - 12), Buffer.from('%PDF-1.7\nnot-a-document\n%%EOF'), await pdf(true), encrypted]) {
    assert.equal((await upload(request(bytes))).status, 422);
  }
  assert.deepEqual(await readdir(directory), []);
});

test('anonymous, missing-ID, student with course scope and foreign-course instructor cannot upload course documents', async t => {
  const original = await pdf();
  for (const options of [{ user: null }, { user: { role: 'INSTRUCTOR' } }, { user: { id: 'student', role: 'STUDENT' } }, { owner: 'other-instructor' }]) {
    await t.test(JSON.stringify(options), async child => {
      const { upload, local, writes, requests } = await harness(child, options);
      const expected = options.user === null || options.user?.id === undefined && options.user ? 401 : 403;
      for (const handler of [upload, local]) assert.equal((await handler(request(original))).status, expected);
      assert.equal(writes.length, 0);
      assert.equal(requests.length, 0);
    });
  }
});

test('signed-in students can upload an unbound private PDF submission, owned only by that student', async t => {
  const student = { id: 'student-1', role: 'STUDENT' };
  const { upload, local, storage, writes, requests } = await harness(t, { user: student });
  const original = await pdf();
  for (const handler of [upload, local]) {
    const response = await handler(request(original, { courseId: undefined }));
    assert.equal(response.status, 201);
    const file = await storage.readPrivateFile((await response.json()).fileKey);
    assert.equal(file.metadata.ownerId, student.id);
    assert.deepEqual(file.bytes, original);
  }
  assert.equal(writes.length, 0);
  assert.equal(requests.length, 0);
});

test('admin and owner may upload for managed courses; an instructor may upload an unbound private document', async t => {
  const original = await pdf();
  for (const role of ['ADMIN', 'OWNER']) await t.test(role, async child => {
    const { upload } = await harness(child, { user: { id: 'admin', role }, owner: 'other' });
    assert.equal((await upload(request(original))).status, 201);
  });
  await t.test('unbound instructor upload', async child => {
    const { upload } = await harness(child);
    assert.equal((await upload(request(original, { courseId: undefined }))).status, 201);
  });
});

test('upload rejects over-limit Content-Length before buffering, and limits actual chunked body without a declared length', async t => {
  const { upload, storage, writes, directory } = await harness(t);
  const oversized = new Request('https://academy.test/api/upload', {
    method: 'POST', headers: { 'Content-Type': 'multipart/form-data; boundary=test', 'Content-Length': String(storage.MAX_DOCUMENT_BYTES + 65537) }, body: 'x',
  });
  assert.equal((await upload(oversized)).status, 413);
  let chunks = 0;
  let cancelled = false;
  const stream = new ReadableStream({
    pull(controller) { chunks++; controller.enqueue(new Uint8Array(1024 * 1024)); },
    cancel() { cancelled = true; },
  });
  const chunked = new Request('https://academy.test/api/upload', {
    method: 'POST', headers: { 'Content-Type': 'multipart/form-data; boundary=test' }, body: stream, duplex: 'half',
  });
  assert.equal((await upload(chunked)).status, 413);
  assert.ok(chunks <= 23);
  assert.equal(cancelled, true);
  assert.equal(writes.length, 0);
  assert.deepEqual(await readdir(directory), []);
});

test('empty, missing, multiple files and malformed multipart requests fail cleanly', async t => {
  const { upload } = await harness(t);
  assert.equal((await upload(request(Buffer.alloc(0)))).status, 400);
  assert.equal((await upload(new Request('https://academy.test/api/upload', { method: 'POST', body: '{}' }))).status, 400);
  const form = new FormData();
  form.append('file', new Blob(['a']), 'a.pdf');
  form.append('file', new Blob(['b']), 'b.pdf');
  assert.equal((await upload(new Request('https://academy.test/api/upload', { method: 'POST', body: form }))).status, 400);
  const missing = new FormData();
  assert.equal((await upload(new Request('https://academy.test/api/upload', { method: 'POST', body: missing }))).status, 400);
});

test('production storage requires an explicit absolute private path and rejects public or Bunny directories', async t => {
  const { storage } = await harness(t);
  process.env.NODE_ENV = 'production';
  for (const directory of [undefined, 'relative-documents', path.join(process.cwd(), '.data', 'documents'), path.join(process.cwd(), 'public', 'documents'), path.join(process.cwd(), '.data', 'bunny-uploads', 'documents'), path.resolve('/data/bunny-uploads/documents')]) {
    if (directory === undefined) delete process.env.DOCUMENT_STORAGE_DIR; else process.env.DOCUMENT_STORAGE_DIR = directory;
    await assert.rejects(storage.storePrivateFile(Buffer.from('safe'), { ownerId: USER.id, name: 'safe.txt', mimeType: 'text/plain' }), error => error.status === 500);
  }
});

test('stored documents survive fresh module instances and reject path traversal, wrong bytes and altered metadata', async t => {
  const { storage, directory } = await harness(t);
  const original = await pdf();
  const stored = await storage.storePrivateFile(original, { ownerId: USER.id, name: 'original.pdf', mimeType: 'application/pdf' });
  const reloaded = loadTs('../src/lib/private-file-storage.ts');
  assert.deepEqual((await reloaded.readPrivateFile(stored.fileKey)).bytes, original);
  assert.equal((await reloaded.readPrivateFileMetadata(stored.fileKey)).ownerId, USER.id);
  for (const id of ['../secret', stored.fileKey + '/../../secret', stored.fileKey + '.pdf', 'not-an-id']) {
    await assert.rejects(reloaded.readPrivateFile(id), error => error.status === 400);
  }
  assert.equal(await reloaded.readPrivateFile('aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee'), null);
  await writeFile(path.join(directory, stored.fileKey, 'original'), Buffer.from('corrupted'));
  await assert.rejects(reloaded.readPrivateFile(stored.fileKey), error => error.status === 422);
  await writeFile(path.join(directory, stored.fileKey, 'metadata.json'), '{');
  await assert.rejects(reloaded.readPrivateFileMetadata(stored.fileKey), error => error.status === 422);
});

test('private storage rejects symbolic-link ancestors without opening uploaded content', async t => {
  const { storage, directory } = await harness(t);
  const { readPrivateFileMetadata } = loadTs('../src/lib/private-file-storage.ts', {
    'node:fs/promises': { lstat: async () => ({ isSymbolicLink: () => true }) },
  });
  await assert.rejects(readPrivateFileMetadata('aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee'), error => error.status === 500);
  assert.equal(await storage.readPrivateFile('aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee'), null);
  assert.deepEqual(await readdir(directory), []);
});

test('non-PDF documents preserve their bytes and MIME; MIME mismatch is rejected', async t => {
  const { upload, storage } = await harness(t);
  const bytes = Buffer.from('Original course notes\n');
  const response = await upload(request(bytes, { filename: 'notes.txt', type: 'text/plain' }));
  assert.equal(response.status, 201);
  const result = await response.json();
  assert.equal(result.mimeType, 'text/plain');
  assert.deepEqual((await storage.readPrivateFile(result.fileKey)).bytes, bytes);
  assert.equal((await upload(request(IMAGE, { filename: 'fake.docx', type: 'image/jpeg' }))).status, 415);
});

test('existing signed-in image uploader still uses ImgBB and its StoredFile image fallback', async t => {
  const { upload, requests, writes } = await harness(t, { user: { id: 'student', role: 'STUDENT' } });
  const response = await upload(request(IMAGE, { filename: 'receipt.jpg', type: 'image/jpeg', requestedType: undefined, courseId: undefined }));
  assert.equal(response.status, 201);
  assert.equal((await response.json()).url, 'https://cdn.test/image.jpg');
  assert.equal(requests.length, 1);
  assert.equal(writes.length, 0);
  await t.test('CDN failure retains existing image fallback', async child => {
    const { upload, writes, storage } = await harness(child, { imageStatus: 503, user: { id: 'student', role: 'STUDENT' } });
    const response = await upload(request(IMAGE, { filename: 'receipt.jpg', type: 'image/jpeg', requestedType: undefined, courseId: undefined }));
    assert.equal(response.status, 201);
    assert.equal((await response.json()).url, `/api/files/${LEGACY_IMAGE}`);
    assert.equal(writes.length, 1);
    assert.equal(writes[0].data.mimeType, 'image/jpeg');
    assert.equal(await storage.readLegacyImageOwner(LEGACY_IMAGE), 'student');
  });
});

test('legacy image ownership persists across reloads and cannot be reassigned or accessed by path traversal', async t => {
  const { storage, directory } = await harness(t);
  assert.equal(await storage.readLegacyImageOwner(LEGACY_IMAGE), null);
  await storage.recordLegacyImageOwner(LEGACY_IMAGE, USER.id);
  const reloaded = loadTs('../src/lib/private-file-storage.ts');
  assert.equal(await reloaded.readLegacyImageOwner(LEGACY_IMAGE), USER.id);
  await reloaded.recordLegacyImageOwner(LEGACY_IMAGE, USER.id);
  await assert.rejects(reloaded.recordLegacyImageOwner(LEGACY_IMAGE, 'attacker'), error => error.status === 409);
  assert.equal(await reloaded.readLegacyImageOwner(LEGACY_IMAGE), USER.id);
  for (const id of ['../secret', LEGACY_IMAGE + '/../../secret', 'not-a-cuid']) {
    await assert.rejects(reloaded.readLegacyImageOwner(id), error => error.status === 400);
    await assert.rejects(reloaded.recordLegacyImageOwner(id, USER.id), error => error.status === 400);
  }
  await writeFile(path.join(directory, '.legacy-images', LEGACY_IMAGE, 'owner.json'), '{');
  await assert.rejects(reloaded.readLegacyImageOwner(LEGACY_IMAGE), error => error.status === 422);
});
