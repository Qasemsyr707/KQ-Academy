import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { assertBunnyVideoReady, BunnyServerError } from '@/lib/bunny-upload-server';
import { normalizeLessonVideoReference } from '@/lib/lesson-video';
import { assertOwnedDocumentReference } from '@/lib/owned-document';
import { PrivateFileError } from '@/lib/private-file-storage';

const headers = { 'Cache-Control': 'private, no-store' };

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    const user = session?.user;
    if (!user?.id || !['INSTRUCTOR', 'ADMIN', 'OWNER'].includes(user.role ?? '')) {
      return NextResponse.json({ error: 'غير مصرح' }, { status: 401, headers });
    }
    const { id } = await params;
    const existing = await prisma.lesson.findUnique({ where: { id }, include: { chapter: { select: { course: { select: { instructorId: true } } } } } });
    if (!existing) return NextResponse.json({ error: 'الدرس غير موجود' }, { status: 404, headers });
    if (existing.chapter.course.instructorId !== user.id && !['ADMIN', 'OWNER'].includes(user.role ?? '')) {
      return NextResponse.json({ error: 'غير مصرح بتعديل هذا الدرس' }, { status: 403, headers });
    }
    const body = await req.json();
    if (!body || typeof body !== 'object' || Array.isArray(body)
      || typeof body.title !== 'string' || !body.title.trim() || body.title.length > 1000) {
      return NextResponse.json({ error: 'يرجى إدخال عنوان الدرس' }, { status: 400, headers });
    }
    const data: { title: string; videoUrl?: string } = { title: body.title.trim() };
    // Absence means preserve, including legacy video references. Never spread
    // caller fields over the lesson: chapter/order/live/attachments stay intact.
    if (Object.hasOwn(body, 'videoUrl')) {
      if (existing.isLive) return NextResponse.json({ error: 'لا يمكن ربط فيديو بدرس مباشر' }, { status: 400, headers });
      data.videoUrl = normalizeLessonVideoReference(body.videoUrl, body.videoSource);
      await assertOwnedDocumentReference({ id: user.id, role: user.role }, data.videoUrl);
      await assertBunnyVideoReady(data.videoUrl);
    } else if (Object.hasOwn(body, 'videoSource')) {
      return NextResponse.json({ error: 'يرجى إدخال رابط فيديو صالح' }, { status: 400, headers });
    }
    const lesson = await prisma.lesson.update({ where: { id }, data });
    return NextResponse.json({ lesson, message: body.videoSource === 'url' ? 'تم ربط الفيديو بالدرس بنجاح' : 'تم حفظ الدرس بنجاح' }, { headers });
  } catch (error) {
    if (error instanceof BunnyServerError || error instanceof PrivateFileError) {
      return NextResponse.json({ error: error.message }, { status: error.status, headers });
    }
    if (error instanceof SyntaxError) return NextResponse.json({ error: 'طلب غير صالح' }, { status: 400, headers });
    console.error('Update lesson failed');
    return NextResponse.json({ error: 'تعذّر حفظ الدرس، يرجى المحاولة مجدداً' }, { status: 500, headers });
  }
}
