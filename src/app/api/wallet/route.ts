import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireRequestUser } from '@/lib/request-user';
import { CheckoutError } from '@/lib/payments/checkout-context';
import { withPaymentTransaction } from '@/lib/payments/transactions';
import { paymentBody, walletError, WALLET_HEADERS } from '@/lib/payments/wallet-operations';

export async function GET(req: Request) {
  try {
    const viewer = await requireRequestUser(req);

    const user = await prisma.user.findUnique({
      where: { id: viewer.id },
      select: { points: true, walletSYP: true, walletUSD: true }
    });

    const transactions = await prisma.walletTransaction.findMany({
      where: { userId: viewer.id, type: { not: 'POINTS_REWARD' } },
      orderBy: { createdAt: 'desc' }
    });

    const badges = await prisma.badge.findMany({
      where: { userId: viewer.id }
    });

    return NextResponse.json({ user, transactions, badges }, { status: 200, headers: WALLET_HEADERS });
  } catch (error) {
    return walletError(error);
  }
}

export async function POST(req: Request) {
  // Convert points to Wallet USD
  try {
    const user = await requireRequestUser(req);
    const { pointsToConvert } = paymentBody(await req.json());
    if (typeof pointsToConvert !== 'number' || !Number.isSafeInteger(pointsToConvert)
      || pointsToConvert < 100 || pointsToConvert > 2147483647) throw new CheckoutError(400, 'يرجى تحديد عدد صحيح لا يقل عن 100 نقطة');
    const usdAmount = pointsToConvert / 100;
    const newBalanceUSD = await withPaymentTransaction(async tx => {
      const changed = await tx.user.updateMany({ where: { id: user.id, points: { gte: pointsToConvert } },
        data: { points: { decrement: pointsToConvert }, walletUSD: { increment: usdAmount } } });
      if (changed.count !== 1) throw new CheckoutError(400, 'رصيد نقاطك غير كافٍ');
      await tx.walletTransaction.create({ data: { userId: user.id, amount: usdAmount, currency: 'USD', type: 'CONVERT_POINTS', status: 'APPROVED' } });
      const current = await tx.user.findUnique({ where: { id: user.id }, select: { walletUSD: true } });
      if (!current) throw new CheckoutError(404, 'المستخدم غير موجود');
      return current.walletUSD;
    });
    return NextResponse.json({ message: `تم تحويل ${pointsToConvert} نقطة إلى ${usdAmount}$ بنجاح`, newBalanceUSD }, { status: 200, headers: WALLET_HEADERS });
  } catch (error) {
    return walletError(error);
  }
}
