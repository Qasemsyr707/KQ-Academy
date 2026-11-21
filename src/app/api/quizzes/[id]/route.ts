import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getCourseViewer, managesCourse } from '@/lib/course-access';
import { requireRequestUser, RequestUserError } from '@/lib/request-user';
import { ExamError, parseQuestions, parseSettings, passingPercent, QUIZ_CONTEXT_SELECT, quizCourse, quizPublicPreview } from '@/lib/course-exams';

const headers = { 'Cache-Control': 'private, no-store', 'CDN-Cache-Control': 'no-store', Vary: 'Cookie, Authorization' };

function fail(error: unknown) {
  if (error instanceof ExamError || error instanceof RequestUserError) return NextResponse.json({ error: error.message }, { status: error.status, headers });
  if (error instanceof SyntaxError) return NextResponse.json({ error: 'بيانات غير صالحة' }, { status: 400, headers });
  console.error('[quiz]', error);
  return NextResponse.json({ error: 'خطأ في الخادم' }, { status: 500, headers });
}

/** A quiz for taking it: questions and options only (never the correct answers), plus the student's attempts. */
export async function GET(req: Request, props: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await props.params;
    const quiz = await prisma.quiz.findUnique({
      where: { id },
      select: { ...QUIZ_CONTEXT_SELECT, updatedAt: true, questions: { select: { id: true, text: true, options: true, points: true } } },
    });
    if (!quiz) return NextResponse.json({ error: 'الاختبار غير موجود' }, { status: 404, headers });
    const course = quizCourse(quiz);
    const viewer = await getCourseViewer(req);
    const manager = await managesCourse(course, viewer);
    const enrolled = viewer && await prisma.enrollment.findUnique({
      where: { userId_courseId: { userId: viewer.id, courseId: course.id } }, select: { id: true },
    });
    if (!manager && (!quiz.isPublished || (!quizPublicPreview(quiz) && !enrolled))) {
      return NextResponse.json({ error: 'الاختبار غير موجود' }, { status: 404, headers });
    }
    const attempts = viewer ? await prisma.quizAttempt.findMany({
      where: { userId: viewer.id, quizId: quiz.id }, orderBy: { createdAt: 'desc' },
      select: { id: true, score: true, passed: true, status: true, totalPoints: true, createdAt: true },
    }) : [];
    const publicQuiz = {
      id: quiz.id, title: quiz.title, kind: quiz.kind, chapterId: quiz.chapterId, type: quiz.type, instructions: quiz.instructions,
      fileUrl: quiz.fileUrl, passingScore: quiz.passingScore, totalMarks: quiz.totalMarks, passingPercent: passingPercent(quiz),
      requiredForCertificate: quiz.requiredForCertificate, isPublished: quiz.isPublished, maxAttempts: quiz.maxAttempts,
      updatedAt: quiz.updatedAt, questions: quiz.questions,
    };
    return NextResponse.json({
      quiz: publicQuiz,
      attempts,
      remainingAttempts: quiz.maxAttempts === null || manager ? null : Math.max(0, quiz.maxAttempts - attempts.length),
      passed: attempts.some(a => a.passed),
    }, { status: 200, headers });
  } catch (error) { return fail(error); }
}

async function managedQuiz(req: Request, id: string) {
  const user = await requireRequestUser(req, ['INSTRUCTOR', 'ADMIN', 'OWNER'], 'COURSES');
  const quiz = await prisma.quiz.findUnique({ where: { id }, select: { ...QUIZ_CONTEXT_SELECT, _count: { select: { attempts: true } } } });
  if (!quiz) throw new ExamError(404, 'الاختبار غير موجود');
  if (user.role === 'INSTRUCTOR' && quizCourse(quiz).instructorId !== user.id) throw new ExamError(403, 'لا تملك صلاحية إدارة هذا الاختبار');
  return { user, quiz };
}

/**
 * Edit settings and, optionally, replace the questions (an automatic quiz).
 * Turning the certificate requirement on records requiredSince = now, so students already
 * enrolled are not held to a requirement that did not exist when they joined.
 */
export async function PUT(req: Request, props: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await props.params;
    const { quiz } = await managedQuiz(req, id);
    const body = await req.json();
    if (!body || typeof body !== 'object' || Array.isArray(body)) throw new ExamError(400, 'بيانات غير صالحة');
    const questions = body.questions === undefined ? null : parseQuestions(body.questions);
    if (questions && quiz.type !== 'AUTOMATIC') throw new ExamError(400, 'لا يمكن إضافة أسئلة اختيار من متعدد لاختبار ملف');
    const total = questions ? questions.reduce((sum, q) => sum + q.points, 0)
      : quiz.type === 'AUTOMATIC'
        ? (await prisma.question.aggregate({ where: { quizId: id }, _sum: { points: true } }))._sum.points ?? 0
        : quiz.totalMarks ?? 100;
    if (quiz.type === 'AUTOMATIC' && total <= 0) throw new ExamError(400, 'أضف سؤالاً واحداً على الأقل');
    const settings = parseSettings(body, total);
    const requiredSince = settings.requiredForCertificate
      ? (quiz.requiredForCertificate ? quiz.requiredSince : new Date())
      : null;
    await prisma.$transaction(async tx => {
      if (questions) {
        await tx.question.deleteMany({ where: { quizId: id } });
        await tx.question.createMany({ data: questions.map(q => ({ quizId: id, text: q.text, options: JSON.stringify(q.options), correctAnswer: q.correctAnswer, points: q.points })) });
      }
      await tx.quiz.update({ where: { id }, data: { ...settings, requiredSince } });
    });
    return NextResponse.json({ success: true }, { headers });
  } catch (error) { return fail(error); }
}

/** Delete a quiz nobody has attempted; a quiz with attempts is unpublished instead, keeping students' results. */
export async function DELETE(req: Request, props: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await props.params;
    const { quiz } = await managedQuiz(req, id);
    if (quiz._count.attempts > 0) {
      await prisma.quiz.update({ where: { id }, data: { isPublished: false, requiredForCertificate: false, requiredSince: null } });
      return NextResponse.json({ success: true, unpublished: true, message: 'للاختبار محاولات محفوظة، فأُخفي بدل حذفه ولم يعد شرطاً للشهادة' }, { headers });
    }
    await prisma.$transaction([prisma.question.deleteMany({ where: { quizId: id } }), prisma.quiz.delete({ where: { id } })]);
    return NextResponse.json({ success: true, deleted: true }, { headers });
  } catch (error) { return fail(error); }
}
