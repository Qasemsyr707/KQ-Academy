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

    const { title, videoUrl, chapterId, isLive, liveStartTime } = await req.json();

    if (!title || !chapterId) {
      return NextResponse.json({ error: 'البيانات الأساسية ناقصة' }, { status: 400 });
    }

    if (!isLive && !videoUrl) {
      return NextResponse.json({ error: 'يجب توفير رابط الفيديو للدروس المسجلة' }, { status: 400 });
    }

    // Determine order
    const existingCount = await prisma.lesson.count({ where: { chapterId } });
    
    let liveRoomName = null;
    if (isLive) {
      liveRoomName = `room-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    }

    const lesson = await prisma.lesson.create({
      data: {
        title,
        videoUrl: isLive ? null : videoUrl,
        chapterId,
        order: existingCount,
        isLive: isLive || false,
        liveRoomName,
        liveStartTime: liveStartTime ? new Date(liveStartTime) : null,
      }
    });

    return NextResponse.json({ lesson, message: 'تم الإضافة بنجاح' }, { status: 201 });

  } catch (error) {
    console.error('Create Lesson API Error:', error);
    return NextResponse.json({ error: 'حدث خطأ في الخادم' }, { status: 500 });
  }
}
