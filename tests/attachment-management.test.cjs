const assert = require('node:assert/strict');
const test = require('node:test');
const { loadTs } = require('./load-ts.cjs');
const { classifyAttachment, auditAttachments } = require('../scripts/audit-attachments.cjs');

const LESSON = 'c' + 'a'.repeat(24);
const CHAPTER = 'c' + 'b'.repeat(24);
const COURSE = 'c' + 'c'.repeat(24);
const KEY = '11111111-2222-4333-8444-555555555555';
const USER = { id: 'teacher-1', role: 'INSTRUCTOR' };

function harness({ user = USER, owner = USER.id, fileOwner = USER.id, present = true } = {}) {
  const writes = [];
  const course = { id: COURSE, instructorId: owner, status: 'PUBLISHED' };
  const chapter = { id: CHAPTER, courseId: COURSE, course, isFree: false };
  class PrivateFileError extends Error { constructor(status, message) { super(message); this.status = status; } }
  const mocks = {
    'next-auth': { getServerSession: async () => user ? { user } : null },
    '@/lib/auth': { authOptions: {} },
    '@/lib/db': { prisma: {
      lesson: { findUnique: async () => ({ chapter }) }, chapter: { findUnique: async () => chapter },
      course: { findUnique: async () => course },
      attachment: {
        create: async args => { writes.push(args); return { id: 'attachment', ...args.data }; },
        findUnique: async () => ({ id: 'attachment', chapterId: CHAPTER }),
        delete: async args => { writes.push(args); },
      },
    } },
    '@/lib/private-file-storage': {
      PrivateFileError,
      isPrivateFileId: value => value === KEY,
      readPrivateFileMetadata: async () => present ? { ownerId: fileOwner } : null,
    },
  };
  const access = loadTs('../src/lib/attachment-access.ts', mocks);
  mocks['@/lib/attachment-access'] = access;
  return { writes,
    create: loadTs('../src/app/api/attachments/route.ts', mocks).POST,
    remove: loadTs('../src/app/api/attachments/[id]/route.ts', mocks).DELETE,
    owned: loadTs('../src/lib/owned-document.ts', mocks).assertOwnedDocumentReference,
  };
}
const request = extra => new Request('https://academy.test/api/attachments', {
  method: 'POST', headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ name: 'Lecture notes', url: `/api/files/${KEY}`, chapterId: CHAPTER, ...extra }),
});

test('attachment creation links only an owned original to an instructor-owned target', async () => {
  const h = harness();
  assert.equal((await h.create(request())).status, 201);
  assert.equal(h.writes.length, 1);
  assert.equal(h.writes[0].data.url, `/api/files/${KEY}`);
});

test('external JPG, data URL, traversal and unowned legacy file cannot be newly attached', async () => {
  const h = harness();
  for (const url of ['https://i.ibb.co/abc/image.jpg', 'https://host.test/private.pdf', 'data:application/pdf;base64,JVBERi0=', '/api/files/../../secret', '/api/files/' + LESSON]) {
    assert.equal((await h.create(request({ url }))).status, 400);
  }
  assert.equal(h.writes.length, 0);
});

test('student, foreign instructor, missing original, foreign upload, and multiple targets never write', async () => {
  for (const [config, extra, expected] of [
    [{ user: null }, {}, 401], [{ user: { id: 'student', role: 'STUDENT' } }, {}, 403],
    [{ owner: 'other-teacher' }, {}, 403], [{ fileOwner: 'other-teacher' }, {}, 403],
    [{ present: false }, {}, 410], [{}, { lessonId: LESSON }, 400],
  ]) {
    const h = harness(config);
    assert.equal((await h.create(request(extra))).status, expected);
    assert.equal(h.writes.length, 0);
  }
});

test('foreign instructor cannot delete another course attachment', async () => {
  const h = harness({ owner: 'other-teacher' });
  assert.equal((await h.remove(request(), { params: Promise.resolve({ id: 'attachment' }) })).status, 403);
  assert.equal(h.writes.length, 0);
});

test('lesson/quiz document guard prevents granting a foreign upload to another course', async () => {
  const foreign = harness({ fileOwner: 'other-teacher' });
  await assert.rejects(foreign.owned(USER, `/api/files/${KEY}`), error => error.status === 403);
  await harness().owned(USER, `/api/files/${KEY}`);
  await foreign.owned(USER, 'https://iframe.mediadelivery.net/embed/123/video');
  await foreign.owned({ id: 'admin', role: 'ADMIN' }, `/api/files/${KEY}`);
  for (const alias of [`https://academy.test/api/files/${KEY}`, `//academy.test/api/files/${KEY}`, `/api/files/${KEY}?download=1`, `/%61pi/files/${KEY}`]) {
    await assert.rejects(foreign.owned(USER, alias), error => error.status === 400);
  }
});

test('student serialization replaces every raw external attachment URL without mutating source records', () => {
  const { protectCourseAttachmentLinks } = loadTs('../src/lib/attachment-links.ts');
  const bad = { id: 'one', name: 'Notes', url: 'https://i.ibb.co/abc/image.jpg' };
  const source = { attachments: [bad], chapters: [{ attachments: [bad], lessons: [{ attachments: [bad] }] }] };
  const protectedCourse = protectCourseAttachmentLinks(source);
  assert.equal(JSON.stringify(protectedCourse).includes('i.ibb.co'), false);
  for (const item of [protectedCourse, protectedCourse.chapters[0], protectedCourse.chapters[0].lessons[0]]) {
    assert.equal(item.attachments[0].url, '/api/attachments/one/file');
    assert.equal(item.attachments[0].downloadUrl, '/api/attachments/one/file?download=1');
    assert.equal(item.attachments[0].requiresReupload, true);
  }
  assert.equal(source.attachments[0].url, bad.url);
});

test('nested course writes cannot bypass document ownership checks, and foreign instructors cannot mark a chapter free', async () => {
  let writes = 0;
  const mocks = {
    '@/lib/rbac': { requireRoleApi: async () => ({ authorized: true, session: { user: USER } }) },
    '@/lib/bunny-upload-server': { assertBunnyVideoReady: async () => {}, BunnyServerError: class extends Error {} },
    '@/lib/db': { prisma: {
      course: { findUnique: async () => ({ instructorId: USER.id }), update: async () => { writes++; } },
      chapter: { findUnique: async () => ({ course: { instructorId: 'foreign-teacher' } }),
        update: async () => { writes++; }, delete: async () => { writes++; } },
      lesson: { deleteMany: async () => { writes++; } },
    } },
  };
  const course = loadTs('../src/app/api/courses/[id]/route.ts', mocks);
  const chapter = loadTs('../src/app/api/chapters/[chapterId]/route.ts', mocks);
  for (const key of ['chapters', 'attachments', 'instructor']) {
    assert.equal((await course.PUT(request({ [key]: { create: {} } }), { params: Promise.resolve({ id: COURSE }) })).status, 400);
  }
  assert.equal((await chapter.PUT(request({ isFree: true }), { params: Promise.resolve({ chapterId: CHAPTER }) })).status, 403);
  assert.equal((await chapter.DELETE(request(), { params: Promise.resolve({ chapterId: CHAPTER }) })).status, 403);
  assert.equal(writes, 0);
});

test('legacy inventory is strictly READ ONLY and classifies bad image sources without any fetch or repair', async () => {
  const statements = [];
  const db = { $transaction: async fn => fn({
    $executeRawUnsafe: async sql => { statements.push(sql); assert.equal(sql, 'SET TRANSACTION READ ONLY'); },
    $queryRawUnsafe: async sql => {
      statements.push(sql);
      assert.match(sql, /^SELECT /);
      return sql.includes('FROM "StoredFile"') ? [{ total: 0, declaredPdf: 0, pdfMagicCandidates: 0 }]
        : [{ id: 'bad', name: 'Notes', url: 'https://i.ibb.co/abc/image.jpg' }];
    },
  }) };
  const report = await auditAttachments(db);
  assert.equal(report.total, 1);
  assert.equal(report.externalRequests, 0);
  assert.equal(report.repairedRecords, 0);
  assert.equal(report.counts['external-image-is-not-original-pdf'], 1);
  assert.equal(classifyAttachment({ url: '/api/files/' + LESSON }), 'internal-file-needs-byte-validation');
  assert.equal(statements.length, 3);
});
