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

    const { text, questionId } = await req.json();

    if (!text || !questionId) {
      return NextResponse.json({ error: 'بيانات ناقصة' }, { status: 400 });
    }

    const answer = await prisma.courseAnswer.create({
      data: {
        text,
        questionId,
        userId: (session.user as any).id
      },
      include: {
        user: { select: { name: true, role: true } }
      }
    });

    return NextResponse.json({ answer, message: 'تم إضافة الإجابة بنجاح' }, { status: 201 });

  } catch (error) {
    console.error('Create Answer API Error:', error);
    return NextResponse.json({ error: 'حدث خطأ في الخادم' }, { status: 500 });
  }
}
