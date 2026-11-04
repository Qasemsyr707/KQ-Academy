const assert = require('node:assert/strict');
const { test, before } = require('node:test');
const { PDFDocument } = require('pdf-lib');
const { createHash } = require('node:crypto');
const fs = require('node:fs/promises');
const path = require('node:path');
const os = require('node:os');
const { loadTs } = require('./load-ts.cjs');

const COURSE = `c${'a'.repeat(24)}`;
const CHAPTER = `c${'b'.repeat(24)}`;
const LESSON = `c${'c'.repeat(24)}`;
const ATTACHMENT = `c${'d'.repeat(24)}`;
const LEGACY_FILE = `c${'e'.repeat(24)}`;
const OTHER_COURSE = `c${'f'.repeat(24)}`;
const OTHER_CHAPTER = `c${'g'.repeat(24)}`;
const KEY = '11111111-2222-3333-4444-555555555555';
const OWNER = { id: 'teacher', role: 'INSTRUCTOR' };
const STUDENT = { id: 'student', role: 'STUDENT' };
const CREATED = new Date('2026-11-04T09:00:00Z');
let PDF;
before(async () => {
  const document = await PDFDocument.create();
  for (const text of ['First page original content', 'Second page original content', 'Third page original content']) {
    document.addPage([400, 600]).drawText(text);
  }
  PDF = Buffer.from(await document.save());
});

function harness(config = {}) {
  const bytes = config.bytes ?? PDF;
  const fileId = config.fileId ?? KEY;
  const user = config.user === undefined ? OWNER : config.user;
  const course = { id: COURSE, instructorId: OWNER.id, status: 'PUBLISHED', ...config.course };
  const chapter = { id: CHAPTER, courseId: course.id, isFree: false, course, ...config.chapter };
  const attachment = config.attachment ?? { name: 'وثيقة الدرس.pdf', url: `/api/files/${fileId}`, chapterId: CHAPTER, lessonId: null, courseId: null };
  const metadata = { fileKey: fileId, ownerId: OWNER.id, name: 'وثيقة الدرس.pdf', mimeType: 'application/pdf', size: bytes.length,
    sha256: createHash('sha256').update(bytes).digest('hex'), createdAt: CREATED.toISOString(), ...config.metadata };
  const reads = { metadata: 0, bytes: 0, enrollments: 0 };
  const prisma = {
    course: { findUnique: async ({ where }) => where.id === course.id ? course : where.id === OTHER_COURSE
      ? { ...course, id: OTHER_COURSE, instructorId: 'different-teacher' } : null,
    findFirst: async () => config.publicCover ? { id: COURSE } : null },
    chapter: { findUnique: async ({ where }) => where.id === CHAPTER ? chapter : where.id === OTHER_CHAPTER
      ? { ...chapter, id: OTHER_CHAPTER, courseId: OTHER_COURSE, course: { ...course, id: OTHER_COURSE } } : null },
    lesson: { findUnique: async ({ where }) => where.id === LESSON ? { id: LESSON, chapter } : null,
      findMany: async () => config.lessonRefs ?? [] },
    enrollment: { findUnique: async () => { reads.enrollments++; return config.enrolled ? { id: 'enrolled' } : null; } },
    attachment: { findUnique: async () => config.missingAttachment ? null : attachment,
      findMany: async () => config.attachmentRefs ?? [{ chapterId: CHAPTER }] },
    quiz: { findMany: async () => config.quizRefs ?? [] },
    quizAttempt: { findMany: async () => config.submissionRefs ?? [] },
    payment: { findMany: async () => config.receiptRefs ?? [] },
    walletTransaction: { findMany: async () => config.walletRefs ?? [] },
    user: { findFirst: async () => config.publicAvatar ? { id: 'avatar-user' } : null },
    storedFile: { findUnique: async ({ select }) => {
      if (select.data) { reads.bytes++; return config.missingBytes ? null : { data: bytes.toString('base64') }; }
      reads.metadata++;
      return config.missingFile ? null : { id: fileId, name: metadata.name, mimeType: metadata.mimeType, size: metadata.size, createdAt: CREATED };
    } },
  };
  class PrivateFileError extends Error { constructor(status, message) { super(message); this.status = status; } }
  const storage = {
    PrivateFileError, MAX_DOCUMENT_BYTES: 20 * 1024 * 1024,
    isPrivateFileId: value => typeof value === 'string' && /^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/i.test(value),
    readPrivateFileMetadata: async () => { reads.metadata++; return config.missingFile ? null : metadata; },
    readPrivateFile: async () => { reads.bytes++; return config.missingBytes ? null : { metadata, bytes }; },
    readLegacyImageOwner: async () => config.legacyOwner ?? null,
  };
  const mocks = { '@/lib/db': { prisma }, '@/lib/auth': { authOptions: {} },
    'next-auth': { getServerSession: async () => user ? { user } : null }, '@/lib/private-file-storage': storage };
  const access = loadTs('../src/lib/attachment-access.ts', mocks);
  mocks['@/lib/attachment-access'] = access;
  const delivery = loadTs('../src/lib/private-file-delivery.ts', mocks);
  mocks['@/lib/private-file-delivery'] = delivery;
  const fileRoute = loadTs('../src/app/api/files/[id]/route.ts', mocks);
  const attachmentRoute = loadTs('../src/app/api/attachments/[id]/file/route.ts', mocks);
  const request = (href, options = {}) => new Request(`https://academy.test${href}`, options);
  return { access, delivery, reads, metadata, prisma,
    file: (options = {}) => fileRoute[options.method === 'HEAD' ? 'HEAD' : 'GET'](
      request(`/api/files/${fileId}${options.query ?? ''}`, options), { params: Promise.resolve({ id: options.id ?? fileId }) }),
    attachment: (options = {}) => attachmentRoute[options.method === 'HEAD' ? 'HEAD' : 'GET'](
      request(`/api/attachments/${ATTACHMENT}/file${options.query ?? ''}`, options), { params: Promise.resolve({ id: options.id ?? ATTACHMENT }) }),
  };
}

function assertPrivate(response) {
  assert.match(response.headers.get('cache-control'), /private.*no-store/);
  assert.equal(response.headers.get('cdn-cache-control'), 'no-store');
  assert.equal(response.headers.get('vary'), 'Cookie');
  assert.equal(response.headers.get('x-content-type-options'), 'nosniff');
}

test('authorized attachment serves the exact original multipage PDF inline with private headers and Arabic RFC5987 filename', async () => {
  const h = harness();
  const response = await h.attachment();
  assert.equal(response.status, 200);
  assert.equal(response.headers.get('content-type'), 'application/pdf');
  assert.match(response.headers.get('content-disposition'), /^inline; filename="document.pdf"; filename\*=UTF-8''%/);
  assert.equal(response.headers.get('content-length'), String(PDF.length));
  assertPrivate(response);
  const actual = Buffer.from(await response.arrayBuffer());
  assert.deepEqual(actual, PDF);
  assert.equal((await PDFDocument.load(actual)).getPageCount(), 3);
  assert.equal(h.reads.bytes, 1);
});

test('separate download=1 response uses attachment disposition without changing original bytes', async () => {
  const response = await harness().attachment({ query: '?download=1' });
  assert.equal(response.status, 200);
  assert.match(response.headers.get('content-disposition'), /^attachment;/);
  assert.deepEqual(Buffer.from(await response.arrayBuffer()), PDF);
});

test('HEAD supplies PDF length/type and never sends a response body', async () => {
  const response = await harness().attachment({ method: 'HEAD' });
  assert.equal(response.status, 200);
  assert.equal(response.headers.get('content-type'), 'application/pdf');
  assert.equal(response.headers.get('content-length'), String(PDF.length));
  assert.equal((await response.arrayBuffer()).byteLength, 0);
  assertPrivate(response);
});

test('single byte ranges, suffix ranges, open-ended ranges and HEAD ranges return correct 206 headers/bytes', async () => {
  for (const [range, start, end] of [['bytes=0-19', 0, 19], ['bytes=-25', PDF.length - 25, PDF.length - 1],
    [`bytes=${PDF.length - 12}-`, PDF.length - 12, PDF.length - 1]]) {
    const response = await harness().attachment({ headers: { Range: range } });
    assert.equal(response.status, 206);
    assert.equal(response.headers.get('content-range'), `bytes ${start}-${end}/${PDF.length}`);
    assert.deepEqual(Buffer.from(await response.arrayBuffer()), PDF.subarray(start, end + 1));
    assertPrivate(response);
  }
  const head = await harness().attachment({ method: 'HEAD', headers: { Range: 'bytes=0-19' } });
  assert.equal(head.status, 206);
  assert.equal(head.headers.get('content-length'), '20');
  assert.equal((await head.arrayBuffer()).byteLength, 0);
});

test('malformed, multiple, impossible, unsafe-number and zero-suffix byte ranges return416 privately', async () => {
  for (const range of ['bytes=5-1', 'bytes=-0', 'bytes=0-3,6-9', 'items=0-10', `bytes=${PDF.length}-`, 'bytes=99999999999999999999-']) {
    const response = await harness().attachment({ headers: { Range: range } });
    assert.equal(response.status, 416, range);
    assert.equal(response.headers.get('content-range'), `bytes */${PDF.length}`);
    assert.equal((await response.arrayBuffer()).byteLength, 0);
    assertPrivate(response);
  }
});

test('If-Range requires matching strong ETag or a sufficiently recent valid modification date', async () => {
  const etag = `"${createHash('sha256').update(PDF).digest('hex')}"`;
  for (const value of [etag, CREATED.toUTCString()]) {
    assert.equal((await harness().attachment({ headers: { Range: 'bytes=0-9', 'If-Range': value } })).status, 206);
  }
  for (const value of ['"other-version"', `W/${etag}`, new Date(CREATED.getTime() - 1000).toUTCString(), 'invalid-date']) {
    const response = await harness().attachment({ headers: { Range: 'bytes=0-9', 'If-Range': value } });
    assert.equal(response.status, 200);
    assert.deepEqual(Buffer.from(await response.arrayBuffer()), PDF);
  }
});

test('unauthenticated attachment and legacy file requests cannot read bytes or return cached304', async () => {
  for (const method of ['GET', 'HEAD']) {
    const h = harness({ user: null });
    const options = { method, headers: { 'If-None-Match': '*', 'If-Modified-Since': new Date().toUTCString(), Range: 'bytes=0-9' } };
    assert.equal((await h.attachment(options)).status, 401);
    assert.equal((await h.file(options)).status, 401);
    assert.equal(h.reads.bytes, 0);
  }
});

test('a different instructor or unenrolled student is rejected before reading document bytes', async () => {
  for (const user of [STUDENT, { id: 'different-teacher', role: 'INSTRUCTOR' }]) {
    const h = harness({ user });
    assert.equal((await h.attachment()).status, 403);
    assert.equal((await h.file()).status, 403);
    assert.equal(h.reads.bytes, 0);
  }
});

test('enrollment, course ownership, admin and owner grant read access', async () => {
  for (const config of [{ user: STUDENT, enrolled: true }, { user: OWNER },
    { user: { id: 'admin', role: 'ADMIN' } }, { user: { id: 'owner', role: 'OWNER' } }]) {
    const h = harness(config);
    assert.equal((await h.attachment()).status, 200);
    assert.equal((await h.file()).status, 200);
  }
});

test('only a signed-in user may read a genuinely free published chapter; free prices do not unlock course attachments', async () => {
  assert.equal((await harness({ user: STUDENT, chapter: { isFree: true } }).attachment()).status, 200);
  assert.equal((await harness({ user: null, chapter: { isFree: true } }).attachment()).status, 401);
  assert.equal((await harness({ user: STUDENT, chapter: { isFree: true }, course: { status: 'PENDING' } }).attachment()).status, 403);
  const h = harness({ user: STUDENT, chapter: { isFree: true }, course: { price: 0, priceSYP: 0 },
    attachment: { name: 'course.pdf', url: `/api/files/${KEY}`, chapterId: CHAPTER, courseId: COURSE } });
  assert.equal((await h.attachment()).status, 403);
});

test('historical inconsistent course/chapter and lesson/chapter associations fail before bytes', async () => {
  for (const target of [{ chapterId: CHAPTER, courseId: OTHER_COURSE }, { lessonId: LESSON, chapterId: OTHER_CHAPTER }]) {
    const h = harness({ attachment: { name: 'broken.pdf', url: `/api/files/${KEY}`, ...target } });
    assert.equal((await h.attachment()).status, 409);
    assert.equal(h.reads.bytes, 0);
  }
});

test('creation target helper requires exactly one current instructor-owned target', async () => {
  const { access } = harness();
  assert.equal((await access.assertAttachmentTarget(OWNER, { chapterId: CHAPTER })).courseId, COURSE);
  await assert.rejects(access.assertAttachmentTarget(OWNER, { chapterId: CHAPTER, courseId: COURSE }), error => error.status === 400);
  await assert.rejects(access.assertAttachmentTarget(STUDENT, { chapterId: CHAPTER }), error => error.status === 403);
  await assert.rejects(access.assertAttachmentTarget({ id: 'different', role: 'INSTRUCTOR' }, { chapterId: CHAPTER }), error => error.status === 403);
});

test('unbound new UUID file preview belongs to uploader; linked files apply current course access', async () => {
  assert.equal((await harness({ attachmentRefs: [] }).file()).status, 200);
  const denied = harness({ user: STUDENT, attachmentRefs: [] });
  assert.equal((await denied.file()).status, 403);
  assert.equal(denied.reads.bytes, 0);
  const reassigned = harness({ course: { instructorId: 'new-teacher' } });
  assert.equal((await reassigned.file()).status, 403);
  assert.equal(reassigned.reads.bytes, 0);
});

test('legacy StoredFile PDFs require an accessible attachment, lesson, or manual quiz reference', async () => {
  for (const config of [{ attachmentRefs: [{ chapterId: CHAPTER }] }, { attachmentRefs: [], lessonRefs: [{ id: LESSON }] },
    { attachmentRefs: [], quizRefs: [{ chapterId: CHAPTER }] }]) {
    const h = harness({ fileId: LEGACY_FILE, ...config });
    const response = await h.file();
    assert.equal(response.status, 200);
    assert.deepEqual(Buffer.from(await response.arrayBuffer()), PDF);
  }
  const unbound = harness({ fileId: LEGACY_FILE, attachmentRefs: [] });
  assert.equal((await unbound.file()).status, 403);
  assert.equal(unbound.reads.bytes, 0);
});

test('new legacy image fallback sidecar permits its uploader preview before binding, while other users stay blocked', async () => {
  const config = { fileId: LEGACY_FILE, bytes: Buffer.from('ffd8ffe000104a46494600', 'hex'),
    metadata: { name: 'receipt.jpg', mimeType: 'image/jpeg' }, attachmentRefs: [], legacyOwner: STUDENT.id };
  const response = await harness({ ...config, user: STUDENT }).file();
  assert.equal(response.status, 200);
  assertPrivate(response);
  assert.equal((await harness({ ...config, user: OWNER }).file()).status, 403);
  assert.equal((await harness({ ...config, user: null }).file()).status, 401);
});

test('an enrolled student cannot read another student quiz submission', async () => {
  const config = { attachmentRefs: [], submissionRefs: [{ userId: STUDENT.id, quiz: { chapterId: CHAPTER } }] };
  assert.equal((await harness({ ...config, user: STUDENT }).file()).status, 200);
  assert.equal((await harness({ ...config, user: OWNER }).file()).status, 200);
  assert.equal((await harness({ ...config, user: { id: 'peer', role: 'STUDENT' }, enrolled: true }).file()).status, 403);
});

test('payment and wallet receipt images stay private and remain readable by their owner/admin', async () => {
  const image = Buffer.from('ffd8ffe000104a46494600', 'hex');
  for (const kind of ['receiptRefs', 'walletRefs']) {
    const base = { fileId: LEGACY_FILE, bytes: image, metadata: { name: 'receipt.jpg', mimeType: 'image/jpeg' }, attachmentRefs: [], [kind]: [{ userId: STUDENT.id }] };
    const owned = await harness({ ...base, user: STUDENT }).file();
    assert.equal(owned.status, 200); assertPrivate(owned);
    assert.equal((await harness({ ...base, user: { id: 'peer', role: 'STUDENT' } }).file()).status, 403);
    assert.equal((await harness({ ...base, user: null }).file()).status, 401);
    assert.equal((await harness({ ...base, user: { id: 'admin', role: 'ADMIN' } }).file()).status, 200);
  }
});

test('a receipt URL cannot grant its owner access to another uploader UUID or an unrelated legacy PDF', async () => {
  for (const kind of ['receiptRefs', 'walletRefs']) {
    const base = { user: STUDENT, attachmentRefs: [], [kind]: [{ userId: STUDENT.id }] };
    const privateKey = harness(base);
    assert.equal((await privateKey.file()).status, 403);
    assert.equal(privateKey.reads.bytes, 0);
    const legacyPdf = harness({ ...base, fileId: LEGACY_FILE });
    assert.equal((await legacyPdf.file()).status, 403);
    assert.equal(legacyPdf.reads.bytes, 0);
    const disguised = await harness({ ...base, fileId: LEGACY_FILE, metadata: { name: 'receipt.jpg', mimeType: 'image/jpeg' } }).file();
    assert.equal(disguised.status, 415);
    const ownUpload = await harness({ ...base, metadata: { ownerId: STUDENT.id } }).file();
    assert.equal(ownUpload.status, 200);
  }
});

test('only intentional published covers/avatars preserve public image delivery; a mislabeled PDF cannot become public', async () => {
  const image = Buffer.from('ffd8ffe000104a46494600', 'hex');
  for (const ref of ['publicCover', 'publicAvatar']) {
    const response = await harness({ fileId: LEGACY_FILE, bytes: image, user: null, [ref]: true, metadata: { name: 'cover.jpg', mimeType: 'image/jpeg' } }).file();
    assert.equal(response.status, 200);
    assert.equal(response.headers.get('content-type'), 'image/jpeg');
    assert.match(response.headers.get('cache-control'), /^public,/);
  }
  const poisoned = await harness({ fileId: LEGACY_FILE, user: null, publicCover: true, metadata: { name: 'cover.jpg', mimeType: 'image/jpeg' } }).file();
  assert.equal(poisoned.status, 415);
  assertPrivate(poisoned);
  const privateKey = harness({ user: null, publicCover: true, metadata: { name: 'cover.jpg', mimeType: 'image/jpeg' } });
  assert.equal((await privateKey.file()).status, 401);
  assert.equal(privateKey.reads.bytes, 0);
});

test('JPEG bytes renamed or labeled as PDF are rejected rather than returned with PDF headers', async () => {
  const h = harness({ bytes: Buffer.from('ffd8ffe000104a46494600', 'hex') });
  const response = await h.attachment();
  assert.equal(response.status, 415);
  assert.match(response.headers.get('content-type'), /^application\/json/);
  assert.equal((await response.json()).requiresReupload, true);
  const mismatched = harness({ bytes: Buffer.from('ffd8ffe000104a46494600', 'hex'), metadata: { name: 'image.jpg', mimeType: 'image/jpeg' },
    attachment: { name: 'Original document.pdf', url: `/api/files/${KEY}`, chapterId: CHAPTER } });
  assert.equal((await mismatched.attachment()).status, 415);
});

test('truncated PDF is rejected as422 and never regenerated or converted', async () => {
  const response = await harness({ bytes: PDF.subarray(0, PDF.length - 30) }).attachment();
  assert.equal(response.status, 422);
  assert.equal((await response.json()).requiresReupload, true);
});

test('external ImgBB JPG, arbitrary remote PDFs, data URLs and protocol-relative sources fail410 without fetching', async t => {
  let fetches = 0;
  t.mock.method(globalThis, 'fetch', async () => { fetches++; throw Error('Remote fetch forbidden'); });
  for (const url of ['https://i.ibb.co/example/document.jpg', 'https://outside.test/document.pdf', 'data:application/pdf;base64,JVBER', '//outside.test/file.pdf']) {
    const h = harness({ attachment: { name: 'old.pdf', url, chapterId: CHAPTER } });
    const response = await h.attachment();
    assert.equal(response.status, 410);
    const body = await response.json();
    assert.equal(body.requiresReupload, true);
    assert.match(body.error, /إعادة رفع ملف PDF الأصلي/);
    assert.equal(h.reads.bytes, 0);
  }
  assert.equal(fetches, 0);
});

test('unauthorized legacy external attachment returns403 before source inspection', async () => {
  let sourceReads = 0;
  const attachment = { name: 'old.pdf', chapterId: CHAPTER, get url() { sourceReads++; return 'https://i.ibb.co/secret.jpg'; } };
  const h = harness({ user: STUDENT, attachment });
  assert.equal((await h.attachment()).status, 403);
  assert.equal(sourceReads, 0);
});

test('top-level browser navigation gets a friendly Arabic reupload HTML page with private headers', async () => {
  const h = harness({ attachment: { name: 'old.pdf', chapterId: CHAPTER, url: 'https://i.ibb.co/old.jpg' } });
  const response = await h.attachment({ headers: { Accept: 'text/html,application/pdf' } });
  assert.equal(response.status, 410);
  assert.match(response.headers.get('content-type'), /^text\/html/);
  assert.match(await response.text(), /إعادة رفع ملف PDF الأصلي/);
  assertPrivate(response);
});

test('strict identifiers and source parsing reject traversal, suffix aliases and external local-path tricks', async () => {
  const h = harness();
  for (const id of ['../secret', `${KEY}.pdf`, `${KEY}/file.pdf`, '%2e%2e', 'not-an-id']) {
    assert.equal((await h.file({ id })).status, 400);
  }
  for (const url of ['/uploads/../secret.pdf', '/uploads/%2e%2e%2fsecret.pdf', '/api/files/../secret', `https://outside.test/api/files/${KEY}`]) {
    assert.equal(h.delivery.parseAttachmentSource(url, 'https://academy.test').kind, 'unavailable');
  }
});

test('legacy /uploads requires an explicit original-file volume; missing originals return410', async t => {
  const previous = process.env.DOCUMENT_LEGACY_STORAGE_DIR;
  delete process.env.DOCUMENT_LEGACY_STORAGE_DIR;
  t.after(() => { if (previous === undefined) delete process.env.DOCUMENT_LEGACY_STORAGE_DIR; else process.env.DOCUMENT_LEGACY_STORAGE_DIR = previous; });
  const response = await harness({ attachment: { name: 'lecture.pdf', chapterId: CHAPTER, url: '/uploads/original.pdf' } }).attachment();
  assert.equal(response.status, 410);
  assert.equal((await response.json()).requiresReupload, true);
});

test('authorized local legacy volume returns exact original PDF without public/uploads fallback', async t => {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'kq-delivery-test-'));
  const previous = process.env.DOCUMENT_LEGACY_STORAGE_DIR;
  process.env.DOCUMENT_LEGACY_STORAGE_DIR = directory;
  t.after(async () => {
    if (previous === undefined) delete process.env.DOCUMENT_LEGACY_STORAGE_DIR; else process.env.DOCUMENT_LEGACY_STORAGE_DIR = previous;
    if (!path.resolve(directory).startsWith(path.resolve(os.tmpdir()) + path.sep + 'kq-delivery-test-')) throw Error('Unsafe cleanup target');
    await fs.rm(directory, { recursive: true, force: true });
  });
  await fs.writeFile(path.join(directory, 'original.pdf'), PDF);
  const response = await harness({ attachment: { name: 'lecture.pdf', chapterId: CHAPTER, url: '/uploads/original.pdf' } }).attachment();
  assert.equal(response.status, 200);
  assert.deepEqual(Buffer.from(await response.arrayBuffer()), PDF);
  assertPrivate(response);
});

test('private PDF ignores old validators after authorization and never returns304', async () => {
  const etag = `"${createHash('sha256').update(PDF).digest('hex')}"`;
  const h = harness();
  const response = await h.file({ headers: { 'If-None-Match': etag, 'If-Modified-Since': new Date().toUTCString() } });
  assert.equal(response.status, 200);
  assert.equal(h.reads.bytes, 1);
  assertPrivate(response);
});

test('oversized legacy metadata is rejected before decoding the database document', async () => {
  const h = harness({ fileId: LEGACY_FILE, metadata: { size: 21 * 1024 * 1024 } });
  assert.equal((await h.file()).status, 413);
  assert.equal(h.reads.bytes, 0);
});
