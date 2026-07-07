import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { userId, courseId, paymentType, localProvider, amount, transactionId, affiliateCode } = body;

    if (!userId || !courseId || !paymentType) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    if (paymentType === 'local') {
      // 1. Create a Wallet Transaction
      const walletTx = await prisma.walletTransaction.create({
        data: {
          userId,
          amount: parseFloat(amount || "0"),
          currency: 'SYP',
          type: 'DEPOSIT',
          status: 'PENDING',
          provider: localProvider || 'MANUAL',
          transactionId: transactionId || null,
        }
      });

      // 2. Create a Payment Record tied to this transaction
      const payment = await prisma.payment.create({
        data: {
          userId,
          courseId,
          amount: parseFloat(amount || "0"),
          paymentMethod: localProvider || 'MANUAL',
          status: 'PENDING',
          provider: 'MANUAL',
          transactionId: walletTx.id,
        }
      });

      return NextResponse.json({ success: true, message: 'Local payment pending approval', payment });
    } else {
      // Online payment logic (e.g. Stripe checkout session)
      // For now, simulate success or return a checkout URL
      const payment = await prisma.payment.create({
        data: {
          userId,
          courseId,
          amount: parseFloat(amount || "0"),
          paymentMethod: 'CREDIT_CARD',
          status: 'APPROVED',
          provider: 'STRIPE',
        }
      });

      // Auto enroll
      await prisma.enrollment.create({
        data: {
          userId,
          courseId,
        }
      });

      return NextResponse.json({ success: true, message: 'Online payment successful', payment });
    }

  } catch (error) {
    console.error('Checkout error:', error);
    return NextResponse.json({ error: 'Checkout failed' }, { status: 500 });
  }
}
