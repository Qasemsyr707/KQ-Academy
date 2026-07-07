import { NextResponse } from 'next/server';
import { requireRoleApi } from '@/lib/rbac';
import { prisma } from '@/lib/db';

export async function PUT(req: Request, props: { params: Promise<{ id: string }> }) {
  try {
    const { authorized, errorResponse } = await requireRoleApi(['ADMIN']);
    if (!authorized) return errorResponse;

    const params = await props.params;
    const { status, title, price, priceSYP } = await req.json();

    const course = await prisma.course.update({
      where: { id: params.id },
      data: { 
        status,
        ...(title && { title }),
        ...(price !== undefined && { price: parseFloat(price) || 0 }),
        ...(priceSYP !== undefined && { priceSYP: parseFloat(priceSYP) || 0 })
      },
      include: {
        instructor: { select: { id: true, name: true, email: true } },
        _count: { select: { enrollments: true, chapters: true } }
      }
    });

    return NextResponse.json({ message: 'تم تحديث الكورس بنجاح', course }, { status: 200 });
  } catch (error) {
    console.error('Update Admin Course API Error:', error);
    return NextResponse.json({ error: 'حدث خطأ في الخادم' }, { status: 500 });
  }
}

export async function DELETE(req: Request, props: { params: Promise<{ id: string }> }) {
  try {
    const { authorized, errorResponse } = await requireRoleApi(['ADMIN']);
    if (!authorized) return errorResponse;

    const params = await props.params;

    await prisma.course.delete({
      where: { id: params.id }
    });

    return NextResponse.json({ message: 'تم حذف الكورس نهائياً' }, { status: 200 });
  } catch (error) {
    console.error('Delete Admin Course API Error:', error);
    return NextResponse.json({ error: 'حدث خطأ في الخادم' }, { status: 500 });
  }
}
