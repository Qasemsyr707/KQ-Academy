import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: 'يجب تسجيل الدخول لإصدار الشهادة' }, { status: 401 });
    }

    const { courseId } = await req.json();
    if (!courseId) {
      return NextResponse.json({ error: 'رقم الكورس مطلوب' }, { status: 400 });
    }

    const userId = (session.user as any).id;

    // Check if certificate already exists
    const existingCert = await prisma.certificate.findUnique({
      where: {
        userId_courseId: {
          userId,
          courseId
        }
      }
    });

    if (existingCert) {
      return NextResponse.json({ certificateId: existingCert.id, message: 'الشهادة موجودة مسبقاً' });
    }

    // VERIFY QUIZZES
    // Find all quizzes in this course
    const course = await prisma.course.findUnique({
      where: { id: courseId },
      include: {
        chapters: {
          include: {
            quizzes: true
          }
        }
      }
    });

    if (!course) {
      return NextResponse.json({ error: 'الكورس غير موجود' }, { status: 404 });
    }

    let allQuizzes: any[] = [];
    course.chapters.forEach(ch => {
      allQuizzes = [...allQuizzes, ...ch.quizzes];
    });

    if (allQuizzes.length > 0) {
      // Check if user passed all quizzes
      for (const quiz of allQuizzes) {
        const passedAttempt = await prisma.quizAttempt.findFirst({
          where: {
            userId,
            quizId: quiz.id,
            passed: true
          }
        });

        if (!passedAttempt) {
          return NextResponse.json({ error: 'لا يمكنك استخراج الشهادة قبل اجتياز جميع اختبارات الكورس بنجاح' }, { status: 403 });
        }
      }
    }

    const certificate = await prisma.certificate.create({
      data: {
        userId,
        courseId
      }
    });

    return NextResponse.json({ certificateId: certificate.id, message: 'تم إصدار الشهادة بنجاح!' }, { status: 201 });

  } catch (error) {
    console.error('Issue Certificate API Error:', error);
    return NextResponse.json({ error: 'حدث خطأ في الخادم' }, { status: 500 });
  }
}
