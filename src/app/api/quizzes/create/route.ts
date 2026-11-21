import { NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { requireRequestUser, RequestUserError } from '@/lib/request-user';
import { prisma } from '@/lib/db';
import { assertOwnedDocumentReference } from '@/lib/owned-document';
import { PrivateFileError } from '@/lib/private-file-storage';
import { ExamError, parseQuestions, parseSettings } from '@/lib/course-exams';

const headers = { 'Cache-Control': 'private, no-store' };

/**
 * Create a chapter quiz (`chapterId`) or the course final exam (`kind: 'FINAL'`, `courseId`).
 * New quizzes are optional for the certificate unless the instructor turns the requirement on;
 * the requirement then applies to students who enroll from now on (requiredSince).
 */
export async function POST(request: Request) {
  try {
    const user = await requireRequestUser(request, ['INSTRUCTOR', 'ADMIN', 'OWNER'], 'COURSES');
    const body = await request.json();
    if (!body || typeof body !== 'object' || Array.isArray(body)) throw new ExamError(400, 'بيانات غير صالحة');
    const kind = body.kind === 'FINAL' ? 'FINAL' : 'CHAPTER';
    const type = body.type === 'MANUAL_FILE' ? 'MANUAL_FILE' : body.type === 'AUTOMATIC' || body.type === undefined ? 'AUTOMATIC' : null;
    if (!type) throw new ExamError(400, 'نوع الاختبار غير صالح');
    if (kind === 'FINAL' && type !== 'AUTOMATIC') throw new ExamError(400, 'الاختبار النهائي يكون بأسئلة اختيار من متعدد');

    let courseId: string;
    if (kind === 'FINAL') {
      if (typeof body.courseId !== 'string' || !body.courseId) throw new ExamError(400, 'الكورس مطلوب');
      courseId = body.courseId;
    } else {
      if (typeof body.chapterId !== 'string' || !body.chapterId) throw new ExamError(400, 'الفصل مطلوب');
      const chapter = await prisma.chapter.findUnique({ where: { id: body.chapterId }, select: { courseId: true } });
      if (!chapter) throw new ExamError(404, 'الفصل غير موجود');
      courseId = chapter.courseId;
    }
    const course = await prisma.course.findUnique({ where: { id: courseId }, select: { instructorId: true } });
    if (!course) throw new ExamError(404, 'الكورس غير موجود');
    if (user.role === 'INSTRUCTOR' && course.instructorId !== user.id) throw new ExamError(403, 'لا تملك صلاحية إدارة هذا الكورس');

    const questions = type === 'AUTOMATIC' ? parseQuestions(body.questions) : [];
    if (type === 'MANUAL_FILE') {
      if (typeof body.fileUrl !== 'string' || !body.fileUrl) throw new ExamError(400, 'يجب رفع ملف الاختبار');
      await assertOwnedDocumentReference(user, body.fileUrl);
    }
    const total = type === 'AUTOMATIC' ? questions.reduce((sum, q) => sum + q.points, 0) : Number(body.totalMarks) > 0 ? Number(body.totalMarks) : 100;
    // Older clients sent a pass mark in points ("passingScore"); the form now sends a percentage.
    if (body.passingPercent === undefined && body.passingScore !== undefined && total > 0) {
      body.passingPercent = Math.min(100, Math.max(1, Math.round(Number(body.passingScore) / total * 100)));
    }
    if (body.isPublished === undefined) body.isPublished = true;
    const settings = parseSettings(body, total);

    const quiz = await prisma.$transaction(async tx => {
      const created = await tx.quiz.create({ data: {
        ...settings, kind, type,
        chapterId: kind === 'CHAPTER' ? body.chapterId : null,
        courseId: kind === 'FINAL' ? courseId : null,
        fileUrl: type === 'MANUAL_FILE' ? body.fileUrl : null,
        requiredSince: settings.requiredForCertificate ? new Date() : null,
      } });
      if (questions.length) {
        await tx.question.createMany({ data: questions.map(q => ({ quizId: created.id, text: q.text, options: JSON.stringify(q.options), correctAnswer: q.correctAnswer, points: q.points })) });
      }
      return created;
    });
    return NextResponse.json({ message: 'تم إنشاء الاختبار بنجاح', quiz }, { headers });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      return NextResponse.json({ error: 'لهذا الكورس اختبار نهائي بالفعل؛ عدّله بدل إنشاء اختبار جديد' }, { status: 409, headers });
    }
    if (error instanceof ExamError || error instanceof RequestUserError || error instanceof PrivateFileError) {
      return NextResponse.json({ error: error.message }, { status: error.status, headers });
    }
    if (error instanceof SyntaxError) return NextResponse.json({ error: 'بيانات غير صالحة' }, { status: 400, headers });
    console.error('[quiz create]', error);
    return NextResponse.json({ error: 'تعذّر إنشاء الاختبار' }, { status: 500, headers });
  }
}
