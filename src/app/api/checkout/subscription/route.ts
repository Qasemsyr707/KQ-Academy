import { NextResponse } from 'next/server';
import { requireRequestUser } from '@/lib/request-user';
import { CheckoutError } from '@/lib/payments/checkout-context';
import { withPaymentTransaction } from '@/lib/payments/transactions';
import { debitWallet, paymentBody, paymentId, positiveAmount, walletError, WALLET_HEADERS } from '@/lib/payments/wallet-operations';

export async function POST(req: Request) {
  try {
    const user = await requireRequestUser(req);
    const { planId, period, paymentMethod } = paymentBody(await req.json());
    if (!paymentId(planId) || (period !== 'MONTHLY' && period !== 'YEARLY') || paymentMethod !== 'WALLET') throw new CheckoutError(400, 'بيانات الاشتراك أو طريقة الدفع غير صالحة');
    const result = await withPaymentTransaction(async tx => {
      const enabled = await tx.setting.findUnique({ where: { key: 'ENABLE_WALLET' } });
      if (enabled?.value === 'false') throw new CheckoutError(403, 'الدفع من المحفظة غير مفعّل');
      const existing = await tx.userSubscription.findFirst({ where: { userId: user.id, status: 'ACTIVE', endDate: { gt: new Date() } } });
      if (existing) {
        if (existing.planId !== planId || existing.period !== period) throw new CheckoutError(409, 'لديك اشتراك نشط بالفعل');
        return { message: 'لديك اشتراك نشط بالفعل في هذه الخطة' };
      }
      const plan = await tx.subscriptionPlan.findUnique({ where: { id: planId, isActive: true } });
      if (!plan) throw new CheckoutError(404, 'خطة الاشتراك غير موجودة');
      const amount = positiveAmount(period === 'YEARLY' ? plan.priceYearly : plan.priceMonthly);
      if (!await debitWallet(tx, user.id, 'USD', amount)) throw new CheckoutError(400, 'رصيد المحفظة غير كافٍ');
      const endDate = new Date();
      if (period === 'YEARLY') endDate.setFullYear(endDate.getFullYear() + 1); else endDate.setMonth(endDate.getMonth() + 1);
      await tx.userSubscription.create({ data: { userId: user.id, planId: plan.id, period, status: 'ACTIVE', endDate, provider: 'WALLET' } });
      await tx.walletTransaction.create({ data: { userId: user.id, amount, currency: 'USD', type: 'PURCHASE', status: 'APPROVED', provider: 'WALLET' } });
      return { message: `تم تفعيل اشتراك "${plan.name}" بنجاح حتى ${endDate.toLocaleDateString('ar-EG')}` };
    });
    return NextResponse.json({ success: true, ...result }, { headers: WALLET_HEADERS });
  } catch (error) { return walletError(error); }
}
