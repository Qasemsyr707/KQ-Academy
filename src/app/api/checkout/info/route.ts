import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireRequestUser } from '@/lib/request-user';
import { CheckoutError } from '@/lib/payments/checkout-context';
import { paymentId, positiveAmount, walletError, WALLET_HEADERS } from '@/lib/payments/wallet-operations';
import { checkoutAvailable } from '@/lib/payments/availability';

const PUBLIC_PAYMENT_SWITCHES = ['ENABLE_STRIPE', 'ENABLE_PAYPAL', 'ENABLE_TABBY', 'ENABLE_TAMARA', 'ENABLE_WALLET', 'ENABLE_MANUAL'];

export async function GET(req: Request) {
  try {
    const viewer = await requireRequestUser(req);

    const { searchParams } = new URL(req.url);
    const courseId = searchParams.get('courseId');

    if (!paymentId(courseId)) throw new CheckoutError(400, 'معرف الكورس مفقود');

    const course = await prisma.course.findUnique({
      where: { id: courseId, status: 'PUBLISHED' },
      select: { 
        title: true, 
        price: true, 
        priceSYP: true,
        thumbnail: true,
        instructor: { select: { name: true } }
      }
    });

    if (!course) {
      throw new CheckoutError(404, 'الكورس غير موجود');
    }

    const user = await prisma.user.findUnique({
      where: { id: viewer.id },
      select: { walletUSD: true, walletSYP: true }
    });

    const exchangeRateSetting = await prisma.setting.findUnique({
      where: { key: 'exchangeRate' }
    });
    
    const exchangeRate = positiveAmount(exchangeRateSetting ? Number(exchangeRateSetting.value) : 14500);

    const allSettings = await prisma.setting.findMany({ where: { key: { in: PUBLIC_PAYMENT_SWITCHES } } });
    const paymentSettings: Record<string, string> = {};
    allSettings.forEach(s => {
      if (PUBLIC_PAYMENT_SWITCHES.includes(s.key)) {
        paymentSettings[s.key] = s.value;
      }
    });
    for (const key of PUBLIC_PAYMENT_SWITCHES) {
      if (!checkoutAvailable(key.slice('ENABLE_'.length))) paymentSettings[key] = 'false';
    }

    return NextResponse.json({
      course,
      wallet: user,
      exchangeRate,
      paymentSettings
    }, { headers: WALLET_HEADERS });
  } catch (error) {
    return walletError(error);
  }
}
