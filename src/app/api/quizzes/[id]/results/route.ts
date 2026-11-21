import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireRequestUser, RequestUserError } from '@/lib/request-user';
import { passingPercent, QUIZ_CONTEXT_SELECT, quizCourse } from '@/lib/course-exams';

const headers = { 'Cache-Control': 'private, no-store', Vary: 'Cookie, Authorization' };

/** Results of one quiz for the course instructor (or staff): attempts, grades and pass statistics. */
export async function GET(req: Request, props: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireRequestUser(req, ['INSTRUCTOR', 'ADMIN', 'OWNER'], 'COURSES');
    const { id } = await props.params;
    const quiz = await prisma.quiz.findUnique({ where: { id }, select: QUIZ_CONTEXT_SELECT });
    if (!quiz) return NextResponse.json({ error: 'الاختبار غير موجود' }, { status: 404, headers });
    if (user.role === 'INSTRUCTOR' && quizCourse(quiz).instructorId !== user.id) {
      return NextResponse.json({ error: 'لا تملك صلاحية عرض نتائج هذا الاختبار' }, { status: 403, headers });
    }
    const attempts = await prisma.quizAttempt.findMany({
      where: { quizId: id }, orderBy: { createdAt: 'desc' }, take: 1000,
      // Only what a teacher needs: the student's name, never email, phone or password.
      select: { id: true, score: true, passed: true, status: true, totalPoints: true, createdAt: true, user: { select: { id: true, name: true } } },
    });
    const students = new Map<string, { name: string; attempts: number; best: number | null; passed: boolean }>();
    for (const a of attempts) {
      const row = students.get(a.user.id) ?? { name: a.user.name, attempts: 0, best: null, passed: false };
      row.attempts++;
      if (a.score !== null) row.best = row.best === null ? a.score : Math.max(row.best, a.score);
      row.passed ||= a.passed;
      students.set(a.user.id, row);
    }
    const studentRows = [...students.values()];
    return NextResponse.json({
      quiz: { id: quiz.id, title: quiz.title, kind: quiz.kind, passingPercent: passingPercent(quiz), maxAttempts: quiz.maxAttempts },
      stats: {
        attempts: attempts.length, students: studentRows.length,
        passedStudents: studentRows.filter(s => s.passed).length,
        passRate: studentRows.length ? Math.round(studentRows.filter(s => s.passed).length / studentRows.length * 100) : 0,
        pendingGrading: attempts.filter(a => a.status === 'PENDING_GRADING').length,
      },
      students: studentRows,
      attempts: attempts.slice(0, 200).map(a => ({ id: a.id, student: a.user.name, score: a.score, totalPoints: a.totalPoints, passed: a.passed, status: a.status, createdAt: a.createdAt })),
    }, { headers });
  } catch (error) {
    if (error instanceof RequestUserError) return NextResponse.json({ error: error.message }, { status: error.status, headers });
    console.error('[quiz results]', error);
    return NextResponse.json({ error: 'خطأ في الخادم' }, { status: 500, headers });
  }
}
