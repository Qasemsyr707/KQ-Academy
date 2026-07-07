import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

// POST /api/affiliate/claim — Transfer pending affiliate earnings to wallet
export async function POST() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'غير مصرح' }, { status: 401 });
    }

    // Find all pending earnings for this user
    const pendingEarnings = await prisma.affiliateEarning.findMany({
      where: { ownerId: session.user.id, status: 'PENDING' }
    });

    if (pendingEarnings.length === 0) {
      return NextResponse.json({ error: 'لا يوجد أرباح معلقة لاسترداد' }, { status: 400 });
    }

    const totalAmount = pendingEarnings.reduce((sum, e) => sum + e.amount, 0);

    // Atomic transaction: mark as paid + add to wallet
    await prisma.$transaction([
      prisma.affiliateEarning.updateMany({
        where: { ownerId: session.user.id, status: 'PENDING' },
        data: { status: 'PAID' }
      }),
      prisma.user.update({
        where: { id: session.user.id },
        data: { walletUSD: { increment: totalAmount } }
      }),
      prisma.walletTransaction.create({
        data: {
          userId: session.user.id,
          amount: totalAmount,
          currency: 'USD',
          type: 'DEPOSIT',
          status: 'APPROVED',
          provider: 'AFFILIATE',
        }
      })
    ]);

    return NextResponse.json({
      success: true,
      message: `تم تحويل $${totalAmount.toFixed(2)} إلى محفظتك بنجاح!`,
      amount: totalAmount
    });
  } catch (error) {
    console.error('Affiliate Claim Error:', error);
    return NextResponse.json({ error: 'حدث خطأ أثناء التحويل' }, { status: 500 });
  }
}
