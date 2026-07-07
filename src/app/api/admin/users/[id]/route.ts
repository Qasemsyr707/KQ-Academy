import { NextResponse } from 'next/server';
import { requireRoleApi } from '@/lib/rbac';
import { prisma } from '@/lib/db';

export async function PUT(req: Request, props: { params: Promise<{ id: string }> }) {
  try {
    const { authorized, errorResponse, session } = await requireRoleApi(['ADMIN']);
    if (!authorized) return errorResponse;

    const params = await props.params;
    const { role, walletSYP, walletUSD, isBanned, banReason, bannedUntil, maxLiveStreams } = await req.json();

    // Prevent admin from accidentally changing their own role (optional safety)
    if (session?.user?.id === params.id && role !== 'ADMIN') {
      return NextResponse.json({ error: 'لا يمكنك سحب صلاحية الإدارة من نفسك' }, { status: 400 });
    }

    const user = await prisma.user.update({
      where: { id: params.id },
      data: { 
        role,
        walletSYP: parseFloat(walletSYP) || 0,
        walletUSD: parseFloat(walletUSD) || 0,
        isBanned: Boolean(isBanned),
        banReason: banReason || null,
        bannedUntil: bannedUntil ? new Date(bannedUntil) : null,
        maxLiveStreams: parseInt(maxLiveStreams) || 5
      }
    });

    return NextResponse.json({ message: 'تم تحديث بيانات المستخدم بنجاح', user }, { status: 200 });
  } catch (error) {
    console.error('Update User API Error:', error);
    return NextResponse.json({ error: 'حدث خطأ في الخادم' }, { status: 500 });
  }
}

export async function DELETE(req: Request, props: { params: Promise<{ id: string }> }) {
  try {
    const { authorized, errorResponse, session } = await requireRoleApi(['ADMIN']);
    if (!authorized) return errorResponse;

    const params = await props.params;

    if (session?.user?.id === params.id) {
      return NextResponse.json({ error: 'لا يمكنك حذف حسابك الخاص' }, { status: 400 });
    }

    await prisma.user.delete({
      where: { id: params.id }
    });

    return NextResponse.json({ message: 'تم حذف المستخدم نهائياً' }, { status: 200 });
  } catch (error) {
    console.error('Delete User API Error:', error);
    return NextResponse.json({ error: 'حدث خطأ في الخادم' }, { status: 500 });
  }
}
