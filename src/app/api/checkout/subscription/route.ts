import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { sendWelcomeEmail } from '@/lib/email';

// POST /api/checkout/subscription — Subscribe to a plan
export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'يجب تسجيل الدخول أولاً' }, { status: 401 });
    }

    const { planId, period, paymentMethod } = await req.json();

    const plan = await prisma.subscriptionPlan.findUnique({
      where: { id: planId, isActive: true }
    });

    if (!plan) {
      return NextResponse.json({ error: 'خطة الاشتراك غير موجودة' }, { status: 404 });
    }

    const price = period === 'YEARLY' ? plan.priceYearly : plan.priceMonthly;
    const endDate = new Date();
    if (period === 'YEARLY') {
      endDate.setFullYear(endDate.getFullYear() + 1);
    } else {
      endDate.setMonth(endDate.getMonth() + 1);
    }

    // Check for existing active subscription
    const existing = await prisma.userSubscription.findFirst({
      where: { userId: session.user.id, status: 'ACTIVE' }
    });
    if (existing) {
      return NextResponse.json({ error: 'لديك اشتراك نشط بالفعل' }, { status: 400 });
    }

    if (paymentMethod === 'WALLET') {
      const user = await prisma.user.findUnique({ where: { id: session.user.id } });
      if (!user || user.walletUSD < price) {
        return NextResponse.json({ error: 'رصيد المحفظة غير كافٍ' }, { status: 400 });
      }

      await prisma.$transaction([
        prisma.user.update({
          where: { id: session.user.id },
          data: { walletUSD: { decrement: price } }
        }),
        prisma.userSubscription.create({
          data: {
            userId: session.user.id,
            planId: plan.id,
            period,
            status: 'ACTIVE',
            endDate,
            provider: 'WALLET'
          }
        }),
        prisma.walletTransaction.create({
          data: {
            userId: session.user.id,
            amount: -price,
            currency: 'USD',
            type: 'PURCHASE',
            status: 'APPROVED',
            provider: 'WALLET'
          }
        })
      ]);

      return NextResponse.json({
        success: true,
        message: `تم تفعيل اشتراك "${plan.name}" بنجاح حتى ${endDate.toLocaleDateString('ar-EG')}`
      });
    }

    return NextResponse.json({ error: 'طريقة الدفع غير مدعومة بعد' }, { status: 400 });
  } catch (error) {
    console.error('Subscription Checkout Error:', error);
    return NextResponse.json({ error: 'حدث خطأ أثناء الاشتراك' }, { status: 500 });
  }
}
