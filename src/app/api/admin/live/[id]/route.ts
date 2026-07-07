import { NextResponse } from 'next/server';
import { requireRoleApi } from '@/lib/rbac';
import { prisma } from '@/lib/db';

export async function PUT(req: Request, props: { params: Promise<{ id: string }> }) {
  try {
    const { authorized, errorResponse } = await requireRoleApi(['ADMIN']);
    if (!authorized) return errorResponse;

    const params = await props.params;
    const { status } = await req.json();

    const stream = await prisma.liveClass.update({
      where: { id: params.id },
      data: { status },
      include: { instructor: { select: { id: true, name: true, email: true } } }
    });

    return NextResponse.json({ message: 'تم تحديث حالة البث بنجاح', stream }, { status: 200 });
  } catch (error) {
    console.error('Update Admin Live API Error:', error);
    return NextResponse.json({ error: 'حدث خطأ في الخادم' }, { status: 500 });
  }
}

export async function DELETE(req: Request, props: { params: Promise<{ id: string }> }) {
  try {
    const { authorized, errorResponse } = await requireRoleApi(['ADMIN']);
    if (!authorized) return errorResponse;

    const params = await props.params;

    await prisma.liveClass.delete({
      where: { id: params.id }
    });

    return NextResponse.json({ message: 'تم حذف البث نهائياً' }, { status: 200 });
  } catch (error) {
    console.error('Delete Admin Live API Error:', error);
    return NextResponse.json({ error: 'حدث خطأ في الخادم' }, { status: 500 });
  }
}
