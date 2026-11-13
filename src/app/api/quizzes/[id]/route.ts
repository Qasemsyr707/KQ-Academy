import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getCourseViewer, managesCourse } from '@/lib/course-access';

const headers = { 'Cache-Control': 'private, no-store', 'CDN-Cache-Control': 'no-store', Vary: 'Cookie, Authorization' };

export async function GET(req: Request, props: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await props.params;
    const quiz = await prisma.quiz.findUnique({
      where: { id },
      select: {
        id: true, title: true, chapterId: true, type: true, fileUrl: true, passingScore: true, totalMarks: true,
        createdAt: true, updatedAt: true,
        questions: { select: { id: true, text: true, options: true } },
        chapter: { select: { isFree: true, course: { select: { id: true, instructorId: true, status: true, price: true, priceSYP: true } } } },
      },
    });
    if (!quiz) return NextResponse.json({ error: 'الاختبار غير موجود' }, { status: 404, headers });
    const { course, isFree } = quiz.chapter;
    const viewer = await getCourseViewer(req);
    const publicPreview = course.status === 'PUBLISHED' && (isFree || (course.price === 0 && course.priceSYP === 0));
    const enrolled = viewer && await prisma.enrollment.findUnique({
      where: { userId_courseId: { userId: viewer.id, courseId: course.id } }, select: { id: true },
    });
    if (!publicPreview && !managesCourse(course, viewer) && !enrolled) {
      return NextResponse.json({ error: 'الاختبار غير موجود' }, { status: 404, headers });
    }
    const publicQuiz = {
      id: quiz.id, title: quiz.title, chapterId: quiz.chapterId, type: quiz.type,
      fileUrl: quiz.fileUrl, passingScore: quiz.passingScore, totalMarks: quiz.totalMarks,
      createdAt: quiz.createdAt, updatedAt: quiz.updatedAt, questions: quiz.questions,
    };
    return NextResponse.json({ quiz: publicQuiz }, { status: 200, headers });
  } catch {
    return NextResponse.json({ error: 'خطأ في الخادم' }, { status: 500, headers });
  }
}
