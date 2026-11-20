import { CheckoutError, readCheckoutContext } from '@/lib/payments/checkout-context';
import { withPaymentTransaction } from '@/lib/payments/transactions';
import { notify, notifyEnrollment } from '@/lib/notifications';

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

    let enrollmentCreated = false;
    if (status === 'APPROVED') {
      // An enrollment is unique per student and course, while a student may pay
      // for the same course more than once. Only the payment that actually creates
      // the enrollment announces it; an existing enrollment (and its progress) is left alone.
      enrollmentCreated = (await tx.enrollment.createMany({
        data: [{ userId: payment.userId, courseId: payment.courseId, progress: 0 }], skipDuplicates: true,
      })).count === 1;
      const amount = context.amountMinor / 100;
      await tx.user.update({
        where: { id: payment.course.instructorId },
        data: {
          walletUSD: context.currency === 'USD' ? { increment: amount } : undefined,
          walletSYP: context.currency === 'SYP' ? { increment: amount } : undefined,
        },
      });
    }

    if (status === 'APPROVED') {
      if (enrollmentCreated) await notifyEnrollment(tx, { userId: payment.userId, courseId: payment.courseId, courseTitle: payment.course.title,
        instructorId: payment.course.instructorId, eventKey: payment.id });
    } else {
      await notify(tx, { userId: payment.userId, title: 'تعذّر تأكيد الدفع',
        message: `لم نتمكن من تأكيد دفعتك لكورس «${payment.course.title}». يمكنك إعادة المحاولة أو التواصل مع الدعم.`,
        link: `/checkout?courseId=${payment.courseId}`, dedupeKey: `payment-rejected:${payment.id}` });
    }

    const updatedPayment = await tx.payment.findUnique({ where: { id: payment.id }, include: { course: true } });
    if (!updatedPayment) throw new CheckoutError(409, 'تعذّر استرجاع الدفعة بعد المراجعة');
    return updatedPayment;
  });
}
