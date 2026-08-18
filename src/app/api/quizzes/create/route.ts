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

    const { title, chapterId, type, passingScore, totalMarks, fileUrl, questions } = await request.json();

    if (!title || !chapterId || !type) {
      return NextResponse.json({ error: 'البيانات الأساسية غير مكتملة' }, { status: 400 });
    }

    if (type === 'AUTOMATIC' && (!questions || !Array.isArray(questions) || questions.length === 0)) {
      return NextResponse.json({ error: 'يجب إضافة سؤال واحد على الأقل' }, { status: 400 });
    }

    if (type === 'MANUAL_FILE' && !fileUrl) {
      return NextResponse.json({ error: 'يجب رفع ملف الاختبار' }, { status: 400 });
    }

    // Verify chapter ownership via course
    const chapter = await prisma.chapter.findUnique({
      where: { id: chapterId },
      include: { course: true }
    });

    if (!chapter || (chapter.course.instructorId !== user.id && user.role !== 'ADMIN' && user.role !== 'OWNER')) {
      return NextResponse.json({ error: 'الفصل غير موجود أو أنك لا تملك صلاحية إدارته' }, { status: 403 });
    }

    // Create the Quiz and its Questions in a transaction
    const newQuiz = await prisma.$transaction(async (tx) => {
      // Calculate total marks for AUTOMATIC
      let calcTotalMarks = 0;
      if (type === 'AUTOMATIC') {
        calcTotalMarks = questions.reduce((sum: number, q: any) => sum + Number(q.points || 1), 0);
      } else {
        calcTotalMarks = Number(totalMarks) || 100;
      }

      const quiz = await tx.quiz.create({
        data: {
          title,
          chapterId,
          type,
          fileUrl: type === 'MANUAL_FILE' ? fileUrl : null,
          passingScore: Number(passingScore) || 50,
          totalMarks: calcTotalMarks
        }
      });

      // Create questions if AUTOMATIC
      if (type === 'AUTOMATIC') {
        for (const q of questions) {
          await tx.question.create({
            data: {
              text: q.text,
              options: JSON.stringify(q.options),
              correctAnswer: Number(q.correctAnswer),
              points: Number(q.points) || 1,
              quizId: quiz.id
            }
          });
        }
      }

      return quiz;
    });

    return NextResponse.json({ message: 'تم إنشاء الاختبار بنجاح', quiz: newQuiz });
  } catch (error) {
    console.error('Error creating quiz:', error);
    return NextResponse.json({ error: 'حدث خطأ في الخادم' }, { status: 500 });
  }
}
