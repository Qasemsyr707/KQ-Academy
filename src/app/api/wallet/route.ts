import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'غير مصرح' }, { status: 401 });

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { points: true, walletSYP: true, walletUSD: true }
    });

    const transactions = await prisma.walletTransaction.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: 'desc' }
    });

    const badges = await prisma.badge.findMany({
      where: { userId: session.user.id }
    });

    return NextResponse.json({ user, transactions, badges }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: 'خطأ في الخادم' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  // Convert points to Wallet USD
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'غير مصرح' }, { status: 401 });

    const { pointsToConvert } = await req.json();

    if (!pointsToConvert || pointsToConvert < 100) {
      return NextResponse.json({ error: 'الحد الأدنى للتحويل هو 100 نقطة' }, { status: 400 });
    }

    const user = await prisma.user.findUnique({ where: { id: session.user.id } });
    if (!user || user.points < pointsToConvert) {
      return NextResponse.json({ error: 'رصيد نقاطك غير كافٍ' }, { status: 400 });
    }

    // Conversion rate: 100 points = 1 USD
    const usdAmount = pointsToConvert / 100;

    await prisma.$transaction([
      prisma.user.update({
        where: { id: user.id },
        data: {
          points: { decrement: pointsToConvert },
          walletUSD: { increment: usdAmount }
        }
      }),
      prisma.walletTransaction.create({
        data: {
          userId: user.id,
          amount: usdAmount,
          currency: 'USD',
          type: 'CONVERT_POINTS',
          status: 'APPROVED'
        }
      })
    ]);

    return NextResponse.json({ message: `تم تحويل ${pointsToConvert} نقطة إلى ${usdAmount}$ بنجاح`, newBalanceUSD: user.walletUSD + usdAmount }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: 'خطأ في الخادم' }, { status: 500 });
  }
}
