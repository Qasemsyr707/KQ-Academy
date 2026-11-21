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

    const body = await req.json().catch(() => null);
    const title = typeof body?.title === 'string' ? body.title.trim() : '';
    // Rendered in a style attribute: only a plain hex colour is accepted.
    const themeColor = typeof body?.themeColor === 'string' && /^#[0-9a-f]{6}$/i.test(body.themeColor) ? body.themeColor : '#a855f7';

    if (!title || title.length > 80) {
      return NextResponse.json({ error: 'اسم الغرفة مطلوب (80 حرفاً كحد أقصى)' }, { status: 400 });
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
