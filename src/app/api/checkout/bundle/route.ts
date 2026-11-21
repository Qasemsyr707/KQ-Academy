import { recordReferralCommission } from '@/lib/referrals';
import { NextResponse } from 'next/server';
import { requireRequestUser } from '@/lib/request-user';
import { CheckoutError } from '@/lib/payments/checkout-context';
import { withPaymentTransaction } from '@/lib/payments/transactions';
import { isPubliclyOffered } from '@/lib/catalogue-visibility';
import { debitWallet, paymentBody, paymentId, positiveAmount, walletError, WALLET_HEADERS } from '@/lib/payments/wallet-operations';

export async function POST(req: Request) {
  try {
    const user = await requireRequestUser(req);
    const { bundleId, paymentMethod, referralCode } = paymentBody(await req.json());
    if (!paymentId(bundleId) || paymentMethod !== 'WALLET' || (referralCode !== undefined && (typeof referralCode !== 'string' || referralCode.length > 200))) {
      throw new CheckoutError(400, 'بيانات الحزمة أو طريقة الدفع غير صالحة');
    }
    await withPaymentTransaction(async tx => {
      const enabled = await tx.setting.findUnique({ where: { key: 'ENABLE_WALLET' } });
      if (enabled?.value === 'false') throw new CheckoutError(403, 'الدفع من المحفظة غير مفعّل');
      const existing = await tx.bundlePayment.findFirst({ where: { userId: user.id, bundleId, status: 'APPROVED' } });
      if (existing) return;
      const bundle = await tx.courseBundle.findUnique({ where: { id: bundleId, isActive: true }, include: { courses: { include: { course: true } } } });
      if (!bundle) throw new CheckoutError(404, 'الحزمة غير موجودة');
      const amount = positiveAmount(bundle.price);
      if (!bundle.courses.length) throw new CheckoutError(400, 'الحزمة لا تحتوي كورسات متاحة');
      // A bundle must not provide a new enrollment path into hidden courses.
      if (bundle.courses.some(item => !isPubliclyOffered(item.course))) {
        throw new CheckoutError(404, 'الحزمة غير موجودة');
      }
      if (!await debitWallet(tx, user.id, 'USD', amount)) throw new CheckoutError(400, 'رصيد المحفظة غير كافٍ');
      const bundlePayment = await tx.bundlePayment.create({ data: { userId: user.id, bundleId: bundle.id, amount, provider: 'WALLET', status: 'APPROVED' } });
      for (const course of bundle.courses) {
        await tx.enrollment.upsert({ where: { userId_courseId: { userId: user.id, courseId: course.courseId } }, update: {}, create: { userId: user.id, courseId: course.courseId, progress: 0 } });
      }
      // Commission only for the referrer recorded at registration, never for a code typed at checkout.
      await recordReferralCommission(tx, { sourceKey: `bundle:${bundlePayment.id}`, buyerId: user.id, amount, currency: 'USD', bundleId: bundle.id });
    });
    return NextResponse.json({ success: true, message: 'تم شراء الحزمة بنجاح! تم تسجيلك في جميع الكورسات.' }, { headers: WALLET_HEADERS });
  } catch (error) { return walletError(error); }
}
