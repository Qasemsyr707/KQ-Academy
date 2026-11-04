import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { assertAttachmentTarget, AttachmentAccessError } from '@/lib/attachment-access';

export async function DELETE(req: Request, props: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || (session.user as any).role !== 'ADMIN' && (session.user as any).role !== 'INSTRUCTOR') {
      return NextResponse.json({ error: 'غير مصرح لك' }, { status: 401 });
    }

    const params = await props.params;

    const attachment = await prisma.attachment.findUnique({ where: { id: params.id } });
    if (!attachment) return NextResponse.json({ error: 'المرفق غير موجود' }, { status: 404 });
    await assertAttachmentTarget(session.user as { id: string; role: string }, {
      lessonId: attachment.lessonId ?? undefined,
      chapterId: attachment.chapterId ?? undefined,
      courseId: attachment.courseId ?? undefined,
    });

    await prisma.attachment.delete({
      where: { id: params.id }
    });

    return NextResponse.json({ message: 'تم الحذف بنجاح' });
  } catch (error) {
    if (error instanceof AttachmentAccessError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error('Delete Attachment Error:', error);
    return NextResponse.json({ error: 'حدث خطأ في الخادم' }, { status: 500 });
  }
}
