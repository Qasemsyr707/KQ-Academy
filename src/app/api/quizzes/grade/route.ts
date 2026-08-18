import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    const user = session?.user as any;
    
    if (!session || !user || (user.role !== 'INSTRUCTOR' && user.role !== 'ADMIN' && user.role !== 'OWNER')) {
      return NextResponse.json({ error: 'غير مصرح لك بإجراء هذه العملية' }, { status: 401 });
    }

    const { attemptId, score } = await request.json();

    if (!attemptId || score === undefined || score === null) {
      return NextResponse.json({ error: 'البيانات غير مكتملة' }, { status: 400 });
    }

    const attempt = await prisma.quizAttempt.findUnique({
      where: { id: attemptId },
      include: {
        quiz: {
          include: {
            chapter: {
              include: { course: true }
            }
          }
        }
      }
    });

    if (!attempt) {
      return NextResponse.json({ error: 'محاولة الاختبار غير موجودة' }, { status: 404 });
    }

    // Verify ownership
    if (attempt.quiz.chapter.course.instructorId !== user.id && user.role !== 'ADMIN' && user.role !== 'OWNER') {
      return NextResponse.json({ error: 'لا تملك صلاحية تصحيح هذا الاختبار' }, { status: 403 });
    }

    const passed = score >= attempt.quiz.passingScore;

    // Update attempt
    const updatedAttempt = await prisma.quizAttempt.update({
      where: { id: attemptId },
      data: {
        score: Number(score),
        passed,
        status: 'COMPLETED'
      }
    });

    // Award points if passed and it was pending before
    if (passed && attempt.status === 'PENDING_GRADING') {
      await prisma.user.update({
        where: { id: attempt.userId },
        data: { points: { increment: 50 } }
      });
    }

    return NextResponse.json({ message: 'تم رصد العلامة بنجاح', passed });
  } catch (error) {
    console.error('Error grading attempt:', error);
    return NextResponse.json({ error: 'حدث خطأ في الخادم' }, { status: 500 });
  }
}
