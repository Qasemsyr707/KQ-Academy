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

    const { text, courseId } = await req.json();

    if (!text || !courseId) {
      return NextResponse.json({ error: 'بيانات ناقصة' }, { status: 400 });
    }

    const question = await prisma.courseQuestion.create({
      data: {
        text,
        courseId,
        userId: (session.user as any).id
      },
      include: {
        user: { select: { name: true } }
      }
    });

    return NextResponse.json({ question, message: 'تم طرح السؤال بنجاح' }, { status: 201 });

  } catch (error) {
    console.error('Create Question API Error:', error);
    return NextResponse.json({ error: 'حدث خطأ في الخادم' }, { status: 500 });
  }
}
