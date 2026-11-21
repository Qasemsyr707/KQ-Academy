const assert = require('node:assert/strict');
const test = require('node:test');
const { loadTs } = require('./load-ts.cjs');

const exams = loadTs('../src/lib/course-exams.ts');
const quiz = (over = {}) => ({
  id: 'q', title: 'Q', kind: 'CHAPTER', type: 'AUTOMATIC', isPublished: true, requiredForCertificate: true,
  requiredSince: null, _count: { questions: 3 }, ...over,
});
const JAN = new Date('2026-01-01'), DEC = new Date('2026-12-01');

test('only required, published, takeable quizzes are certificate requirements', () => {
  assert.equal(exams.isCertificateRequirement(quiz(), JAN), true, 'legacy quiz keeps the original rule');
  assert.equal(exams.isCertificateRequirement(quiz({ requiredForCertificate: false }), JAN), false, 'optional practice quiz');
  assert.equal(exams.isCertificateRequirement(quiz({ isPublished: false }), JAN), false, 'unpublished never blocks');
  assert.equal(exams.isCertificateRequirement(quiz({ _count: { questions: 0 } }), JAN), false, 'empty exam never blocks');
  assert.equal(exams.isCertificateRequirement(quiz({ type: 'MANUAL_FILE', _count: { questions: 0 } }), JAN), true);
});

test('a requirement turned on later is not imposed on students enrolled before it', () => {
  const since = new Date('2026-06-01');
  assert.equal(exams.isCertificateRequirement(quiz({ requiredSince: since }), JAN), false, 'enrolled before');
  assert.equal(exams.isCertificateRequirement(quiz({ requiredSince: since }), DEC), true, 'enrolled after');
});

test('checklist: lessons only when nothing is mandatory; required quizzes and the final exam when they are', () => {
  let c = exams.buildChecklist({ completed: 4, total: 4 }, [], new Set());
  assert.equal(c.eligible, true);
  assert.equal(c.finalExam.status, 'NOT_REQUIRED');
  assert.equal(exams.buildChecklist({ completed: 3, total: 4 }, [], new Set()).eligible, false);
  const final = quiz({ id: 'final', kind: 'FINAL' });
  c = exams.buildChecklist({ completed: 4, total: 4 }, [quiz(), final], new Set(['q']));
  assert.equal(c.finalExam.status, 'PENDING');
  assert.equal(c.eligible, false);
  c = exams.buildChecklist({ completed: 4, total: 4 }, [quiz(), final], new Set(['q', 'final']));
  assert.equal(c.finalExam.status, 'PASSED');
  assert.equal(c.eligible, true);
  assert.equal(exams.buildChecklist({ completed: 0, total: 0 }, [], new Set()).eligible, false, 'an empty course never certifies');
});

test('settings: percentage stored as points, attempts bounded, requirement off unless asked', () => {
  const s = exams.parseSettings({ title: 'اختبار', passingPercent: 60 }, 10);
  assert.equal(s.passingScore, 6);
  assert.equal(s.requiredForCertificate, false);
  assert.equal(s.maxAttempts, null);
  assert.equal(s.scoringVersion, 2);
  assert.equal(exams.parseSettings({ title: 'x', maxAttempts: 3 }, 5).maxAttempts, 3);
  for (const bad of [{ title: '' }, { title: 'x', passingPercent: 0 }, { title: 'x', passingPercent: 101 }, { title: 'x', maxAttempts: -1 }, { title: 'x', maxAttempts: 2.5 }]) {
    assert.throws(() => exams.parseSettings(bad, 5), exams.ExamError, JSON.stringify(bad));
  }
});

test('questions: 2-8 options, a valid correct answer and positive points', () => {
  const ok = exams.parseQuestions([{ text: ' س ', options: ['أ', 'ب'], correctAnswer: 1, points: 2 }]);
  assert.deepEqual(ok, [{ text: 'س', options: ['أ', 'ب'], correctAnswer: 1, points: 2 }]);
  for (const bad of [[], [{ text: 'x', options: ['a'], correctAnswer: 0 }], [{ text: 'x', options: ['a', 'b'], correctAnswer: 2 }],
    [{ text: '', options: ['a', 'b'], correctAnswer: 0 }], [{ text: 'x', options: ['a', 'b'], correctAnswer: 0, points: -1 }]]) {
    assert.throws(() => exams.parseQuestions(bad), exams.ExamError, JSON.stringify(bad));
  }
});

test('a final exam belongs to the course; chapter quizzes reach it through the chapter', () => {
  const course = { id: 'c', instructorId: 't', status: 'PUBLISHED', price: 10, priceSYP: 100, title: 'C' };
  assert.equal(exams.quizCourse({ chapter: null, course }).id, 'c');
  assert.equal(exams.quizCourse({ chapter: { isFree: false, course }, course: null }).id, 'c');
  assert.equal(exams.quizPublicPreview({ chapter: null, course }), false, 'a paid course final exam needs enrollment');
  assert.equal(exams.quizPublicPreview({ chapter: { isFree: true, course }, course: null }), true);
});

test('attempt limits are enforced on the server and the correct answers never come from the client', async () => {
  const attempts = [];
  const quizRow = {
    id: 'quiz', title: 'Q', kind: 'FINAL', type: 'AUTOMATIC', passingScore: 1, totalMarks: 2, isPublished: true,
    requiredForCertificate: false, requiredSince: null, maxAttempts: 2, scoringVersion: 2, instructions: null, fileUrl: null, chapterId: null,
    chapter: null, course: { id: 'course', instructorId: 'teacher', status: 'PUBLISHED', price: 10, priceSYP: 100, title: 'C' },
    questions: [{ id: 'q1', correctAnswer: 1, points: 2, options: '["a","b"]' }],
  };
  const tx = {
    user: { findUnique: async () => ({ role: 'STUDENT', isBanned: false, adminPermissions: [] }) },
    quiz: { findUnique: async () => quizRow },
    enrollment: { findUnique: async () => ({ id: 'e' }) },
    $queryRaw: async () => [{ id: 'quiz' }],
    quizAttempt: {
      count: async () => attempts.length,
      create: async ({ data }) => { attempts.push(data); return { id: `a${attempts.length}`, ...data }; },
    },
  };
  const { submitQuiz } = loadTs('../src/lib/quiz-submission.ts', {
    '@/lib/payments/transactions': { withPaymentTransaction: fn => fn(tx) },
    '@/lib/reward-events': { rewardFirstQuizPass: async () => {} },
    '@/lib/course-progress': { syncEnrollmentProgress: async () => {} },
    '@/lib/notifications': { notify: async () => {} },
  });
  const first = await submitQuiz('student', 'quiz', { answers: { q1: 0 }, score: 999, passed: true });
  assert.equal(first.attempt.passed, false, 'client score and pass flags are ignored');
  assert.equal(first.attempt.score, 0);
  assert.equal(first.remainingAttempts, 1);
  const second = await submitQuiz('student', 'quiz', { answers: { q1: 1 } });
  assert.equal(second.attempt.passed, true);
  assert.equal(second.remainingAttempts, 0);
  await assert.rejects(() => submitQuiz('student', 'quiz', { answers: { q1: 1 } }), e => e.status === 409);
  assert.equal(attempts.length, 2);
  assert.deepEqual(attempts[1].answers, { q1: 1 });
  quizRow.isPublished = false;
  await assert.rejects(() => submitQuiz('student', 'quiz', { answers: { q1: 1 } }), e => e.status === 404, 'unpublished exam');
});
