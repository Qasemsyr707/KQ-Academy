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

    const courseCount = await prisma.course.count({ where: { instructorId: params.id } });
    if (courseCount > 0) {
      return NextResponse.json({ error: 'لا يمكن حذف حساب مدرب يمتلك كورسات. قم بنقل الكورسات أو حذفها أولاً.' }, { status: 400 });
    }

    await prisma.$transaction(async (tx) => {
      // Unlink referred users
      await tx.user.updateMany({
        where: { referredById: params.id },
        data: { referredById: null }
      });

      // Unlink matchmaking
      await tx.matchmakingRequest.updateMany({
        where: { matchedWithId: params.id },
        data: { matchedWithId: null }
      });

      // Delete dependencies
      await tx.affiliateEarning.deleteMany({ where: { OR: [{ ownerId: params.id }, { buyerId: params.id }] } });
      await tx.userSubscription.deleteMany({ where: { userId: params.id } });
      await tx.enrollment.deleteMany({ where: { userId: params.id } });
      await tx.payment.deleteMany({ where: { userId: params.id } });
      await tx.review.deleteMany({ where: { userId: params.id } });
      await tx.certificate.deleteMany({ where: { userId: params.id } });
      await tx.quizAttempt.deleteMany({ where: { userId: params.id } });
      await tx.courseAnswer.deleteMany({ where: { userId: params.id } });
      await tx.courseQuestion.deleteMany({ where: { userId: params.id } });
      await tx.walletTransaction.deleteMany({ where: { userId: params.id } });
      await tx.examSimulatorAttempt.deleteMany({ where: { userId: params.id } });
      await tx.flashcardDeck.deleteMany({ where: { userId: params.id } });
      await tx.badge.deleteMany({ where: { userId: params.id } });
      await tx.communityComment.deleteMany({ where: { userId: params.id } });
      await tx.communityPost.deleteMany({ where: { userId: params.id } });
      await tx.shortComment.deleteMany({ where: { userId: params.id } });
      await tx.short.deleteMany({ where: { userId: params.id } });
      await tx.liveClass.deleteMany({ where: { instructorId: params.id } });
      await tx.matchmakingRequest.deleteMany({ where: { userId: params.id } });
      await tx.notification.deleteMany({ where: { userId: params.id } });

      // Delete user
      await tx.user.delete({
        where: { id: params.id }
      });
    });

    return NextResponse.json({ message: 'تم حذف المستخدم نهائياً' }, { status: 200 });
  } catch (error) {
    console.error('Delete User API Error:', error);
    return NextResponse.json({ error: 'حدث خطأ في الخادم (قد توجد بيانات مرتبطة تمنع الحذف)' }, { status: 500 });
  }
}
