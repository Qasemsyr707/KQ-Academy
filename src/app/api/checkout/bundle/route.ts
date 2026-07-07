import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

const AFFILIATE_COMMISSION_RATE = 0.10;

// POST /api/checkout/bundle — Purchase a course bundle
export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'يجب تسجيل الدخول أولاً' }, { status: 401 });
    }

    const { bundleId, paymentMethod, referralCode } = await req.json();

    const bundle = await prisma.courseBundle.findUnique({
      where: { id: bundleId, isActive: true },
      include: { courses: { include: { course: true } } }
    });

    if (!bundle) {
      return NextResponse.json({ error: 'الحزمة غير موجودة' }, { status: 404 });
    }

    // Wallet payment
    if (paymentMethod === 'WALLET') {
      const user = await prisma.user.findUnique({ where: { id: session.user.id } });
      if (!user || user.walletUSD < bundle.price) {
        return NextResponse.json({ error: 'رصيد المحفظة غير كافٍ' }, { status: 400 });
      }

      await prisma.$transaction(async (tx) => {
        // Deduct wallet
        await tx.user.update({
          where: { id: session.user.id },
          data: { walletUSD: { decrement: bundle.price } }
        });

        // Create payment record
        await tx.bundlePayment.create({
          data: {
            userId: session.user.id,
            bundleId: bundle.id,
            amount: bundle.price,
            provider: 'WALLET',
            status: 'APPROVED'
          }
        });

        // Enroll user in ALL courses in the bundle
        for (const bc of bundle.courses) {
          await tx.enrollment.upsert({
            where: { userId_courseId: { userId: session.user.id, courseId: bc.courseId } },
            update: {},
            create: { userId: session.user.id, courseId: bc.courseId, progress: 0 }
          });
        }

        // Handle affiliate commission
        if (referralCode) {
          const referrer = await tx.user.findFirst({
            where: { affiliateCode: referralCode, id: { not: session.user.id } }
          });
          if (referrer) {
            const commission = bundle.price * AFFILIATE_COMMISSION_RATE;
            await tx.affiliateEarning.create({
              data: {
                ownerId: referrer.id,
                buyerId: session.user.id,
                bundleId: bundle.id,
                amount: commission,
                status: 'PENDING'
              }
            });
          }
        }
      });

      return NextResponse.json({ success: true, message: 'تم شراء الحزمة بنجاح! تم تسجيلك في جميع الكورسات.' });
    }

    return NextResponse.json({ error: 'طريقة الدفع غير مدعومة بعد' }, { status: 400 });
  } catch (error) {
    console.error('Bundle Checkout Error:', error);
    return NextResponse.json({ error: 'حدث خطأ أثناء الشراء' }, { status: 500 });
  }
}
