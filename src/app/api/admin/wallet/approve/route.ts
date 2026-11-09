import { NextResponse } from 'next/server';
import { requireRequestUser } from '@/lib/request-user';
import { CheckoutError } from '@/lib/payments/checkout-context';
import { withPaymentTransaction } from '@/lib/payments/transactions';
import { paymentBody, paymentId, positiveAmount, walletError, WALLET_HEADERS } from '@/lib/payments/wallet-operations';

export async function POST(req: Request) {
  try {
    await requireRequestUser(req, ['ADMIN', 'OWNER']);
    const { transactionId, action } = paymentBody(await req.json());
    if (!paymentId(transactionId) || (action !== 'APPROVE' && action !== 'REJECT')) throw new CheckoutError(400, 'بيانات العملية غير صالحة');
    await withPaymentTransaction(async tx => {
      const entry = await tx.walletTransaction.findUnique({ where: { id: transactionId } });
      if (!entry) throw new CheckoutError(404, 'العملية غير موجودة');
      const amount = positiveAmount(entry.amount);
      if (!['USD', 'SYP'].includes(entry.currency) || !['DEPOSIT', 'WITHDRAW'].includes(entry.type)) throw new CheckoutError(400, 'نوع العملية أو عملتها غير صالح');
      const status = action === 'APPROVE' ? 'APPROVED' : 'REJECTED';
      if (entry.status === status) return;
      if (entry.status !== 'PENDING') throw new CheckoutError(409, 'تمت معالجة العملية مسبقاً');
      const changed = await tx.walletTransaction.updateMany({ where: { id: entry.id, status: 'PENDING', amount, currency: entry.currency, type: entry.type, userId: entry.userId }, data: { status } });
      if (changed.count !== 1) throw new CheckoutError(409, 'تمت معالجة العملية مسبقاً');
      if ((entry.type === 'DEPOSIT' && action === 'APPROVE') || (entry.type === 'WITHDRAW' && action === 'REJECT')) {
        const field = entry.currency === 'USD' ? 'walletUSD' : 'walletSYP';
        await tx.user.update({ where: { id: entry.userId }, data: { [field]: { increment: amount } } });
      }
    });
    return NextResponse.json({ message: action === 'APPROVE' ? 'تمت الموافقة على العملية بنجاح' : 'تم رفض العملية وإرجاع المبلغ المحجوز إن وجد' }, { headers: WALLET_HEADERS });
  } catch (error) { return walletError(error); }
}
