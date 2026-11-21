const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const { PDFDocument, StandardFonts } = require('pdf-lib');
const { loadTs } = require('./load-ts.cjs');

class RequestUserError extends Error { constructor(status, message = 'denied') { super(message); this.status = status; } }
const requestUser = user => ({ RequestUserError, requireRequestUser: async (_req, roles) => {
  if (!user) throw new RequestUserError(401);
  if (roles && !roles.includes(user.role)) throw new RequestUserError(403);
  return user;
} });
const json = (body, method = 'POST') => new Request('https://academy.test/x', { method, headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
const INSTRUCTOR = { id: 'teacher-1', role: 'INSTRUCTOR' };
const OTHER = { id: 'teacher-2', role: 'INSTRUCTOR' };
const OWNER = { id: 'owner-1', role: 'OWNER' };

// ---------------------------------------------------------------- course lists
test('managed course list: instructors see their own courses, OWNER/ADMIN all, students are refused', async () => {
  for (const [user, expected] of [[INSTRUCTOR, { instructorId: 'teacher-1' }], [OWNER, {}], [{ id: 'a', role: 'ADMIN' }, {}]]) {
    const wheres = [];
    const route = loadTs('../src/app/api/instructor/courses/route.ts', {
      '@/lib/request-user': requestUser(user),
      '@/lib/db': { prisma: { course: { findMany: async q => { wheres.push(q.where); return [{ id: 'c1', title: 'C', status: 'DRAFT', instructorId: 'teacher-1', chapters: [{ id: 'ch1', title: 'One' }] }]; } } } },
    });
    const res = await route.GET(new Request('https://academy.test/api/instructor/courses?for=live'));
    assert.equal(res.status, 200);
    assert.deepEqual(wheres[0], expected);
    const body = await res.json();
    assert.equal(body.courses[0].ownCourse, user.id === 'teacher-1');
    assert.equal(body.courses[0].instructorId, undefined, 'no internal ids beyond what pickers need');
  }
  const student = loadTs('../src/app/api/instructor/courses/route.ts', { '@/lib/request-user': requestUser({ id: 's', role: 'STUDENT' }), '@/lib/db': { prisma: {} } });
  assert.equal((await student.GET(new Request('https://academy.test/api/instructor/courses'))).status, 403);
});

test('quiz manager and live manager pages use the shared course rule, not instructorId for every role', () => {
  for (const file of ['src/app/instructor/quizzes/page.tsx', 'src/app/instructor/live/page.tsx', 'src/app/instructor/quizzes/ai/page.tsx']) {
    const source = fs.readFileSync(path.join(__dirname, '..', file), 'utf8');
    assert.match(source, /managedCourse(Where|sWithChapters)\(user\)/, file);
    assert.doesNotMatch(source, /instructorId: session\.user\.id/, file);
  }
});

// ---------------------------------------------------------------- live sessions
function liveDb({ course = { id: 'course-1', instructorId: 'teacher-1' }, chapterCourse = 'course-1', quota = 3, open = 0, session } = {}) {
  const state = { created: [], lessons: [], updates: [], transitions: [] };
  const tx = {
    $queryRaw: async () => [{ maxLiveStreams: quota }],
    liveClass: {
      count: async () => open,
      create: async ({ data }) => { const row = { id: `lc${state.created.length + 1}`, lessonId: null, ...data }; state.created.push(row); return row; },
      update: async ({ where, data }) => { state.updates.push({ where, data }); return { ...state.created.find(r => r.id === where.id), ...data }; },
    },
    lesson: {
      findFirst: async () => ({ order: 4 }),
      create: async ({ data }) => { const row = { id: 'lesson-1', ...data }; state.lessons.push(row); return row; },
    },
  };
  const prisma = {
    course: { findUnique: async () => course },
    chapter: { findUnique: async () => (chapterCourse ? { courseId: chapterCourse } : null) },
    $transaction: fn => fn(tx),
    liveClass: {
      findUnique: async () => session ?? null,
      updateMany: async ({ where, data }) => {
        state.transitions.push({ where, data });
        if (!session || !where.status.in.includes(session.status)) return { count: 0 };
        session.status = data.status; return { count: 1 };
      },
    },
  };
  const lib = loadTs('../src/lib/live-sessions.ts', { '@/lib/db': { prisma }, '@/lib/permission-check': { hasPermission: async () => true } });
  return { lib, state, session };
}

test('instructor creates an immediate session; it stays upcoming until the studio connects', async () => {
  const { lib, state } = liveDb();
  const session = await lib.createLiveSession(INSTRUCTOR, { title: ' حصة ', courseId: 'course-1', isImmediate: true });
  assert.equal(session.status, 'upcoming');
  assert.equal(session.title, 'حصة');
  assert.equal(state.lessons.length, 0);
});

test('scheduling inside a chapter creates ONE LiveClass and its lesson sharing the live_<id> room', async () => {
  const { lib, state } = liveDb();
  const when = new Date(Date.now() + 86_400_000).toISOString();
  const session = await lib.createLiveSession(INSTRUCTOR, { title: 'مراجعة', courseId: 'course-1', chapterId: 'ch1', scheduledAt: when });
  assert.equal(state.created.length, 1);
  assert.equal(state.lessons.length, 1);
  assert.equal(state.lessons[0].liveRoomName, `live_${state.created[0].id}`);
  assert.equal(state.lessons[0].isLive, true);
  assert.equal(state.lessons[0].order, 5);
  assert.equal(session.lessonId, 'lesson-1');
});

test('live creation refuses foreign courses, foreign chapters, past times and exceeded quotas', async () => {
  const future = new Date(Date.now() + 3_600_000).toISOString();
  await assert.rejects(liveDb().lib.createLiveSession(OTHER, { title: 'x', courseId: 'course-1', isImmediate: true }), e => e.status === 403);
  await assert.rejects(liveDb({ chapterCourse: 'course-9' }).lib.createLiveSession(INSTRUCTOR, { title: 'x', courseId: 'course-1', chapterId: 'ch', scheduledAt: future }), e => e.status === 403);
  await assert.rejects(liveDb().lib.createLiveSession(INSTRUCTOR, { title: 'x', courseId: 'course-1', scheduledAt: '2020-01-01T00:00:00Z' }), e => e.status === 400);
  await assert.rejects(liveDb().lib.createLiveSession(INSTRUCTOR, { title: 'x', courseId: 'course-1', scheduledAt: 'not a date' }), e => e.status === 400);
  await assert.rejects(liveDb({ quota: 1, open: 1 }).lib.createLiveSession(INSTRUCTOR, { title: 'x', courseId: 'course-1', isImmediate: true }), e => e.status === 409);
  await assert.rejects(liveDb().lib.createLiveSession(INSTRUCTOR, { title: '', courseId: 'course-1', isImmediate: true }), e => e.status === 400);
});

test('session lifecycle: start -> live, end -> ended, cancel only upcoming; others are refused', async () => {
  const base = () => ({ id: 's1', instructorId: 'teacher-1', status: 'upcoming', scheduledAt: new Date(), course: { instructorId: 'teacher-1' } });
  const a = liveDb({ session: base() });
  assert.deepEqual(await a.lib.transitionLiveSession(INSTRUCTOR, 's1', 'start'), { status: 'live', changed: true });
  assert.ok(a.state.transitions[0].data.startedAt instanceof Date);
  assert.deepEqual(await a.lib.transitionLiveSession(INSTRUCTOR, 's1', 'end'), { status: 'ended', changed: true });
  await assert.rejects(a.lib.transitionLiveSession(INSTRUCTOR, 's1', 'cancel'), e => e.status === 409, 'ended cannot be cancelled');
  await assert.rejects(liveDb({ session: base() }).lib.transitionLiveSession(OTHER, 's1', 'start'), e => e.status === 403);
  await assert.rejects(liveDb({ session: base() }).lib.transitionLiveSession(INSTRUCTOR, 's1', 'publish'), e => e.status === 400);
  await assert.rejects(liveDb().lib.transitionLiveSession(INSTRUCTOR, 'missing', 'start'), e => e.status === 404);
});

test('an expired scheduled session cannot be started', async () => {
  const old = { id: 's1', instructorId: 'teacher-1', status: 'upcoming', scheduledAt: new Date(Date.now() - 13 * 3_600_000), course: { instructorId: 'teacher-1' } };
  await assert.rejects(liveDb({ session: old }).lib.transitionLiveSession(INSTRUCTOR, 's1', 'start'), e => e.status === 410);
  const rules = loadTs('../src/lib/live-session-rules.ts');
  assert.equal(rules.displayStatus(old), 'expired');
  assert.equal(rules.displayStatus({ status: 'live', scheduledAt: old.scheduledAt }), 'live', 'a running session never expires');
});

test('concurrent status changes apply once: the losing request gets 409', async () => {
  const session = { id: 's1', instructorId: 'teacher-1', status: 'upcoming', scheduledAt: new Date(), course: { instructorId: 'teacher-1' } };
  const { lib } = liveDb({ session });
  const results = await Promise.allSettled([lib.transitionLiveSession(INSTRUCTOR, 's1', 'start'), lib.transitionLiveSession(INSTRUCTOR, 's1', 'cancel')]);
  assert.equal(results.filter(r => r.status === 'fulfilled').length, 1);
  assert.equal(results.filter(r => r.status === 'rejected' && r.reason.status === 409).length, 1);
});

test('the old lesson scheduling endpoint creates the same unified session', async () => {
  const created = [];
  const route = loadTs('../src/app/api/lessons/live/route.ts', {
    '@/lib/request-user': requestUser(INSTRUCTOR),
    '@/lib/live-sessions': { LiveSessionError: class extends Error {}, createLiveSession: async (actor, input) => { created.push({ actor, input }); return { id: 'lc1', lessonId: 'l1' }; } },
  });
  const res = await route.POST(json({ title: 'x', courseId: 'c', chapterId: 'ch', liveStartTime: '2030-01-01T10:00:00Z' }));
  assert.equal(res.status, 201);
  assert.equal(created[0].input.scheduledAt, '2030-01-01T10:00:00Z');
  assert.equal((await res.json()).lessonId, 'l1');
});

test('LiveKit configuration is reported as booleans and names only, never values', () => {
  const saved = { ...process.env };
  try {
    process.env.LIVEKIT_API_KEY = 'secret-key-value'; delete process.env.LIVEKIT_API_SECRET; process.env.NEXT_PUBLIC_LIVEKIT_URL = 'https://not-a-websocket';
    const { lib } = liveDb();
    const config = lib.liveKitConfiguration();
    assert.equal(config.ready, false);
    assert.deepEqual(config.missing, ['LIVEKIT_API_SECRET']);
    assert.equal(config.invalidUrl, true);
    assert.doesNotMatch(JSON.stringify(config), /secret-key-value/);
  } finally { process.env = saved; }
});

// ---------------------------------------------------------------- file quizzes
const fileStorage = loadTs('../src/lib/private-file-storage.ts');
function quizCreate(user, { ownedCheck = async () => {} } = {}) {
  const created = [];
  const prisma = {
    chapter: { findUnique: async () => ({ courseId: 'course-1' }) },
    course: { findUnique: async () => ({ instructorId: 'teacher-1' }) },
    $transaction: fn => fn({ quiz: { create: async ({ data }) => { created.push(data); return { id: 'q1', ...data }; } }, question: { createMany: async () => ({ count: 0 }) } }),
  };
  const route = loadTs('../src/app/api/quizzes/create/route.ts', {
    '@/lib/request-user': requestUser(user), '@/lib/db': { prisma },
    '@/lib/owned-document': { assertOwnedDocumentReference: ownedCheck },
    '@/lib/private-file-storage': fileStorage,
  });
  return { route, created };
}

test('a MANUAL_FILE chapter quiz saves with its document, marks, pass mark, attempts and certificate flag', async () => {
  const checked = [];
  const { route, created } = quizCreate(INSTRUCTOR, { ownedCheck: async (u, url) => { checked.push([u.id, url]); } });
  const res = await route.POST(json({ type: 'MANUAL_FILE', chapterId: 'ch1', title: 'ملف', fileUrl: '/api/files/abc', totalMarks: 40, passingPercent: 50, maxAttempts: 2, isPublished: false, requiredForCertificate: true }));
  assert.equal(res.status, 200);
  assert.deepEqual(checked, [['teacher-1', '/api/files/abc']], 'the document must be the instructor\'s own upload');
  assert.equal(created[0].type, 'MANUAL_FILE');
  assert.equal(created[0].fileUrl, '/api/files/abc');
  assert.equal(created[0].totalMarks, 40);
  assert.equal(created[0].passingScore, 20);
  assert.equal(created[0].maxAttempts, 2);
  assert.equal(created[0].isPublished, false);
  assert.equal(created[0].requiredForCertificate, true);
  assert.ok(created[0].requiredSince instanceof Date);
});

test('file quiz creation refuses missing documents, someone else\'s upload and foreign courses', async () => {
  assert.equal((await quizCreate(INSTRUCTOR).route.POST(json({ type: 'MANUAL_FILE', chapterId: 'ch1', title: 'x' }))).status, 400);
  const { PrivateFileError } = fileStorage;
  const stolen = quizCreate(INSTRUCTOR, { ownedCheck: async () => { throw new PrivateFileError(403, 'not yours'); } });
  assert.equal((await stolen.route.POST(json({ type: 'MANUAL_FILE', chapterId: 'ch1', title: 'x', fileUrl: '/api/files/other' }))).status, 403);
  assert.equal(stolen.created.length, 0);
  assert.equal((await quizCreate(OTHER).route.POST(json({ type: 'MANUAL_FILE', chapterId: 'ch1', title: 'x', fileUrl: '/api/files/a' }))).status, 403);
});

test('the file-quiz button opens the editor inside the quiz manager (no redirect away)', () => {
  const list = fs.readFileSync(path.join(__dirname, '../src/app/instructor/quizzes/QuizzesListClient.tsx'), 'utf8');
  assert.match(list, /onClick=\{\(\) => setEditor\(fileQuiz\(\)\)\}/);
  assert.doesNotMatch(list, /href="\/instructor\/quizzes\/create"/);
  const editor = fs.readFileSync(path.join(__dirname, '../src/app/instructor/quizzes/QuizEditor.tsx'), 'utf8');
  assert.match(editor, /form\.append\('courseId', courseId\)/, 'uploads are bound to the course for ownership checks');
  const old = fs.readFileSync(path.join(__dirname, '../src/app/instructor/quizzes/create/page.tsx'), 'utf8');
  assert.match(old, /redirect\('\/instructor\/quizzes\?new=file'\)/);
});

// ---------------------------------------------------------------- AI PDF generator
async function realPdf(pages = 2) {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  for (let i = 0; i < pages; i++) doc.addPage([300, 300]).drawText(`Page ${i + 1}: photosynthesis converts light into energy.`, { x: 10, y: 150, size: 8, font });
  return doc.save();
}
const generator = () => loadTs('../src/lib/ai-quiz-generator.ts');
const q = (i, extra = {}) => ({ text: `What does section ${i} of the document explain?`, options: [`Answer ${i}`, `Wrong ${i}a`, `Wrong ${i}b`, `Wrong ${i}c`], correctAnswer: i % 4, ...extra });

test('a real multi-page PDF is accepted and its pages counted', async () => {
  const { inspectPdf } = generator();
  assert.deepEqual(await inspectPdf(await realPdf(3), 'lesson.pdf', 'application/pdf'), { pages: 3 });
});

test('non-PDF, renamed, oversized, truncated and empty files are rejected before any AI call', async () => {
  const { inspectPdf, AI_PDF_MAX_BYTES } = generator();
  const pdf = await realPdf(1);
  await assert.rejects(inspectPdf(Buffer.from('\x89PNG\r\n\x1a\n fake'), 'image.pdf', 'application/pdf'), e => e.status === 415);
  await assert.rejects(inspectPdf(pdf, 'lesson.docx', 'application/pdf'), e => e.status === 415);
  await assert.rejects(inspectPdf(pdf, 'lesson.pdf', 'image/png'), e => e.status === 415);
  await assert.rejects(inspectPdf(new Uint8Array(AI_PDF_MAX_BYTES + 1), 'big.pdf', 'application/pdf'), e => e.status === 413);
  await assert.rejects(inspectPdf(pdf.slice(0, pdf.length - 40), 'cut.pdf', 'application/pdf'), e => e.status === 422);
  await assert.rejects(inspectPdf(new Uint8Array(0), 'empty.pdf', 'application/pdf'), e => e.status === 400);
});

test('exactly 50 validated, distinct questions in batches, with the real PDF sent every time', async () => {
  const { generateQuestionsFromPdf, BATCH_SIZE } = generator();
  const pdf = await realPdf(2);
  const calls = [];
  let n = 0;
  const result = await generateQuestionsFromPdf(pdf, { count: 50, difficulty: 'mixed', language: 'ar', pages: 2 }, async parts => {
    calls.push(parts);
    const want = Number(/exactly (\d+)/.exec(parts[1].text)[1]);
    return { json: { insufficientContent: false, questions: Array.from({ length: want }, () => q(n++)) }, truncated: false };
  });
  assert.equal(result.generated, 50);
  assert.equal(result.questions.length, 50);
  assert.equal(result.limitation, null);
  assert.equal(calls.length, 50 / BATCH_SIZE);
  assert.ok(calls.every(p => p[0].inline_data.mime_type === 'application/pdf' && p[0].inline_data.data === Buffer.from(pdf).toString('base64')));
  assert.equal(new Set(result.questions.map(x => x.text)).size, 50);
  assert.ok(result.questions.every(x => x.options.length === 4 && x.correctAnswer >= 0 && x.correctAnswer < 4 && x.points === 1));
});

test('malformed and duplicate questions are discarded and counted, never passed through', async () => {
  const { generateQuestionsFromPdf, validateGeneratedQuestion } = generator();
  assert.equal(validateGeneratedQuestion(q(1, { correctAnswer: 4 })), null, 'answer outside the options');
  assert.equal(validateGeneratedQuestion(q(1, { options: ['only one'] })), null, 'fewer than two options');
  assert.equal(validateGeneratedQuestion(q(1, { options: ['Same', 'same ', 'x', 'y'] })), null, 'duplicate options');
  assert.equal(validateGeneratedQuestion(q(1, { text: '' })), null);
  assert.equal(validateGeneratedQuestion({ ...q(1), correctAnswer: '1.5' }), null);
  let batch = 0;
  const result = await generateQuestionsFromPdf(await realPdf(), { count: 5, difficulty: 'easy', language: 'en', pages: 1 }, async () => {
    batch++;
    return { json: { insufficientContent: batch > 1, questions: batch === 1 ? [q(1), q(1), q(2, { correctAnswer: 9 }), q(3), { text: 'nope' }] : [] }, truncated: false };
  });
  assert.equal(result.generated, 2);
  assert.equal(result.duplicates, 1);
  assert.equal(result.rejected, 2);
  assert.match(result.limitation, /لا يكفي/);
});

test('insufficient source material is reported honestly with the lower count', async () => {
  const { generateQuestionsFromPdf } = generator();
  const result = await generateQuestionsFromPdf(await realPdf(), { count: 50, difficulty: 'mixed', language: 'ar', pages: 1 }, async () =>
    ({ json: { insufficientContent: true, note: 'الملف صفحة واحدة قصيرة', questions: [q(1), q(2), q(3)] }, truncated: false }));
  assert.equal(result.generated, 3);
  assert.equal(result.requested, 50);
  assert.match(result.limitation, /الملف صفحة واحدة قصيرة/);
});

test('truncated output is retried as a smaller batch', async () => {
  const { generateQuestionsFromPdf } = generator();
  const sizes = [];
  let n = 0;
  const result = await generateQuestionsFromPdf(await realPdf(), { count: 10, difficulty: 'mixed', language: 'ar', pages: 1 }, async parts => {
    const want = Number(/exactly (\d+)/.exec(parts[1].text)[1]);
    sizes.push(want);
    if (sizes.length === 1) return { json: null, truncated: true };
    return { json: { insufficientContent: false, questions: Array.from({ length: want }, () => q(n++)) }, truncated: false };
  });
  assert.equal(sizes[0], 10);
  assert.equal(sizes[1], 5);
  assert.equal(result.generated, 10);
});

test('provider failures surface as real errors: no key, or nothing generated', async () => {
  const provider = loadTs('../src/lib/ai-provider.ts');
  const { AiError } = provider;
  const { generateQuestionsFromPdf } = loadTs('../src/lib/ai-quiz-generator.ts', { '@/lib/ai-provider': provider });
  const pdf = await realPdf();
  await assert.rejects(generateQuestionsFromPdf(pdf, { count: 5, difficulty: 'mixed', language: 'ar', pages: 1 }, async () => { throw new AiError(503, 'لم يُضبط مفتاح الخدمة GEMINI_API_KEY'); }), e => e.status === 503);
  await assert.rejects(generateQuestionsFromPdf(pdf, { count: 5, difficulty: 'mixed', language: 'ar', pages: 1 }, async () => { throw new AiError(503, 'busy'); }), e => e.status === 503);
  await assert.rejects(generateQuestionsFromPdf(pdf, { count: 5, difficulty: 'mixed', language: 'ar', pages: 1 }, async () => ({ json: null, truncated: true })), e => e.status === 502);
});

test('the PDF route: no key -> 503 without questions; invalid upload -> rejected; foreign course -> 403; nothing is saved', async () => {
  const saved = process.env.GEMINI_API_KEY;
  delete process.env.GEMINI_API_KEY;
  const pdf = await realPdf();
  const form = (file, extra = {}) => {
    const f = new FormData();
    f.append('file', file); f.append('courseId', 'course-1');
    for (const [k, v] of Object.entries(extra)) f.append(k, v);
    return new Request('https://academy.test/api/ai/quiz-from-pdf', { method: 'POST', body: f });
  };
  const writes = [];
  const prisma = { course: { findUnique: async () => ({ instructorId: 'teacher-1' }) }, quiz: { create: async d => writes.push(d) }, question: { createMany: async d => writes.push(d) } };
  const load = user => loadTs('../src/app/api/ai/quiz-from-pdf/route.ts', { '@/lib/request-user': requestUser(user), '@/lib/db': { prisma } });
  try {
    const res = await load(INSTRUCTOR).POST(form(new File([pdf], 'lesson.pdf', { type: 'application/pdf' })));
    assert.equal(res.status, 503);
    const body = await res.json();
    assert.equal(body.questions, undefined);
    assert.match(body.error, /GEMINI_API_KEY/);
    assert.equal((await load(INSTRUCTOR).POST(form(new File(['hello'], 'lesson.pdf', { type: 'application/pdf' })))).status, 415);
    assert.equal((await load(OTHER).POST(form(new File([pdf], 'lesson.pdf', { type: 'application/pdf' })))).status, 403);
    assert.equal((await load(INSTRUCTOR).POST(form(new File([pdf], 'lesson.pdf', { type: 'application/pdf' }), { count: '500' }))).status, 400);
    assert.equal((await load({ id: 's', role: 'STUDENT' }).POST(form(new File([pdf], 'lesson.pdf')))).status, 403);
    assert.deepEqual(writes, [], 'generation never writes to the database');
  } finally { if (saved === undefined) delete process.env.GEMINI_API_KEY; else process.env.GEMINI_API_KEY = saved; }
});

test('generated questions are saved only after review, hidden and not required for the certificate', () => {
  const client = fs.readFileSync(path.join(__dirname, '../src/app/instructor/quizzes/ai/AiQuizClient.tsx'), 'utf8');
  assert.match(client, /if \(!reviewed\) return setError/);
  assert.match(client, /isPublished: false, requiredForCertificate: false/);
  const dashboard = fs.readFileSync(path.join(__dirname, '../src/app/instructor/InstructorDashboardClient.tsx'), 'utf8');
  assert.doesNotMatch(dashboard, /تكيفي/, 'no adaptive-testing claim without adaptation');
});
