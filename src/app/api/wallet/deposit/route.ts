import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: 'يجب تسجيل الدخول أولاً' }, { status: 401 });
    }

    const userId = (session.user as any).id;
    if (!userId) {
      return NextResponse.json({ error: 'لم يتم التعرف على هويتك، حاول تسجيل الدخول مجدداً' }, { status: 401 });
    }

    const { amount, currency, receiptImage } = await req.json();

    if (!amount || parseFloat(amount) <= 0) {
      return NextResponse.json({ error: 'المبلغ غير صحيح' }, { status: 400 });
    }

    if (!['USD', 'SYP'].includes(currency)) {
      return NextResponse.json({ error: 'العملة غير صحيحة' }, { status: 400 });
    }

    const transaction = await prisma.walletTransaction.create({
      data: {
        userId,
        amount: parseFloat(amount),
        currency,
        type: 'DEPOSIT',
        status: 'PENDING',
        receiptImage: receiptImage || null,
      },
    });

    return NextResponse.json({ 
      message: '✅ تم إرسال طلب الشحن بنجاح! سيتم مراجعته من قبل الإدارة وإضافة الرصيد خلال 24 ساعة.', 
      transaction 
    });
  } catch (error) {
    console.error('Wallet Deposit Error:', error);
    return NextResponse.json({ error: 'حدث خطأ في الخادم' }, { status: 500 });
  }
}
