import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: 'غير مصرح' }, { status: 401 });
    }

    const { title, chapterId } = await req.json();

    if (!title || !chapterId) {
      return NextResponse.json({ error: 'بيانات ناقصة' }, { status: 400 });
    }

    const quiz = await prisma.quiz.create({
      data: {
        title,
        chapterId
      }
    });

    return NextResponse.json({ quiz, message: 'تم إنشاء الاختبار بنجاح' }, { status: 201 });

  } catch (error) {
    console.error('Create Quiz API Error:', error);
    return NextResponse.json({ error: 'حدث خطأ في الخادم' }, { status: 500 });
  }
}
