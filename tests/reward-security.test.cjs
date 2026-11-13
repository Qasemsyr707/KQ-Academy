/* eslint-disable @typescript-eslint/no-require-imports -- Node test runner. */
const assert = require('node:assert/strict');
const test = require('node:test');
const { loadTs } = require('./load-ts.cjs');

function harness(options = {}) {
  let state = {
    users: {
      student: { id: 'student', role: 'STUDENT', isBanned: false, points: options.points ?? 0, walletUSD: 0 },
      teacher: { id: 'teacher', role: 'INSTRUCTOR', isBanned: false, points: 0 },
      other: { id: 'other', role: 'INSTRUCTOR', isBanned: false, points: 0 },
    },
    ledger: [], attempts: options.attempts ?? [],
  };
  const quiz = {
    id: 'quiz', type: options.manual ? 'MANUAL_FILE' : 'AUTOMATIC', passingScore: 1, totalMarks: 2,
    questions: [{ id: 'q1', correctAnswer: 1, points: 2, options: '["wrong","correct"]' }],
    chapter: { isFree: options.free ?? false, course: { id: 'course', instructorId: 'teacher', status: options.status ?? 'PUBLISHED', price: 20, priceSYP: 200 } },
  };
  let queue = Promise.resolve();
  class RequestUserError extends Error { constructor(status) { super('denied'); this.status = status; } }
  const context = loadTs('../src/lib/payments/checkout-context.ts');
  const mocks = {
    '@/lib/payments/checkout-context': context,
    './checkout-context': context,
    '@/lib/request-user': { RequestUserError, requireRequestUser: async (_req, roles) => {
      if (options.anonymous) throw new RequestUserError(401);
      const user = state.users[options.viewer ?? 'student'];
      if (!user || user.isBanned) throw new RequestUserError(401);
      if (roles && !roles.includes(user.role)) throw new RequestUserError(403);
      return user;
    } },
    '@/lib/owned-document': { assertOwnedDocumentReference: async (_user, value) => {
      if (value !== '/api/files/owned.pdf') throw new Error('not owned');
    } },
    '@/lib/private-file-storage': { PrivateFileError: class extends Error {} },
  };
  function database(working) {
    return {
      user: {
        findUnique: async ({ where }) => working.users[where.id] ?? null,
        findUniqueOrThrow: async ({ where }) => { assert.ok(working.users[where.id]); return working.users[where.id]; },
        updateMany: async ({ where, data }) => {
          const user = working.users[where.id];
          if (!user || (where.role && user.role !== where.role) || (where.isBanned === false && user.isBanned)
            || (where.points?.lte !== undefined && user.points > where.points.lte)
            || (where.points?.gte !== undefined && user.points < where.points.gte)) return { count: 0 };
          if (options.failPoints) throw new Error('failed points write');
          for (const [field, change] of Object.entries(data)) user[field] += (change.increment ?? 0) - (change.decrement ?? 0);
          return { count: 1 };
        },
      },
      quiz: { findUnique: async ({ where }) => where.id === quiz.id ? quiz : null },
      enrollment: { findUnique: async () => options.enrolled === false ? null : { id: 'enrolled' } },
      walletTransaction: {
        createMany: async ({ data, skipDuplicates }) => {
          assert.equal(skipDuplicates, true);
          if (working.ledger.some(row => row.id === data[0].id)) return { count: 0 };
          working.ledger.push(...data); return { count: 1 };
        },
        create: async ({ data }) => { working.ledger.push(data); return data; },
      },
      quizAttempt: {
        findFirst: async ({ where }) => working.attempts.find(row => Object.entries(where).every(([key, value]) => row[key] === value)) ?? null,
        findUnique: async ({ where }) => { const row = working.attempts.find(a => a.id === where.id); return row ? { ...row, quiz } : null; },
        create: async ({ data }) => {
          if (options.failAttempt) throw new Error('failed attempt write');
          const row = { id: `attempt-${working.attempts.length}`, ...data }; working.attempts.push(row); return row;
        },
        updateMany: async ({ where, data }) => {
          const row = working.attempts.find(a => a.id === where.id && a.status === where.status);
          if (!row || options.loseGradeClaim) return { count: 0 };
          Object.assign(row, data); return { count: 1 };
        },
      },
    };
  }
  mocks['@/lib/payments/transactions'] = { withPaymentTransaction: async fn => {
    const previous = queue; let release;
    queue = new Promise(resolve => { release = resolve; }); await previous;
    const working = structuredClone(state);
    try { const result = await fn(database(working)); state = working; return result; }
    finally { release(); }
  } };
  mocks['@/lib/db'] = { prisma: {} };
  mocks['@/lib/reward-events'] = loadTs('../src/lib/reward-events.ts', mocks);
  mocks['@/lib/quiz-submission'] = loadTs('../src/lib/quiz-submission.ts', mocks);
  return {
    get state() { return state; }, quiz, rewards: mocks['@/lib/reward-events'], service: mocks['@/lib/quiz-submission'],
    award: loadTs('../src/app/api/gamification/award/route.ts', mocks).POST,
    submit: loadTs('../src/app/api/quizzes/[id]/submit/route.ts', mocks).POST,
    legacy: loadTs('../src/app/api/quizzes/submit/route.ts', mocks).POST,
    grade: loadTs('../src/app/api/quizzes/grade/route.ts', mocks).POST,
    convert: loadTs('../src/app/api/wallet/route.ts', mocks).POST,
  };
}
const request = body => new Request('https://academy.test/api/test', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
const params = { params: Promise.resolve({ id: 'quiz' }) };

test('reward endpoint authenticates students and rejects arbitrary identity, amounts, dates and events', async () => {
  assert.equal((await harness({ anonymous: true }).award(request({ action: 'DAILY_LOGIN' }))).status, 401);
  assert.equal((await harness({ viewer: 'teacher' }).award(request({ action: 'DAILY_LOGIN' }))).status, 403);
  for (const body of [{ userId: 'victim', points: 1000 }, { action: 'QUIZ_PASS' }, { action: 'DAILY_LOGIN', points: 1000 },
    { action: 'DAILY_LOGIN', userId: 'victim' }, { action: 'DAILY_LOGIN', date: '2099-01-01' }, null, []]) {
    const h = harness();
    assert.equal((await h.award(request(body))).status, 400);
    assert.equal(h.state.users.student.points, 0);
    assert.equal(h.state.ledger.length, 0);
  }
});

test('concurrent and repeated daily claims award exactly server-fixed five points with no wallet money', async () => {
  const h = harness();
  const responses = await Promise.all(Array.from({ length: 10 }, () => h.award(request({ action: 'DAILY_LOGIN' }))));
  assert.ok(responses.every(response => response.status === 200));
  const bodies = await Promise.all(responses.map(response => response.json()));
  assert.equal(bodies.filter(body => body.awarded).length, 1);
  assert.equal(h.state.users.student.points, 5);
  assert.equal(h.state.users.student.walletUSD, 0);
  assert.equal(h.state.ledger.length, 1);
  assert.equal(h.state.ledger[0].amount, 0);
  assert.equal(h.state.ledger[0].userId, 'student');
  assert.equal((await h.convert(request({ pointsToConvert: 100 }))).status, 400);
  assert.equal(h.state.users.student.walletUSD, 0);
});

test('failed reward credit rolls back its claim marker and cannot strand a legitimate future claim', async () => {
  const h = harness({ failPoints: true });
  assert.equal((await h.award(request({ action: 'DAILY_LOGIN' }))).status, 500);
  assert.deepEqual(h.state.ledger, []);
  assert.equal(h.state.users.student.points, 0);
});

test('daily reward date comes from the server and a new UTC day allows exactly one new reward', async t => {
  t.mock.timers.enable({ apis: ['Date'], now: new Date('2026-11-11T12:00:00Z') });
  const h = harness();
  await h.rewards.claimDailyLogin('student');
  await h.rewards.claimDailyLogin('student');
  assert.equal(h.state.users.student.points, 5);
  t.mock.timers.tick(24 * 60 * 60 * 1000);
  await h.rewards.claimDailyLogin('student');
  await h.rewards.claimDailyLogin('student');
  assert.equal(h.state.users.student.points, 10);
  assert.deepEqual(h.state.ledger.map(row => row.transactionId), ['DAILY_LOGIN:2026-11-11', 'DAILY_LOGIN:2026-11-12']);
});

test('transaction rechecks student role and ban before any daily or quiz credit', async () => {
  for (const change of [{ isBanned: true }, { role: 'INSTRUCTOR' }]) {
    const h = harness();
    Object.assign(h.state.users.student, change);
    await assert.rejects(h.rewards.claimDailyLogin('student'), error => error.status === 403);
    assert.equal(h.state.users.student.points, 0);
    assert.deepEqual(h.state.ledger, []);
  }
});

test('quiz rewards use actual answers and one durable award across concurrent passing attempts', async () => {
  const h = harness();
  assert.equal((await h.submit(request({ answers: { q1: 0 }, score: 1000, passed: true }), params)).status, 200);
  assert.equal(h.state.users.student.points, 0);
  const replies = await Promise.all(Array.from({ length: 6 }, () => h.submit(request({ answers: { q1: 1 }, userId: 'teacher', points: 999 }), params)));
  assert.ok(replies.every(response => response.status === 200));
  assert.equal(h.state.users.student.points, 50);
  assert.equal(h.state.users.teacher.points, 0);
  assert.equal(h.state.ledger.length, 1);
  assert.equal(h.state.attempts.length, 7);
});

test('quiz access preserves enrolled unpublished courses but rejects unrelated users and forged answer fields', async () => {
  const denied = harness({ enrolled: false, status: 'PENDING' });
  assert.equal((await denied.submit(request({ answers: { q1: 1 } }), params)).status, 403);
  assert.deepEqual(denied.state.ledger, []);
  assert.equal((await harness({ status: 'PENDING' }).submit(request({ answers: { q1: 1 } }), params)).status, 200);
  for (const answers of [{ q1: '1' }, { q1: 2 }, { other: 1 }, []]) {
    const h = harness();
    assert.equal((await h.submit(request({ answers }), params)).status, 400);
    assert.equal(h.state.users.student.points, 0);
  }
});

test('legacy successful attempts suppress re-awards; a failed attempt write rolls reward back', async () => {
  const h = harness({ attempts: [{ id: 'old', userId: 'student', quizId: 'quiz', status: 'COMPLETED', passed: true }] });
  assert.equal((await h.submit(request({ answers: { q1: 1 } }), params)).status, 200);
  assert.equal(h.state.users.student.points, 0);
  const failed = harness({ failAttempt: true });
  assert.equal((await failed.submit(request({ answers: { q1: 1 } }), params)).status, 500);
  assert.equal(failed.state.users.student.points, 0);
  assert.deepEqual(failed.state.ledger, []);
});

test('manual grading claims pending attempt once, authorizes owner and rejects score tampering/regrading', async () => {
  const pending = { id: 'pending', userId: 'student', quizId: 'quiz', status: 'PENDING_GRADING', passed: false, score: null };
  const h = harness({ manual: true, viewer: 'teacher', attempts: [pending] });
  const replies = await Promise.all(Array.from({ length: 5 }, () => h.grade(request({ attemptId: 'pending', score: 2 }))));
  assert.ok(replies.every(response => response.status === 200));
  assert.equal(h.state.users.student.points, 50);
  assert.equal(h.state.ledger.length, 1);
  assert.equal((await h.grade(request({ attemptId: 'pending', score: 1 }))).status, 409);
  assert.equal((await harness({ manual: true, viewer: 'other', attempts: [pending] }).grade(request({ attemptId: 'pending', score: 2 }))).status, 403);
  for (const score of [-1, 3, '2']) assert.equal((await h.grade(request({ attemptId: 'pending', score }))).status, 400);
  const lost = harness({ manual: true, viewer: 'teacher', attempts: [pending], loseGradeClaim: true });
  assert.equal((await lost.grade(request({ attemptId: 'pending', score: 2 }))).status, 409);
  assert.equal(lost.state.users.student.points, 0);
  assert.deepEqual(lost.state.ledger, []);
});

test('legacy submission retains percentage scoring and manual-file flow without arbitrary rewards', async () => {
  const h = harness();
  const response = await h.legacy(request({ quizId: 'quiz', answers: { q1: 1 }, points: 999 }));
  assert.equal(response.status, 201);
  assert.equal((await response.json()).attempt.score, 100);
  assert.equal(h.state.users.student.points, 0);
  const manual = harness({ manual: true });
  const pending = await manual.legacy(request({ quizId: 'quiz', answerFileUrl: '/api/files/owned.pdf' }));
  assert.equal(pending.status, 200);
  assert.equal((await pending.json()).status, 'PENDING_GRADING');
  assert.equal(manual.state.users.student.points, 0);
});

test('students and unrelated instructors cannot manufacture reward-bearing quizzes or questions', async () => {
  for (const role of ['STUDENT', 'INSTRUCTOR', 'ADMIN']) {
    for (const path of ['../src/app/api/quizzes/route.ts', '../src/app/api/questions/route.ts']) {
      let writes = 0;
      class RequestUserError extends Error { constructor(status) { super('Denied'); this.status = status; } }
      const context = loadTs('../src/lib/payments/checkout-context.ts');
      const route = loadTs(path, {
        '@/lib/payments/checkout-context': context,
        './checkout-context': context,
        '@/lib/request-user': { RequestUserError, requireRequestUser: async (_req, roles) => {
          assert.deepEqual(roles, ['INSTRUCTOR', 'ADMIN', 'OWNER']);
          if (!roles.includes(role)) throw new RequestUserError(403);
          return { id: 'other', role };
        } },
        '@/lib/db': { prisma: {
          chapter: { findUnique: async () => ({ course: { instructorId: 'teacher' } }) },
          quiz: { findUnique: async () => ({ chapter: { course: { instructorId: 'teacher' } } }), create: async () => { writes++; return { id: 'quiz' }; } },
          question: { create: async () => { writes++; return { id: 'question' }; } },
        } },
      }).POST;
      const response = await route(request({ title: 'Quiz', chapterId: 'chapter', text: 'Question', options: ['A', 'B'], correctAnswer: 0, quizId: 'quiz' }));
      assert.equal(response.status, role === 'ADMIN' ? 201 : 403);
      assert.equal(writes, role === 'ADMIN' ? 1 : 0);
    }
  }
});

test('quiz read access hides draft questions, preserves enrolled access and never selects correct answers', async () => {
  for (const options of [{ viewer: null }, { viewer: { id: 'student', role: 'STUDENT' }, enrolled: true }]) {
    const mocks = {
      '@/lib/course-access': { getCourseViewer: async () => options.viewer, managesCourse: () => false },
      '@/lib/db': { prisma: {
        quiz: { findUnique: async query => {
          assert.equal(query.select.questions.select.correctAnswer, undefined);
          return { id: 'quiz', title: 'Draft quiz', questions: [{ id: 'question', text: 'Question', options: '["A","B"]' }],
            chapter: { isFree: true, course: { id: 'course', instructorId: 'teacher', status: 'PENDING', price: 0, priceSYP: 0 } } };
        } },
        enrollment: { findUnique: async () => options.enrolled ? { id: 'enrollment' } : null },
      } },
    };
    const route = loadTs('../src/app/api/quizzes/[id]/route.ts', mocks).GET;
    const response = await route(new Request('https://academy.test/api/quizzes/quiz'), params);
    assert.equal(response.status, options.enrolled ? 200 : 404);
    const serialized = await response.text();
    assert.doesNotMatch(serialized, /correctAnswer|instructorId|chapter"/);
    assert.equal(serialized.includes('Draft quiz'), Boolean(options.enrolled));
  }
});
