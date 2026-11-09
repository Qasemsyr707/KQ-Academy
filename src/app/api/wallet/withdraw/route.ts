import { NextResponse } from 'next/server';
import { requireRequestUser } from '@/lib/request-user';
import { CheckoutError } from '@/lib/payments/checkout-context';
import { withPaymentTransaction } from '@/lib/payments/transactions';
import { debitWallet, paymentBody, positiveAmount, walletError, WALLET_HEADERS } from '@/lib/payments/wallet-operations';

export async function POST(req: Request) {
  try {
    const user = await requireRequestUser(req);
    const { amount: inputAmount, currency, provider } = paymentBody(await req.json());
    const amount = positiveAmount(inputAmount);
    if ((currency !== 'USD' && currency !== 'SYP') || typeof provider !== 'string' || !provider.trim() || provider.length > 1000) {
      throw new CheckoutError(400, 'بيانات السحب غير صالحة');
    }
    const transaction = await withPaymentTransaction(async tx => {
      if (!await debitWallet(tx, user.id, currency, amount)) throw new CheckoutError(400, 'رصيد المحفظة غير كافٍ');
      return tx.walletTransaction.create({ data: { userId: user.id, amount, currency, type: 'WITHDRAW', status: 'PENDING', provider } });
    });
    return NextResponse.json({ success: true, transaction }, { headers: WALLET_HEADERS });
  } catch (error) { return walletError(error); }
}
