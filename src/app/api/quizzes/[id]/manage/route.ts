import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireRequestUser, RequestUserError } from '@/lib/request-user';
import { passingPercent, QUIZ_CONTEXT_SELECT, quizCourse } from '@/lib/course-exams';

const headers = { 'Cache-Control': 'private, no-store', Vary: 'Cookie, Authorization' };

/** The full quiz, correct answers included, for its course instructor (or staff) to edit. Never for students. */
export async function GET(req: Request, props: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireRequestUser(req, ['INSTRUCTOR', 'ADMIN', 'OWNER'], 'COURSES');
    const { id } = await props.params;
    const quiz = await prisma.quiz.findUnique({
      where: { id },
      select: { ...QUIZ_CONTEXT_SELECT, questions: { select: { id: true, text: true, options: true, correctAnswer: true, points: true }, orderBy: { createdAt: 'asc' } } },
    });
    if (!quiz) return NextResponse.json({ error: 'الاختبار غير موجود' }, { status: 404, headers });
    if (user.role === 'INSTRUCTOR' && quizCourse(quiz).instructorId !== user.id) {
      return NextResponse.json({ error: 'لا تملك صلاحية إدارة هذا الاختبار' }, { status: 403, headers });
    }
    return NextResponse.json({ quiz: {
      id: quiz.id, title: quiz.title, kind: quiz.kind, type: quiz.type, instructions: quiz.instructions,
      isPublished: quiz.isPublished, requiredForCertificate: quiz.requiredForCertificate, maxAttempts: quiz.maxAttempts,
      passingPercent: passingPercent(quiz),
      questions: quiz.questions.map(q => ({ ...q, options: (() => { try { return JSON.parse(q.options); } catch { return []; } })() })),
    } }, { headers });
  } catch (error) {
    if (error instanceof RequestUserError) return NextResponse.json({ error: error.message }, { status: error.status, headers });
    return NextResponse.json({ error: 'خطأ في الخادم' }, { status: 500, headers });
  }
}
