import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { assertBunnyVideoReady, BunnyServerError, isBunnyVideoId } from '@/lib/bunny-upload-server';
import { assertOwnedDocumentReference } from '@/lib/owned-document';
import { PrivateFileError } from '@/lib/private-file-storage';
import { createHash } from 'node:crypto';
import { normalizeLessonVideoReference } from '@/lib/lesson-video';

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    const user = session?.user as { id?: string; role?: string } | undefined;
    if (!user?.id || !['INSTRUCTOR', 'ADMIN', 'OWNER'].includes(user.role ?? '')) {
      return NextResponse.json({ error: 'غير مصرح' }, { status: 401 });
    }

    const body = await req.json();
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      return NextResponse.json({ error: 'طلب غير صالح' }, { status: 400 });
    }
    const { title: rawTitle, videoUrl, videoSource, chapterId, isLive = false, liveStartTime, operationId } = body;

    if (typeof rawTitle !== 'string' || !rawTitle.trim() || rawTitle.length > 1000
      || typeof chapterId !== 'string' || !chapterId || chapterId.length > 200 || typeof isLive !== 'boolean') {
      return NextResponse.json({ error: 'البيانات الأساسية ناقصة' }, { status: 400 });
    }
    if (operationId !== undefined && !isBunnyVideoId(operationId)) {
      return NextResponse.json({ error: 'طلب حفظ الدرس غير صالح' }, { status: 400 });
    }
    const title = rawTitle.trim();
    const startTime = isLive && liveStartTime ? new Date(liveStartTime) : null;
    if (startTime && Number.isNaN(startTime.getTime())) {
      return NextResponse.json({ error: 'موعد الدرس غير صالح' }, { status: 400 });
    }

    const chapter = await prisma.chapter.findUnique({
      where: { id: chapterId },
      select: { course: { select: { instructorId: true } } },
    });
    if (!chapter) return NextResponse.json({ error: 'الفصل غير موجود' }, { status: 404 });
    if (chapter.course.instructorId !== user.id && !['ADMIN', 'OWNER'].includes(user.role!)) {
      return NextResponse.json({ error: 'غير مصرح بإضافة دروس لهذا الكورس' }, { status: 403 });
    }
    const reference = isLive ? null : normalizeLessonVideoReference(videoUrl, videoSource);
    // A stable client operation survives retries after a lost save response.
    // The primary key makes duplicate concurrent saves atomic without a migration.
    const id = operationId ? `c${createHash('sha256').update(JSON.stringify([user.id, operationId])).digest('hex').slice(0, 24)}` : undefined;
    const savedResponse = (lesson: { chapterId: string; title: string; videoUrl: string | null; isLive: boolean; liveStartTime: Date | null }) => {
      if (lesson.chapterId !== chapterId || lesson.title !== title || lesson.videoUrl !== reference || lesson.isLive !== isLive
        || lesson.liveStartTime?.getTime() !== startTime?.getTime()) {
        throw new BunnyServerError(409, 'تم استخدام طلب الحفظ مسبقاً، يرجى تحديث الصفحة قبل إضافة درس آخر');
      }
      return NextResponse.json({ lesson, message: videoSource === 'url' ? 'تم ربط الفيديو بالدرس بنجاح' : 'تم حفظ الدرس بنجاح' },
        { status: 201, headers: { 'Cache-Control': 'private, no-store' } });
    };
    if (id) {
      const existing = await prisma.lesson.findUnique({ where: { id } });
      if (existing) return savedResponse(existing);
    }
    // A completed transfer is not proof that the video is ready to watch.
    if (!isLive) {
      await assertOwnedDocumentReference({ id: user.id, role: user.role }, reference);
      await assertBunnyVideoReady(reference);
    }

    // Determine order
    const existingCount = await prisma.lesson.count({ where: { chapterId } });
    
    let liveRoomName = null;
    if (isLive) {
      liveRoomName = `room-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    }

    let lesson;
    try {
      lesson = await prisma.lesson.create({
        data: {
          ...(id ? { id } : {}),
          title,
          videoUrl: reference,
          chapterId,
          order: existingCount,
          isLive,
          liveRoomName,
          liveStartTime: startTime,
        }
      });
    } catch (error) {
      if (id && (error as { code?: string })?.code === 'P2002') {
        const existing = await prisma.lesson.findUnique({ where: { id } });
        if (existing) return savedResponse(existing);
      }
      throw error;
    }

    return savedResponse(lesson);

  } catch (error) {
    if (error instanceof SyntaxError) return NextResponse.json({ error: 'طلب غير صالح' }, { status: 400 });
    if (error instanceof BunnyServerError || error instanceof PrivateFileError) {
      return NextResponse.json({ error: error.message }, { status: error.status, headers: { 'Cache-Control': 'private, no-store' } });
    }
    console.error('Create lesson failed');
    return NextResponse.json({ error: 'تعذّر حفظ الدرس، يرجى المحاولة مجدداً' }, { status: 500 });
  }
}
