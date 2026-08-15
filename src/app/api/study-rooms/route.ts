import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: 'غير مصرح' }, { status: 401 });
    }

    const rooms = await prisma.studyRoom.findMany({
      orderBy: { createdAt: 'desc' }
    });

    return NextResponse.json(rooms);
  } catch (error) {
    console.error('Fetch Study Rooms Error:', error);
    return NextResponse.json({ error: 'حدث خطأ أثناء جلب الغرف' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: 'غير مصرح' }, { status: 401 });
    }

    const { title, themeColor = '#a855f7' } = await req.json();

    if (!title) {
      return NextResponse.json({ error: 'اسم الغرفة مطلوب' }, { status: 400 });
    }

    const room = await prisma.studyRoom.create({
      data: {
        title,
        themeColor,
        maxUsers: 50,
        currentUsers: 0
      }
    });

    return NextResponse.json(room, { status: 201 });
  } catch (error) {
    console.error('Create Study Room Error:', error);
    return NextResponse.json({ error: 'حدث خطأ في إنشاء الغرفة' }, { status: 500 });
  }
}
