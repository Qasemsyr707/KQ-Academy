import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireRoleApi } from '@/lib/rbac';

export async function POST(req: Request) {
  try {
    const { authorized, errorResponse } = await requireRoleApi(['ADMIN']);
    if (!authorized) return errorResponse;

    const { transactionId, action } = await req.json(); // action = 'APPROVE' or 'REJECT'

    const tx = await prisma.walletTransaction.findUnique({
      where: { id: transactionId }
    });

    if (!tx || tx.status !== 'PENDING') {
      return NextResponse.json({ error: 'العملية غير صالحة أو تمت معالجتها مسبقاً' }, { status: 400 });
    }

    if (action === 'REJECT') {
      await prisma.walletTransaction.update({
        where: { id: transactionId },
        data: { status: 'REJECTED' }
      });
      return NextResponse.json({ message: 'تم رفض الإيداع' });
    }

    // Approve logic
    // Update user balance and transaction status in a transaction
    await prisma.$transaction(async (p) => {
      // Update tx
      await p.walletTransaction.update({
        where: { id: transactionId },
        data: { status: 'APPROVED' }
      });

      // Update User
      if (tx.currency === 'USD') {
        await p.user.update({
          where: { id: tx.userId },
          data: { walletUSD: { increment: tx.amount } }
        });
      } else if (tx.currency === 'SYP') {
        await p.user.update({
          where: { id: tx.userId },
          data: { walletSYP: { increment: tx.amount } }
        });
      }
    });

    return NextResponse.json({ message: 'تم قبول الإيداع وتحديث الرصيد بنجاح' });
  } catch (error) {
    console.error('Wallet Approve Error:', error);
    return NextResponse.json({ error: 'حدث خطأ في الخادم' }, { status: 500 });
  }
}
