import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireRequestUser } from '@/lib/request-user';
import { CheckoutError } from '@/lib/payments/checkout-context';
import { paymentBody, positiveAmount, walletError, WALLET_HEADERS } from '@/lib/payments/wallet-operations';

export async function POST(req: Request) {
  try {
    const user = await requireRequestUser(req);
    const { amount: inputAmount, currency, receiptImage } = paymentBody(await req.json());
    const amount = positiveAmount(inputAmount);

    if (currency !== 'USD' && currency !== 'SYP') {
      return NextResponse.json({ error: 'العملة غير صحيحة' }, { status: 400 });
    }
    if (typeof receiptImage !== 'string' || !/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(receiptImage)
      || receiptImage.length > 7_000_000) throw new CheckoutError(400, 'يرجى إرفاق صورة إيصال صالحة');

    const transaction = await prisma.walletTransaction.create({
      data: {
        userId: user.id,
        amount,
        currency,
        type: 'DEPOSIT',
        status: 'PENDING',
        receiptImage,
      },
    });

    return NextResponse.json({ 
      message: '✅ تم إرسال طلب الشحن بنجاح! سيتم مراجعته من قبل الإدارة وإضافة الرصيد خلال 24 ساعة.', 
      transaction 
    }, { headers: WALLET_HEADERS });
  } catch (error) {
    return walletError(error);
  }
}
