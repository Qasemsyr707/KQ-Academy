import { CheckoutError, readCheckoutContext } from '@/lib/payments/checkout-context';
import { withPaymentTransaction } from '@/lib/payments/transactions';

export type ManualReviewStatus = 'APPROVED' | 'REJECTED';

/** Review one manual receipt atomically; online payments require gateway proof. */
export async function reviewManualPayment(paymentId: string, status: ManualReviewStatus) {
  if (status !== 'APPROVED' && status !== 'REJECTED') {
    throw new CheckoutError(400, 'حالة الدفع غير صالحة');
  }
  return withPaymentTransaction(async tx => {
    const payment = await tx.payment.findUnique({ where: { id: paymentId }, include: { course: true } });
    if (!payment) throw new CheckoutError(404, 'الدفعة غير موجودة');
    if (payment.provider !== 'MANUAL' || payment.paymentMethod !== 'MANUAL') {
      throw new CheckoutError(409, 'يجب تأكيد المدفوعات الإلكترونية من بوابة الدفع');
    }

    const context = readCheckoutContext(payment);
    if (!context || (context.state !== 'READY' && !(payment.status === 'APPROVED' && context.state === 'VERIFIED'))) {
      throw new CheckoutError(409, 'بيانات العملة أو مرجع الدفع غير مكتملة؛ يرجى مراجعة الدفعة قبل معالجتها');
    }
    if (payment.status === status) return payment;
    if (payment.status !== 'PENDING') {
      throw new CheckoutError(409, 'لا يمكن تغيير دفعة تمت مراجعتها مسبقاً');
    }

    const providerResponse = JSON.stringify({ ...context, state: status === 'APPROVED' ? 'VERIFIED' : context.state });
    const changed = await tx.payment.updateMany({
      where: {
        id: payment.id, status: 'PENDING', provider: 'MANUAL', paymentMethod: 'MANUAL',
        userId: payment.userId, courseId: payment.courseId, amount: payment.amount,
        providerResponse: payment.providerResponse,
      },
      data: { status, providerResponse },
    });
    if (changed.count !== 1) {
      throw new CheckoutError(409, 'تمت معالجة الدفعة أو تغييرها؛ يرجى تحديث الصفحة');
    }

    if (status === 'APPROVED') {
      await tx.enrollment.upsert({
        where: { userId_courseId: { userId: payment.userId, courseId: payment.courseId } },
        update: {},
        create: { userId: payment.userId, courseId: payment.courseId, progress: 0 },
      });
      const amount = context.amountMinor / 100;
      await tx.user.update({
        where: { id: payment.course.instructorId },
        data: {
          walletUSD: context.currency === 'USD' ? { increment: amount } : undefined,
          walletSYP: context.currency === 'SYP' ? { increment: amount } : undefined,
        },
      });
    }

    const updatedPayment = await tx.payment.findUnique({ where: { id: payment.id }, include: { course: true } });
    if (!updatedPayment) throw new CheckoutError(409, 'تعذّر استرجاع الدفعة بعد المراجعة');
    return updatedPayment;
  });
}
