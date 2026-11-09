import { NextResponse } from 'next/server';
import { requireRequestUser } from '@/lib/request-user';
import { CheckoutError } from '@/lib/payments/checkout-context';
import { withPaymentTransaction } from '@/lib/payments/transactions';
import { debitWallet, paymentBody, paymentId, positiveAmount, walletError, WALLET_HEADERS } from '@/lib/payments/wallet-operations';

export async function POST(req: Request) {
  try {
    const user = await requireRequestUser(req);
    const { courseId, paymentCurrency, couponCode } = paymentBody(await req.json());
    if (!paymentId(courseId) || (paymentCurrency !== 'USD' && paymentCurrency !== 'SYP')) throw new CheckoutError(400, 'بيانات غير صحيحة');
    await withPaymentTransaction(async tx => {
      const enabled = await tx.setting.findUnique({ where: { key: 'ENABLE_WALLET' } });
      if (enabled?.value === 'false') throw new CheckoutError(403, 'الدفع من المحفظة غير مفعّل');
      const existing = await tx.enrollment.findUnique({ where: { userId_courseId: { userId: user.id, courseId } } });
      if (existing) return;
      const course = await tx.course.findUnique({ where: { id: courseId } });
      if (!course || course.status !== 'PUBLISHED') throw new CheckoutError(404, 'الكورس غير متاح للشراء');
      let currency: 'USD' | 'SYP' = paymentCurrency;
      let amount = positiveAmount(paymentCurrency === 'USD' ? course.price : course.priceSYP);
      let couponId: string | undefined;
      if (couponCode !== undefined) {
        if (typeof couponCode !== 'string' || !couponCode || couponCode.length > 100) throw new CheckoutError(400, 'الكوبون غير صالح');
        const coupon = await tx.coupon.findUnique({ where: { code: couponCode } });
        if (!coupon || (coupon.courseId && coupon.courseId !== courseId) || !Number.isFinite(coupon.discount)
          || coupon.discount < 0 || coupon.discount >= 100) throw new CheckoutError(400, 'الكوبون غير صالح');
        amount = positiveAmount(Math.round(amount * (1 - coupon.discount / 100) * 100) / 100);
        couponId = coupon.id;
      }
      let deducted = await debitWallet(tx, user.id, currency, amount);
      if (!deducted && currency === 'SYP') {
        const setting = await tx.setting.findUnique({ where: { key: 'exchangeRate' } });
        const rate = positiveAmount(setting ? Number(setting.value) : 14500);
        amount = positiveAmount(amount / rate);
        currency = 'USD';
        deducted = await debitWallet(tx, user.id, currency, amount);
      }
      if (!deducted) throw new CheckoutError(400, 'رصيد المحفظة غير كافٍ');
      await tx.walletTransaction.create({ data: { userId: user.id, amount, currency, type: 'PURCHASE', status: 'APPROVED', provider: 'WALLET' } });
      await tx.enrollment.upsert({ where: { userId_courseId: { userId: user.id, courseId } }, update: {}, create: { userId: user.id, courseId } });
      await tx.payment.create({ data: { userId: user.id, courseId, amount, couponId, paymentMethod: 'WALLET', provider: 'WALLET', status: 'APPROVED' } });
    });
    return NextResponse.json({ message: 'تم الشراء بنجاح' }, { headers: WALLET_HEADERS });
  } catch (error) { return walletError(error); }
}
