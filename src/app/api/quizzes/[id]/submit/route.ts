import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function POST(req: Request, props: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'غير مصرح' }, { status: 401 });

    const params = await props.params;
    const { answers } = await req.json(); // answers is an object mapping questionId to selected option index

    const quiz = await prisma.quiz.findUnique({
      where: { id: params.id },
      include: { questions: true }
    });

    if (!quiz) return NextResponse.json({ error: 'الاختبار غير موجود' }, { status: 404 });

    let correctCount = 0;
    
    quiz.questions.forEach(q => {
      const userAnswer = answers[q.id];
      if (userAnswer === q.correctAnswer) {
        correctCount++;
      }
    });

    const score = (correctCount / quiz.questions.length) * 100;
    const passed = score >= 60; // 60% passing grade

    const attempt = await prisma.quizAttempt.create({
      data: {
        userId: session.user.id,
        quizId: params.id,
        score,
        passed
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
      score, 
      passed, 
      message: passed ? 'مبروك! لقد اجتزت الاختبار وكسبت 50 نقطة خبرة' : 'للأسف لم تجتز الاختبار، حاول مرة أخرى.',
      correctCount,
      total: quiz.questions.length
    }, { status: 200 });

  } catch (error) {
    return NextResponse.json({ error: 'خطأ في الخادم' }, { status: 500 });
  }
}
