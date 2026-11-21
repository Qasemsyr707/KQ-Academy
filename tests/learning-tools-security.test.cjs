const assert = require('node:assert/strict');
const test = require('node:test');
const { loadTs } = require('./load-ts.cjs');

class RequestUserError extends Error { constructor(status, message = 'denied') { super(message); this.status = status; } }
const json = (method, body) => new Request('https://academy.test/x', { method, headers: { 'content-type': 'application/json' }, body: body === undefined ? undefined : JSON.stringify(body) });

function simulator({ enrolled = ['course-1'], questions = [] } = {}) {
  const attempts = [];
  const queries = [];
  const prisma = {
    enrollment: { findMany: async () => enrolled.map(courseId => ({ courseId })) },
    question: { findMany: async query => {
      queries.push(query);
      const allowed = questions.filter(q => enrolled.includes(q.courseId) && q.published);
      const picked = query.where.id ? allowed.filter(q => query.where.id.in.includes(q.id)) : allowed;
      return picked.map(q => Object.fromEntries(Object.keys(query.select).map(k => [k, q[k]])));
    } },
    examSimulatorAttempt: { create: async ({ data }) => { attempts.push(data); return { id: 'a1', ...data }; } },
  };
  const route = loadTs('../src/app/api/exams/simulator/route.ts', {
    '@/lib/db': { prisma },
    '@/lib/request-user': { RequestUserError, requireRequestUser: async () => ({ id: 'student', role: 'STUDENT' }) },
  });
  return { route, attempts, queries };
}
const Q = [
  { id: 'q1', text: 'A?', options: '["x","y"]', correctAnswer: 1, courseId: 'course-1', published: true },
  { id: 'q2', text: 'B?', options: '["x","y"]', correctAnswer: 0, courseId: 'course-1', published: true },
  { id: 'paid', text: 'P?', options: '["x","y"]', correctAnswer: 0, courseId: 'other-course', published: true },
];

test('exam simulator never sends correct answers and never falls back to other courses', async () => {
  const s = simulator({ questions: Q });
  const res = await s.route.GET(new Request('https://academy.test/api/exams/simulator'));
  const body = await res.json();
  assert.equal(res.status, 200);
  assert.doesNotMatch(JSON.stringify(body), /correctAnswer/);
  assert.deepEqual(body.questions.map(q => q.id).sort(), ['q1', 'q2']);
  assert.equal(s.queries[0].select.correctAnswer, undefined);
  const none = simulator({ enrolled: [], questions: Q });
  const empty = await (await none.route.GET(new Request('https://academy.test/api/exams/simulator'))).json();
  assert.deepEqual(empty.questions, []);
  assert.equal(empty.reason, 'NOT_ENROLLED');
});

test('exam simulator grades on the server; client scores and foreign questions are refused', async () => {
  const s = simulator({ questions: Q });
  const res = await s.route.POST(json('POST', { answers: { q1: 1, q2: 1 }, score: 999, passed: true }));
  assert.equal(res.status, 200);
  assert.deepEqual((await res.json()).attempt, { id: 'a1', score: 1, total: 2, passed: true });
  assert.deepEqual(s.attempts[0], { userId: 'student', score: 1, total: 2, passed: true });
  assert.equal((await s.route.POST(json('POST', { answers: { paid: 0 } }))).status, 403, 'question from a course the student is not in');
  assert.equal((await s.route.POST(json('POST', { score: 10, total: 10 }))).status, 400);
  assert.equal(s.attempts.length, 1);
});

test('AI routes require sign-in and never simulate a reply without a provider key', async () => {
  const saved = process.env.GEMINI_API_KEY;
  delete process.env.GEMINI_API_KEY;
  try {
    for (const path of ['../src/app/api/ai/chat/route.ts', '../src/app/api/ai-tutor/route.ts']) {
      const anonymous = loadTs(path, { '@/lib/request-user': { RequestUserError, requireRequestUser: async () => { throw new RequestUserError(401); } } });
      assert.equal((await anonymous.POST(json('POST', { message: 'hi' }))).status, 401, path);
      const signedIn = loadTs(path, { '@/lib/request-user': { RequestUserError, requireRequestUser: async () => ({ id: `u-${path}`, role: 'INSTRUCTOR' }) } });
      const res = await signedIn.POST(json('POST', { message: 'hi' }));
      assert.equal(res.status, 503, path);
      assert.equal((await res.json()).reply, undefined, 'no placeholder reply');
    }
  } finally { if (saved === undefined) delete process.env.GEMINI_API_KEY; else process.env.GEMINI_API_KEY = saved; }
});
