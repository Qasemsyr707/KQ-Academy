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

    const { title, courseId } = await req.json();

    if (!title || !courseId) {
      return NextResponse.json({ error: 'بيانات ناقصة' }, { status: 400 });
    }

    // Determine order
    const existingCount = await prisma.chapter.count({ where: { courseId } });

    const chapter = await prisma.chapter.create({
      data: {
        title,
        courseId,
        order: existingCount
      }
    });

    return NextResponse.json({ chapter, message: 'تم الإضافة بنجاح' }, { status: 201 });

  } catch (error) {
    console.error('Create Chapter API Error:', error);
    return NextResponse.json({ error: 'حدث خطأ في الخادم' }, { status: 500 });
  }
}
