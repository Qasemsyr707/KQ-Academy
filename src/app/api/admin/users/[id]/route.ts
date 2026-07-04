import { NextResponse } from 'next/server';
import { requireRoleApi, OWNER_EMAILS } from '@/lib/rbac';
import { prisma } from '@/lib/db';

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { authorized, errorResponse } = await requireRoleApi(['ADMIN']);
    if (!authorized) return errorResponse;

    const { role, walletSYP, walletUSD } = await req.json();
    const resolvedParams = await params;

    // Prevent changing the role of the main admin email
    const userToUpdate = await prisma.user.findUnique({ where: { id: resolvedParams.id } });
    if (!userToUpdate) {
      return NextResponse.json({ error: 'المستخدم غير موجود' }, { status: 404 });
    }

    if (OWNER_EMAILS.includes(userToUpdate.email.toLowerCase()) && role !== 'ADMIN') {
      return NextResponse.json({ error: 'لا يمكن تغيير صلاحيات المدير الأساسي' }, { status: 400 });
    }

    const updatedUser = await prisma.user.update({
      where: { id: resolvedParams.id },
      data: {
        ...(role && { role }),
        ...(walletSYP !== undefined && { walletSYP: parseFloat(walletSYP) }),
        ...(walletUSD !== undefined && { walletUSD: parseFloat(walletUSD) }),
      },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        walletSYP: true,
        walletUSD: true,
        createdAt: true,
      }
    });

    return NextResponse.json({ user: updatedUser, message: 'تم التحديث بنجاح' });
  } catch (error) {
    console.error('Update user error:', error);
    return NextResponse.json({ error: 'خطأ في الخادم' }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { authorized, errorResponse } = await requireRoleApi(['ADMIN']);
    if (!authorized) return errorResponse;

    const resolvedParams = await params;
    const userToUpdate = await prisma.user.findUnique({ where: { id: resolvedParams.id } });
    if (!userToUpdate) {
      return NextResponse.json({ error: 'المستخدم غير موجود' }, { status: 404 });
    }

    if (OWNER_EMAILS.includes(userToUpdate.email.toLowerCase())) {
      return NextResponse.json({ error: 'لا يمكن حذف المدير الأساسي' }, { status: 400 });
    }

    await prisma.user.delete({
      where: { id: resolvedParams.id },
    });

    return NextResponse.json({ message: 'تم حذف المستخدم بنجاح' });
  } catch (error) {
    console.error('Delete user error:', error);
    return NextResponse.json({ error: 'حدث خطأ أثناء الحذف، ربما بسبب وجود بيانات مرتبطة بالمستخدم' }, { status: 500 });
  }
}
