import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { PaymentFactory } from '@/lib/payments/PaymentFactory';

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: 'غير مصرح لك' }, { status: 401 });
    }

    const { courseId, provider, couponCode } = await req.json();

    const course = await prisma.course.findUnique({
      where: { id: courseId }
    });

    if (!course) {
      return NextResponse.json({ error: 'الكورس غير موجود' }, { status: 404 });
    }

    let finalPrice = course.price;
    let couponId = undefined;

    if (couponCode) {
      const coupon = await prisma.coupon.findUnique({ where: { code: couponCode } });
      if (coupon && (!coupon.courseId || coupon.courseId === courseId)) {
        finalPrice = finalPrice * (1 - coupon.discount / 100);
        couponId = coupon.id;
      }
    }

    // Call Factory Pattern
    const gateway = PaymentFactory.getProvider(provider);
    const intent = await gateway.createPaymentIntent(finalPrice, 'USD', {
      userId: session.user.id,
      courseId: course.id,
      courseName: course.title
    });

    if (!intent.success) {
      return NextResponse.json({ error: intent.error || 'فشل في الاتصال ببوابة الدفع' }, { status: 500 });
    }

    // Save pending payment
    await prisma.payment.create({
      data: {
        amount: finalPrice,
        paymentMethod: provider, // Keeping for backward compatibility
        provider: provider,
        transactionId: intent.transactionId,
        status: 'PENDING',
        userId: session.user.id,
        courseId: course.id,
        couponId: couponId
      }
    });

    return NextResponse.json({ url: intent.checkoutUrl });

  } catch (error) {
    console.error('Checkout Gateway Error:', error);
    return NextResponse.json({ error: 'حدث خطأ غير متوقع' }, { status: 500 });
  }
}
