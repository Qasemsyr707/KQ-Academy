/* eslint-disable @typescript-eslint/no-require-imports -- Node test runner. */
const assert = require('node:assert/strict');
const test = require('node:test');
const { randomUUID } = require('node:crypto');
const { loadTs } = require('./load-ts.cjs');
const { testDatabaseUrl, createTestPrisma } = require('./helpers/security-postgres.cjs');

const skip = !testDatabaseUrl() && 'No explicit isolated PostgreSQL test database configured';

/** Real modules against a real, disposable PostgreSQL database. */
function load(prisma) {
  const mocks = { '@/lib/db': { prisma } };
  const notifications = loadTs('../src/lib/notifications.ts', mocks);
  mocks['@/lib/notifications'] = notifications;
  const progress = loadTs('../src/lib/course-progress.ts', mocks);
  mocks['@/lib/course-progress'] = progress;
  const certificates = loadTs('../src/lib/certificate-issue.ts', mocks);
  return { notifications, progress, certificates };
}

async function fixture(prisma, { quizzes = 1, price = 10 } = {}) {
  const p = `nc_test_${randomUUID()}`;
  const ids = { teacher: `${p}_teacher`, student: `${p}_student`, other: `${p}_other`, course: `${p}_course`,
    otherCourse: `${p}_course2`, chapter: `${p}_chapter`, otherChapter: `${p}_chapter2`,
    lessons: [`${p}_l1`, `${p}_l2`, `${p}_l3`], foreignLesson: `${p}_foreign`, quiz: `${p}_quiz` };
  await prisma.user.createMany({ data: [
    { id: ids.teacher, name: 'Synthetic teacher', email: `${ids.teacher}@example.invalid`, password: 'x', role: 'INSTRUCTOR' },
    { id: ids.student, name: 'طالب تجريبي', email: `${ids.student}@example.invalid`, password: 'x', role: 'STUDENT' },
    { id: ids.other, name: 'Other student', email: `${ids.other}@example.invalid`, password: 'x', role: 'STUDENT' },
  ] });
  await prisma.course.createMany({ data: [
    { id: ids.course, title: 'كورس تجريبي', category: 'TEST', instructorId: ids.teacher, status: 'PUBLISHED', price, priceSYP: price },
    { id: ids.otherCourse, title: 'Other course', category: 'TEST', instructorId: ids.teacher, status: 'PUBLISHED', price: 10, priceSYP: 10 },
  ] });
  await prisma.chapter.createMany({ data: [
    { id: ids.chapter, title: 'Chapter', order: 1, courseId: ids.course },
    { id: ids.otherChapter, title: 'Chapter', order: 1, courseId: ids.otherCourse },
  ] });
  await prisma.lesson.createMany({ data: [
    ...ids.lessons.map((id, order) => ({ id, title: `Lesson ${order}`, order, chapterId: ids.chapter })),
    { id: ids.foreignLesson, title: 'Foreign', order: 0, chapterId: ids.otherChapter },
  ] });
  if (quizzes) await prisma.quiz.create({ data: { id: ids.quiz, title: 'Quiz', chapterId: ids.chapter, passingScore: 1, totalMarks: 2 } });
  const cleanup = async () => {
    const users = [ids.teacher, ids.student, ids.other];
    const courses = [ids.course, ids.otherCourse];
    await prisma.notification.deleteMany({ where: { userId: { in: users } } });
    await prisma.certificate.deleteMany({ where: { userId: { in: users } } });
    await prisma.lessonProgress.deleteMany({ where: { userId: { in: users } } });
    await prisma.quizAttempt.deleteMany({ where: { userId: { in: users } } });
    await prisma.enrollment.deleteMany({ where: { userId: { in: users } } });
    await prisma.quiz.deleteMany({ where: { chapterId: { in: [ids.chapter, ids.otherChapter] } } });
    await prisma.lesson.deleteMany({ where: { chapterId: { in: [ids.chapter, ids.otherChapter] } } });
    await prisma.chapter.deleteMany({ where: { courseId: { in: courses } } });
    await prisma.course.deleteMany({ where: { id: { in: courses } } });
    await prisma.user.deleteMany({ where: { id: { in: users } } });
  };
  return { ids, cleanup };
}

test('PostgreSQL: notifications are stored once per event and only for their recipient', { skip, timeout: 60000 }, async t => {
  const prisma = createTestPrisma();
  const { notifications } = load(prisma);
  const { ids, cleanup } = await fixture(prisma);
  t.after(async () => { try { await cleanup(); } finally { await prisma.$disconnect(); } });

  const event = { userId: ids.student, title: 'عنوان', message: 'رسالة', link: '/dashboard', dedupeKey: 'payment-approved:p1' };
  // The same event delivered six times concurrently (retried request / repeated webhook).
  await Promise.all(Array.from({ length: 6 }, () => notifications.notify(prisma, event)));
  assert.equal(await prisma.notification.count({ where: { userId: ids.student } }), 1);

  // The same event may notify several people, each exactly once.
  await notifications.notifyEnrollment(prisma, { userId: ids.student, courseId: ids.course, courseTitle: 'كورس', instructorId: ids.teacher, eventKey: 'pay1' });
  await notifications.notifyEnrollment(prisma, { userId: ids.student, courseId: ids.course, courseTitle: 'كورس', instructorId: ids.teacher, eventKey: 'pay1' });
  assert.equal(await prisma.notification.count({ where: { userId: ids.student } }), 2);
  assert.equal(await prisma.notification.count({ where: { userId: ids.teacher } }), 1);
  assert.equal(await prisma.notification.count({ where: { userId: ids.other } }), 0);

  // Unsafe targets are never stored as links.
  for (const link of ['https://evil.example/x', '//evil.example', 'javascript:alert(1)', '/\\evil']) {
    assert.equal(notifications.notificationLink(link), null);
  }
  await notifications.notify(prisma, { userId: ids.student, title: 't', message: 'm', link: 'https://evil.example', dedupeKey: 'unsafe' });
  const unsafe = await prisma.notification.findFirst({ where: { userId: ids.student, dedupeKey: { startsWith: 'unsafe' } } });
  assert.equal(unsafe.link, null);

  // A notification rolled back with its transaction does not exist.
  await assert.rejects(prisma.$transaction(async tx => {
    await notifications.notify(tx, { ...event, dedupeKey: 'rolled-back' });
    throw new Error('rollback');
  }));
  assert.equal(await prisma.notification.count({ where: { dedupeKey: { startsWith: 'rolled-back' } } }), 0);
});

test('PostgreSQL: a certificate is issued only for real, server-recorded completion, exactly once', { skip, timeout: 60000 }, async t => {
  const prisma = createTestPrisma();
  const { progress, certificates } = load(prisma);
  const { ids, cleanup } = await fixture(prisma);
  t.after(async () => { try { await cleanup(); } finally { await prisma.$disconnect(); } });
  const denied = status => error => error.status === status;

  // Not enrolled: no progress, no certificate (the old endpoint issued one here).
  await assert.rejects(progress.completeLessons(ids.student, ids.course, ids.lessons), denied(403));
  await assert.rejects(certificates.issueCertificate(ids.student, ids.course), denied(403));

  await prisma.enrollment.create({ data: { userId: ids.student, courseId: ids.course } });
  await assert.rejects(certificates.issueCertificate(ids.student, ids.course), denied(403));

  // Lessons of another course are ignored; duplicates are counted once.
  let state = await progress.completeLessons(ids.student, ids.course, [ids.lessons[0], ids.lessons[0], ids.foreignLesson]);
  assert.deepEqual(state.completedItemIds, [ids.lessons[0]]);
  assert.equal(state.progress, 25);
  assert.equal((await prisma.enrollment.findUniqueOrThrow({ where: { userId_courseId: { userId: ids.student, courseId: ids.course } } })).progress, 25);

  // All lessons done but the quiz is not passed: 75%, never 100, no certificate.
  state = await progress.completeLessons(ids.student, ids.course, ids.lessons);
  assert.equal(state.progress, 75);
  assert.equal(state.complete, false);
  await assert.rejects(certificates.issueCertificate(ids.student, ids.course), denied(403));
  await prisma.quizAttempt.create({ data: { userId: ids.student, quizId: ids.quiz, score: 0, passed: false, status: 'COMPLETED' } });
  await assert.rejects(certificates.issueCertificate(ids.student, ids.course), denied(403));

  // Passing the quiz completes the course.
  await prisma.quizAttempt.create({ data: { userId: ids.student, quizId: ids.quiz, score: 2, passed: true, status: 'COMPLETED' } });
  state = await progress.syncEnrollmentProgress(prisma, ids.student, ids.course);
  assert.equal(state.complete, true);
  assert.equal(state.progress, 100);

  // Eight concurrent requests: one certificate, one number, one notification.
  const results = await Promise.all(Array.from({ length: 8 }, () => certificates.issueCertificate(ids.student, ids.course)));
  assert.equal(new Set(results.map(r => r.certificate.id)).size, 1);
  assert.equal(results.filter(r => r.created).length, 1);
  assert.equal(await prisma.certificate.count({ where: { userId: ids.student, courseId: ids.course } }), 1);
  const certificate = results[0].certificate;
  assert.match(certificate.certificateNumber, /^KQ\d{4}-\d{4,}$/);
  assert.equal(certificate.studentName, 'طالب تجريبي');
  assert.equal(certificate.courseName, 'كورس تجريبي');
  assert.equal(await prisma.notification.count({ where: { userId: ids.student, dedupeKey: { startsWith: 'certificate:' } } }), 1);

  // Re-opening returns the same certificate; another student still cannot get one.
  assert.equal((await certificates.issueCertificate(ids.student, ids.course)).certificate.id, certificate.id);
  await assert.rejects(certificates.issueCertificate(ids.other, ids.course), denied(403));

  // Two different students finishing at the same moment get different numbers.
  await prisma.enrollment.create({ data: { userId: ids.other, courseId: ids.course } });
  await progress.completeLessons(ids.other, ids.course, ids.lessons);
  await prisma.quizAttempt.create({ data: { userId: ids.other, quizId: ids.quiz, score: 2, passed: true, status: 'COMPLETED' } });
  const second = await certificates.issueCertificate(ids.other, ids.course);
  assert.notEqual(second.certificate.certificateNumber, certificate.certificateNumber);
});

test('PostgreSQL: progress never enrols; free courses enrol only through the server-checked path', { skip, timeout: 60000 }, async t => {
  const prisma = createTestPrisma();
  const { progress, certificates } = load(prisma);
  const { ids, cleanup } = await fixture(prisma, { quizzes: 1, price: 0 });
  t.after(async () => { try { await cleanup(); } finally { await prisma.$disconnect(); } });
  const denied = status => error => error.status === status;

  // A progress event alone (even for a free course) creates nothing.
  await assert.rejects(progress.completeLessons(ids.student, ids.course, ids.lessons), denied(403));
  assert.equal(await prisma.enrollment.count({ where: { userId: ids.student } }), 0);
  assert.equal(await prisma.lessonProgress.count({ where: { userId: ids.student } }), 0);
  await assert.rejects(certificates.issueCertificate(ids.student, ids.course), denied(403));

  // Paid, unpublished, hidden-curriculum courses and non-students are refused.
  assert.equal(await progress.enrollInFreeCourse(ids.student, ids.otherCourse), false);
  assert.equal(await progress.enrollInFreeCourse(ids.teacher, ids.course), false);
  await prisma.course.update({ where: { id: ids.course }, data: { status: 'PENDING' } });
  assert.equal(await progress.enrollInFreeCourse(ids.student, ids.course), false);
  await prisma.course.update({ where: { id: ids.course }, data: { status: 'PUBLISHED', type: 'CURRICULUM' } });
  assert.equal(await progress.enrollInFreeCourse(ids.student, ids.course), false);
  await prisma.course.update({ where: { id: ids.course }, data: { type: 'SKILL' } });
  assert.equal(await prisma.enrollment.count({ where: { userId: { in: [ids.student, ids.teacher] } } }), 0);

  // The explicit start: one enrollment and one notification, however often it runs.
  await Promise.all(Array.from({ length: 5 }, () => progress.enrollInFreeCourse(ids.student, ids.course)));
  assert.equal(await prisma.enrollment.count({ where: { userId: ids.student, courseId: ids.course } }), 1);
  assert.equal(await prisma.notification.count({ where: { userId: ids.student, dedupeKey: { startsWith: 'enrolled:free:' } } }), 1);

  // Importing "completed" items from a browser: quiz ids, foreign lessons and junk are ignored.
  const imported = await progress.completeLessons(ids.student, ids.course, [...ids.lessons, ids.quiz, ids.foreignLesson, 'made-up-id']);
  assert.deepEqual([...imported.completedItemIds].sort(), [...ids.lessons].sort());
  assert.equal(imported.complete, false);            // the quiz still needs a real passed attempt
  assert.equal(imported.progress, 75);
  await assert.rejects(certificates.issueCertificate(ids.student, ids.course), denied(403));
});

test('PostgreSQL: certificate numbers can be guessed, so they reveal little; the token reveals all', { skip, timeout: 60000 }, async t => {
  const prisma = createTestPrisma();
  const { progress, certificates } = load(prisma);
  const access = loadTs('../src/lib/certificate-access.ts', { '@/lib/db': { prisma } });
  const { ids, cleanup } = await fixture(prisma, { quizzes: 0 });
  t.after(async () => { try { await cleanup(); } finally { await prisma.$disconnect(); } });

  await prisma.course.update({ where: { id: ids.course }, data: { durationHours: 12 } });
  await prisma.enrollment.create({ data: { userId: ids.student, courseId: ids.course } });
  await progress.completeLessons(ids.student, ids.course, ids.lessons);
  const { certificate } = await certificates.issueCertificate(ids.student, ids.course);
  assert.match(certificate.verifyToken, /^[A-Za-z0-9_-]{22}$/);
  assert.equal(certificate.courseDuration, 12);       // the course's real duration, not a default
  assert.equal(certificate.templateVersion, '2.0');
  assert.ok(certificate.pngUrl.includes(certificate.verifyToken) && !certificate.pngUrl.includes(certificate.certificateNumber));

  const byNumber = await access.resolveCertificate(certificate.certificateNumber, null);
  assert.equal(byNumber.access, 'limited');
  assert.equal((await access.resolveCertificate(certificate.certificateNumber, { id: ids.other, role: 'STUDENT' })).access, 'limited');
  assert.equal((await access.resolveCertificate(certificate.certificateNumber, { id: ids.student, role: 'STUDENT' })).access, 'full');
  assert.equal((await access.resolveCertificate(certificate.certificateNumber, { id: ids.teacher, role: 'INSTRUCTOR' })).access, 'full');
  assert.equal((await access.resolveCertificate(certificate.certificateNumber, { id: 'someone', role: 'ADMIN' })).access, 'full');
  assert.equal((await access.resolveCertificate(certificate.verifyToken, null)).access, 'full');
  assert.equal((await access.resolveCertificate(certificate.id, null)).access, 'full');
  for (const bad of ['KQ2026-99999999', 'x', '../etc/passwd', 'a'.repeat(65), '', null, 'AAAAAAAAAAAAAAAAAAAAAA']) {
    assert.equal(await access.resolveCertificate(bad, null), null);
  }

  // A certificate issued by the original system is never rewritten: its record id
  // is its public reference, and every stored field stays exactly as issued.
  await prisma.certificate.update({ where: { id: certificate.id }, data: { verifyToken: null, templateVersion: '1.0', courseDuration: 16 } });
  const legacy = await prisma.certificate.findUniqueOrThrow({ where: { id: certificate.id } });
  const references = Array.from({ length: 5 }, () => access.publicReference(legacy));
  assert.deepEqual(new Set(references), new Set([legacy.id]));
  assert.equal(access.isLegacyCertificate(legacy), true);
  const viaId = await access.resolveCertificate(legacy.id, null);
  assert.equal(viaId.access, 'full');
  assert.deepEqual(await prisma.certificate.findUniqueOrThrow({ where: { id: certificate.id } }), legacy);
  // Its old number still verifies (limited), so printed certificates are not broken.
  assert.equal((await access.resolveCertificate(legacy.certificateNumber, null)).access, 'limited');
});
