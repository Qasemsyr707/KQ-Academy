import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: 'غير مصرح' }, { status: 401 });
    }

    const { amount, currency, provider } = await req.json();

    if (!amount || amount <= 0 || !currency || !provider) {
      return NextResponse.json({ error: 'بيانات غير صالحة' }, { status: 400 });
    }

    const userId = session.user.id;

    // Start a transaction to ensure we deduct from wallet safely
    const result = await prisma.$transaction(async (tx) => {
      const user = await tx.user.findUnique({ where: { id: userId } });
      
      if (!user) throw new Error('User not found');

      if (currency === 'USD' && user.walletUSD < amount) {
        throw new Error('الرصيد بالدولار غير كافٍ');
      }

      if (currency === 'SYP' && user.walletSYP < amount) {
        throw new Error('الرصيد بالليرة السورية غير كافٍ');
      }

      // Deduct from wallet
      await tx.user.update({
        where: { id: userId },
        data: {
          walletUSD: currency === 'USD' ? { decrement: amount } : undefined,
          walletSYP: currency === 'SYP' ? { decrement: amount } : undefined,
        }
      });

      // Create transaction record
      const walletTx = await tx.walletTransaction.create({
        data: {
          userId,
          amount,
          currency,
          type: 'WITHDRAW',
          status: 'PENDING', // Admin needs to approve
          provider, // Contains method/details
        }
      });

      return walletTx;
    });

    return NextResponse.json({ success: true, transaction: result });

  } catch (error: any) {
    console.error('Withdrawal Request Error:', error);
    return NextResponse.json({ error: error.message || 'حدث خطأ داخلي' }, { status: 500 });
  }
}
