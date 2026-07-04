import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: 'غير مصرح' }, { status: 401 });
    }

    const { courseId, paymentCurrency } = await req.json(); // paymentCurrency = 'USD' or 'SYP'

    if (!courseId || !['USD', 'SYP'].includes(paymentCurrency)) {
      return NextResponse.json({ error: 'بيانات غير صحيحة' }, { status: 400 });
    }

    const userId = (session.user as any).id;

    const course = await prisma.course.findUnique({
      where: { id: courseId }
    });

    if (!course) {
      return NextResponse.json({ error: 'الكورس غير موجود' }, { status: 404 });
    }

    // Check if already enrolled
    const existingEnrollment = await prisma.enrollment.findUnique({
      where: { userId_courseId: { userId, courseId } }
    });

    if (existingEnrollment) {
      return NextResponse.json({ error: 'أنت مسجل بالفعل في هذا الكورس' }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!user) {
      return NextResponse.json({ error: 'المستخدم غير موجود' }, { status: 404 });
    }

    const exchangeRateSetting = await prisma.setting.findUnique({
      where: { key: 'exchangeRate' }
    });
    const exchangeRate = exchangeRateSetting ? parseFloat(exchangeRateSetting.value) : 14500;

    let amountToDeductUSD = 0;
    let amountToDeductSYP = 0;
    
    // Logic: user wants to pay in `paymentCurrency`
    if (paymentCurrency === 'USD') {
      const priceUSD = course.price;
      if (user.walletUSD >= priceUSD) {
        amountToDeductUSD = priceUSD;
      } else {
        // Not enough USD
        return NextResponse.json({ error: 'رصيد الدولار غير كافٍ' }, { status: 400 });
      }
    } else if (paymentCurrency === 'SYP') {
      const priceSYP = course.priceSYP;
      if (user.walletSYP >= priceSYP) {
        amountToDeductSYP = priceSYP;
      } else if (user.walletUSD >= (priceSYP / exchangeRate)) {
        // They want to pay SYP, don't have enough SYP, but have enough USD
        amountToDeductUSD = (priceSYP / exchangeRate);
      } else {
        return NextResponse.json({ error: 'الرصيد غير كافٍ (لا بالدولار ولا بالسوري)' }, { status: 400 });
      }
    }

    // Execute Transaction
    await prisma.$transaction(async (p) => {
      if (amountToDeductUSD > 0) {
        await p.user.update({
          where: { id: userId },
          data: { walletUSD: { decrement: amountToDeductUSD } }
        });
      }
      if (amountToDeductSYP > 0) {
        await p.user.update({
          where: { id: userId },
          data: { walletSYP: { decrement: amountToDeductSYP } }
        });
      }

      // Record wallet transaction
      await p.walletTransaction.create({
        data: {
          userId,
          amount: amountToDeductUSD > 0 ? amountToDeductUSD : amountToDeductSYP,
          currency: amountToDeductUSD > 0 ? 'USD' : 'SYP',
          type: 'PURCHASE',
          status: 'APPROVED'
        }
      });

      // Enroll the user
      await p.enrollment.create({
        data: { userId, courseId }
      });
      
      // Also create an APPROVED Payment record just for standard accounting
      await p.payment.create({
        data: {
          userId,
          courseId,
          amount: amountToDeductUSD > 0 ? amountToDeductUSD : amountToDeductSYP,
          paymentMethod: 'WALLET',
          status: 'APPROVED'
        }
      });
    });

    return NextResponse.json({ message: 'تم الشراء بنجاح' });
  } catch (error) {
    console.error('Wallet Purchase Error:', error);
    return NextResponse.json({ error: 'حدث خطأ في الخادم' }, { status: 500 });
  }
}
