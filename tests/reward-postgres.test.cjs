/* eslint-disable @typescript-eslint/no-require-imports -- Node test runner. */
const assert = require('node:assert/strict');
const test = require('node:test');
const { randomUUID } = require('node:crypto');
const { loadTs } = require('./load-ts.cjs');
const { testDatabaseUrl, createTestPrisma } = require('./helpers/security-postgres.cjs');

test('PostgreSQL: separate workers claim rewards and convert points without duplicate wallet funding', {
  skip: !testDatabaseUrl() && 'No explicit isolated PostgreSQL test database configured', timeout: 60000,
}, async t => {
  const first = createTestPrisma();
  const second = createTestPrisma();
  const prefix = `reward_test_${randomUUID()}`;
  const studentId = `${prefix}_student`;
  const teacherId = `${prefix}_teacher`;
  const courseId = `${prefix}_course`;
  const chapterId = `${prefix}_chapter`;
  const quizId = `${prefix}_quiz`;
  const manualId = `${prefix}_manual`;
  t.after(async () => {
    try {
      await first.walletTransaction.deleteMany({ where: { userId: { in: [studentId, teacherId] } } });
      await first.quizAttempt.deleteMany({ where: { userId: studentId } });
      await first.question.deleteMany({ where: { quizId: { in: [quizId, manualId] } } });
      await first.quiz.deleteMany({ where: { id: { in: [quizId, manualId] } } });
      await first.chapter.deleteMany({ where: { id: chapterId } });
      await first.course.deleteMany({ where: { id: courseId } });
      await first.user.deleteMany({ where: { id: { in: [studentId, teacherId] } } });
    } finally { await Promise.all([first.$disconnect(), second.$disconnect()]); }
  });
  await first.user.createMany({ data: [
    { id: studentId, name: 'Synthetic reward student', email: `${studentId}@example.invalid`, password: 'no-login-test-fixture', role: 'STUDENT', points: 95 },
    { id: teacherId, name: 'Synthetic reward teacher', email: `${teacherId}@example.invalid`, password: 'no-login-test-fixture', role: 'INSTRUCTOR' },
  ] });
  await first.course.create({ data: { id: courseId, title: 'Synthetic reward course', category: 'TEST', instructorId: teacherId, status: 'PUBLISHED' } });
  await first.chapter.create({ data: { id: chapterId, title: 'Synthetic chapter', order: 1, courseId, isFree: true } });
  await first.quiz.create({ data: { id: quizId, title: 'Synthetic quiz', chapterId, passingScore: 1, totalMarks: 2,
    questions: { create: { id: `${prefix}_question`, text: 'Synthetic question', options: '["wrong","correct"]', correctAnswer: 1, points: 2 } } } });
  await first.quiz.create({ data: { id: manualId, title: 'Synthetic manual quiz', chapterId, type: 'MANUAL_FILE', passingScore: 1, totalMarks: 2 } });
  await first.quizAttempt.create({ data: { id: `${prefix}_pending`, userId: studentId, quizId: manualId, status: 'PENDING_GRADING', passed: false } });
  function worker(prisma) {
    const mocks = { '@/lib/db': { prisma } };
    const context = loadTs('../src/lib/payments/checkout-context.ts');
    mocks['@/lib/payments/checkout-context'] = context;
    mocks['./checkout-context'] = context;
    mocks['@/lib/payments/transactions'] = loadTs('../src/lib/payments/transactions.ts', mocks);
    mocks['@/lib/reward-events'] = loadTs('../src/lib/reward-events.ts', mocks);
    mocks['@/lib/request-user'] = { requireRequestUser: async () => ({ id: studentId, role: 'STUDENT' }), RequestUserError: class extends Error {} };
    return { rewards: mocks['@/lib/reward-events'], quizzes: loadTs('../src/lib/quiz-submission.ts', mocks), convert: loadTs('../src/app/api/wallet/route.ts', mocks).POST };
  }
  const workers = [worker(first), worker(second)];
  const daily = await Promise.allSettled(Array.from({ length: 6 }, (_, i) => workers[i % 2].rewards.claimDailyLogin(studentId)));
  for (const result of daily) if (result.status === 'rejected') assert.equal(result.reason.status, 409);
  assert.equal((await first.user.findUniqueOrThrow({ where: { id: studentId } })).points, 100);
  assert.equal(await first.walletTransaction.count({ where: { userId: studentId, type: 'POINTS_REWARD' } }), 1);
  const conversion = () => new Request('https://academy.test/api/wallet', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ pointsToConvert: 100 }) });
  const results = await Promise.all(workers.map(w => w.convert(conversion())));
  assert.equal(results.filter(r => r.status === 200).length, 1);
  assert.ok(results.every(r => [200, 400, 409].includes(r.status)));
  let user = await first.user.findUniqueOrThrow({ where: { id: studentId } });
  assert.equal(user.walletUSD, 1);
  assert.equal(user.points, 0);
  const quizReplies = await Promise.allSettled(Array.from({ length: 4 }, (_, i) => workers[i % 2].quizzes.submitQuiz(studentId, quizId, { answers: { [`${prefix}_question`]: 1 } })));
  for (const result of quizReplies) if (result.status === 'rejected') assert.equal(result.reason.status, 409);
  user = await first.user.findUniqueOrThrow({ where: { id: studentId } });
  assert.equal(user.points, 50);
  const grades = await Promise.allSettled(workers.map(w => w.quizzes.gradeQuiz(teacherId, `${prefix}_pending`, 2)));
  for (const result of grades) if (result.status === 'rejected') assert.equal(result.reason.status, 409);
  user = await first.user.findUniqueOrThrow({ where: { id: studentId } });
  assert.equal(user.points, 100);
  assert.equal(user.walletUSD, 1);
  assert.equal(await first.walletTransaction.count({ where: { userId: studentId, type: 'POINTS_REWARD' } }), 3);
  assert.equal(await first.walletTransaction.count({ where: { userId: studentId, type: 'CONVERT_POINTS' } }), 1);
});
