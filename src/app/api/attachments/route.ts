import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { assertAttachmentTarget, AttachmentAccessError } from '@/lib/attachment-access';
import { isPrivateFileId, readPrivateFileMetadata, PrivateFileError } from '@/lib/private-file-storage';

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: 'غير مصرح' }, { status: 401 });
    }

    const { name, url, lessonId, chapterId, courseId } = await req.json();

    if (typeof name !== 'string' || !name.trim() || name.length > 255 || typeof url !== 'string') {
      return NextResponse.json({ error: 'بيانات ناقصة' }, { status: 400 });
    }
    
    const user = session.user as { id: string; role: string };
    await assertAttachmentTarget(user, { lessonId, chapterId, courseId });
    const match = /^\/api\/files\/([^/?#]+)$/.exec(url);
    if (!match || !isPrivateFileId(match[1])) {
      return NextResponse.json({ error: 'ارفع الملف الأصلي من جهازك؛ الروابط الخارجية والصور لا تصلح بديلاً عن ملف PDF الأصلي' }, { status: 400 });
    }
    const metadata = await readPrivateFileMetadata(match[1]);
    if (!metadata) return NextResponse.json({ error: 'الملف الأصلي غير موجود؛ يرجى إعادة رفعه' }, { status: 410 });
    if (metadata.ownerId !== user.id && !['ADMIN', 'OWNER'].includes(user.role)) {
      return NextResponse.json({ error: 'غير مصرح بربط ملف يخص مستخدماً آخر' }, { status: 403 });
    }

    const attachment = await prisma.attachment.create({
      data: {
        name: name.trim(),
        url,
        lessonId: lessonId || null,
        chapterId: chapterId || null,
        courseId: courseId || null
      }
    });

    return NextResponse.json({ attachment, message: 'تم الإضافة بنجاح' }, { status: 201 });

  } catch (error) {
    if (error instanceof AttachmentAccessError || error instanceof PrivateFileError) {
      return NextResponse.json({ error: error.message }, { status: error.status, headers: { 'Cache-Control': 'private, no-store' } });
    }
    console.error('Create Attachment API Error:', error);
    return NextResponse.json({ error: 'حدث خطأ في الخادم' }, { status: 500 });
  }
}
