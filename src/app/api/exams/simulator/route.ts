import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireRequestUser, RequestUserError } from '@/lib/request-user';

const headers = { 'Cache-Control': 'private, no-store', Vary: 'Cookie, Authorization' };
const MAX_QUESTIONS = 20;

/** Questions of published automatic quizzes (chapter quizzes and final exams) in the student's enrolled courses. */
async function allowedQuestionWhere(userId: string) {
  const enrollments = await prisma.enrollment.findMany({ where: { userId }, select: { courseId: true } });
  const courseIds = enrollments.map(e => e.courseId);
  return {
    courseIds,
    where: { quiz: { isPublished: true, type: 'AUTOMATIC', OR: [{ chapter: { courseId: { in: courseIds } } }, { courseId: { in: courseIds } }] } },
  };
}

/**
 * Practice questions for the exam simulator. Never the correct answers, and never questions
 * from courses the student is not enrolled in (no platform-wide fallback).
 */
export async function GET(req: Request) {
  try {
    const user = await requireRequestUser(req);
    const { courseIds, where } = await allowedQuestionWhere(user.id);
    if (!courseIds.length) return NextResponse.json({ questions: [], reason: 'NOT_ENROLLED' }, { headers });
    const pool = await prisma.question.findMany({ where, select: { id: true, text: true, options: true }, take: 200 });
    for (let i = pool.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [pool[i], pool[j]] = [pool[j], pool[i]]; }
    const questions = pool.slice(0, MAX_QUESTIONS).flatMap(q => {
      try { const options = JSON.parse(q.options); return Array.isArray(options) && options.length >= 2 ? [{ id: q.id, text: q.text, options }] : []; }
      catch { return []; }
    });
    return NextResponse.json({ questions, reason: questions.length ? null : 'NO_QUESTIONS' }, { headers });
  } catch (error) {
    if (error instanceof RequestUserError) return NextResponse.json({ error: error.message }, { status: error.status, headers });
    console.error('Error fetching exam simulator questions:', error);
    return NextResponse.json({ error: 'حدث خطأ في الخادم' }, { status: 500, headers });
  }
}

/** Grade the submitted answers on the server ({ answers: { questionId: optionIndex } }) and store the real result. */
export async function POST(req: Request) {
  try {
    const user = await requireRequestUser(req);
    const body = await req.json().catch(() => null) as { answers?: unknown } | null;
    const answers = body?.answers && typeof body.answers === 'object' && !Array.isArray(body.answers) ? body.answers as Record<string, unknown> : null;
    const ids = answers ? Object.keys(answers) : [];
    if (!answers || !ids.length || ids.length > MAX_QUESTIONS) return NextResponse.json({ error: 'أجب عن سؤال واحد على الأقل' }, { status: 400, headers });
    const { where } = await allowedQuestionWhere(user.id);
    const questions = await prisma.question.findMany({ where: { ...where, id: { in: ids } }, select: { id: true, correctAnswer: true } });
    // Every answered question must be one the student was allowed to receive.
    if (questions.length !== ids.length) return NextResponse.json({ error: 'بعض الأسئلة غير متاحة لك' }, { status: 403, headers });
    const score = questions.filter(q => answers[q.id] === q.correctAnswer).length;
    const total = questions.length;
    const passed = score / total >= 0.5;
    const attempt = await prisma.examSimulatorAttempt.create({ data: { userId: user.id, score, total, passed } });
    return NextResponse.json({ attempt: { id: attempt.id, score, total, passed } }, { headers });
  } catch (error) {
    if (error instanceof RequestUserError) return NextResponse.json({ error: error.message }, { status: error.status, headers });
    console.error('Error saving exam attempt:', error);
    return NextResponse.json({ error: 'حدث خطأ في الخادم' }, { status: 500, headers });
  }
}
