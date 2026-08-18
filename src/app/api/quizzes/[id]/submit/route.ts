import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function POST(req: Request, props: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'غير مصرح' }, { status: 401 });

    const params = await props.params;
    const { answers, answerFileUrl } = await req.json(); // answers is an object mapping questionId to selected option index

    const quiz = await prisma.quiz.findUnique({
      where: { id: params.id },
      include: { questions: true }
    });

    if (!quiz) return NextResponse.json({ error: 'الاختبار غير موجود' }, { status: 404 });

    // Handle MANUAL_FILE quiz submission
    if (quiz.type === 'MANUAL_FILE') {
      if (!answerFileUrl) {
        return NextResponse.json({ error: 'يجب إرفاق ملف الإجابة' }, { status: 400 });
      }

      await prisma.quizAttempt.create({
        data: {
          userId: session.user.id,
          quizId: params.id,
          score: null,
          passed: false,
          status: 'PENDING_GRADING',
          answerFileUrl
        }
      });

      return NextResponse.json({ 
        status: 'PENDING_GRADING',
        message: 'تم استلام الإجابة بنجاح وهي قيد المراجعة'
      }, { status: 200 });
    }

    // Handle AUTOMATIC quiz submission
    let studentPoints = 0;
    
    quiz.questions.forEach(q => {
      const userAnswer = answers[q.id];
      if (userAnswer === q.correctAnswer) {
        studentPoints += q.points || 1;
      }
    });

    const passed = studentPoints >= quiz.passingScore;

    const attempt = await prisma.quizAttempt.create({
      data: {
        userId: session.user.id,
        quizId: params.id,
        score: studentPoints,
        passed,
        status: 'COMPLETED'
      }
    });

    // If passed, give user 50 points (Gamification)
    if (passed) {
      await prisma.user.update({
        where: { id: session.user.id },
        data: { points: { increment: 50 } }
      });
    }

    return NextResponse.json({ 
      attempt: {
        score: studentPoints,
        passed
      },
      message: passed ? 'مبروك! لقد اجتزت الاختبار' : 'للأسف لم تجتز الاختبار، حاول مرة أخرى.',
      total: quiz.totalMarks || quiz.questions.reduce((sum, q) => sum + (q.points||1), 0)
    }, { status: 200 });

  } catch (error) {
    return NextResponse.json({ error: 'خطأ في الخادم' }, { status: 500 });
  }
}
