import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { assertBunnyVideoReady, BunnyServerError } from '@/lib/bunny-upload-server';

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    const user = session?.user as { id?: string; role?: string } | undefined;
    if (!user?.id || !['INSTRUCTOR', 'ADMIN', 'OWNER'].includes(user.role ?? '')) {
      return NextResponse.json({ error: 'غير مصرح' }, { status: 401 });
    }

    const { title, videoUrl, chapterId, isLive, liveStartTime } = await req.json();

    if (!title || !chapterId) {
      return NextResponse.json({ error: 'البيانات الأساسية ناقصة' }, { status: 400 });
    }

    if (!isLive && !videoUrl) {
      return NextResponse.json({ error: 'يجب توفير رابط الفيديو للدروس المسجلة' }, { status: 400 });
    }

    const chapter = await prisma.chapter.findUnique({
      where: { id: chapterId },
      select: { course: { select: { instructorId: true } } },
    });
    if (!chapter) return NextResponse.json({ error: 'الفصل غير موجود' }, { status: 404 });
    if (chapter.course.instructorId !== user.id && !['ADMIN', 'OWNER'].includes(user.role!)) {
      return NextResponse.json({ error: 'غير مصرح بإضافة دروس لهذا الكورس' }, { status: 403 });
    }
    // A completed TUS transfer is not proof that Bunny has encoded the video.
    if (!isLive) await assertBunnyVideoReady(videoUrl);

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
    if (error instanceof BunnyServerError) {
      return NextResponse.json({ error: error.message }, { status: error.status, headers: { 'Cache-Control': 'private, no-store' } });
    }
    console.error('Create Lesson API Error:', error);
    return NextResponse.json({ error: 'حدث خطأ في الخادم' }, { status: 500 });
  }
}
