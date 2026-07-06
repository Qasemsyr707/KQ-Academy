import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function GET(req: Request, props: { params: Promise<{ id: string }> }) {
  try {
    const params = await props.params;
    const quiz = await prisma.quiz.findUnique({
      where: { id: params.id },
      include: {
        questions: {
          select: {
            id: true,
            text: true,
            options: true
            // We DO NOT send the correctAnswer to the client!
          }
        }
      }
    });

    if (!quiz) return NextResponse.json({ error: 'الاختبار غير موجود' }, { status: 404 });

    return NextResponse.json({ quiz }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: 'خطأ في الخادم' }, { status: 500 });
  }
}
