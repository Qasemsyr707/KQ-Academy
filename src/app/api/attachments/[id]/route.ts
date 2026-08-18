import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function DELETE(req: Request, props: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || (session.user as any).role !== 'ADMIN' && (session.user as any).role !== 'INSTRUCTOR') {
      return NextResponse.json({ error: 'غير مصرح لك' }, { status: 401 });
    }

    const params = await props.params;

    await prisma.attachment.delete({
      where: { id: params.id }
    });

    return NextResponse.json({ message: 'تم الحذف بنجاح' });
  } catch (error) {
    console.error('Delete Attachment Error:', error);
    return NextResponse.json({ error: 'حدث خطأ في الخادم' }, { status: 500 });
  }
}
