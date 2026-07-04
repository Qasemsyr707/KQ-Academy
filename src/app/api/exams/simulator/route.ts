import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    const user = session?.user as any;
    
    if (!session || !user) {
      return NextResponse.json({ error: 'غير مصرح' }, { status: 401 });
    }

    // Find courses the user is enrolled in
    const enrollments = await prisma.enrollment.findMany({
      where: { userId: user.id },
      select: { courseId: true }
    });
    
    const courseIds = enrollments.map(e => e.courseId);

    let questions: any[] = [];

    if (courseIds.length > 0) {
      // Get questions from courses they are enrolled in
      questions = await prisma.question.findMany({
        where: {
          quiz: {
            chapter: {
              courseId: { in: courseIds }
            }
          }
        },
        take: 50 // Get up to 50 questions
      });
    }

    // If no questions found from enrolled courses, fallback to any available questions in the platform
    if (questions.length === 0) {
      questions = await prisma.question.findMany({
        take: 50
      });
    }

    // Shuffle and pick up to 20 random questions
    const shuffled = questions.sort(() => 0.5 - Math.random());
    const selectedQuestions = shuffled.slice(0, 20).map(q => ({
      id: q.id,
      text: q.text,
      options: typeof q.options === 'string' ? JSON.parse(q.options) : q.options,
      correctAnswer: q.correctAnswer
    }));

    return NextResponse.json({ questions: selectedQuestions });
  } catch (error) {
    console.error('Error fetching exam simulator questions:', error);
    return NextResponse.json({ error: 'حدث خطأ في الخادم' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    const user = session?.user as any;
    
    if (!session || !user) {
      return NextResponse.json({ error: 'غير مصرح' }, { status: 401 });
    }

    const { score, total, passed } = await request.json();

    if (score === undefined || total === undefined) {
      return NextResponse.json({ error: 'البيانات غير مكتملة' }, { status: 400 });
    }

    const attempt = await (prisma as any).examSimulatorAttempt.create({
      data: {
        userId: user.id,
        score: Number(score),
        total: Number(total),
        passed: Boolean(passed)
      }
    });

    return NextResponse.json({ message: 'تم حفظ النتيجة بنجاح', attempt });
  } catch (error) {
    console.error('Error saving exam attempt:', error);
    return NextResponse.json({ error: 'حدث خطأ في الخادم' }, { status: 500 });
  }
}
