import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: 'يجب تسجيل الدخول لتقديم الاختبار' }, { status: 401 });
    }

    const { quizId, answers } = await req.json(); // answers is an object: { questionId: selectedOptionIndex }

    if (!quizId || !answers) {
      return NextResponse.json({ error: 'بيانات ناقصة' }, { status: 400 });
    }

    const userId = (session.user as any).id;

    // Fetch quiz questions
    const questions = await prisma.question.findMany({
      where: { quizId }
    });

    let correctAnswersCount = 0;
    
    questions.forEach(q => {
      if (answers[q.id] === q.correctAnswer) {
        correctAnswersCount++;
      }
    });

    const score = (correctAnswersCount / questions.length) * 100;
    const passed = score >= 50; // Pass mark is 50%

    const attempt = await prisma.quizAttempt.create({
      data: {
        userId,
        quizId,
        score,
        passed
      }
    });

    return NextResponse.json({ attempt, message: 'تم إرسال الاختبار وتصحيحه' }, { status: 201 });

  } catch (error) {
    console.error('Submit Quiz API Error:', error);
    return NextResponse.json({ error: 'حدث خطأ في الخادم' }, { status: 500 });
  }
}
