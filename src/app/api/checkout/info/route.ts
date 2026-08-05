import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: 'غير مصرح' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const courseId = searchParams.get('courseId');

    if (!courseId) {
      return NextResponse.json({ error: 'معرف الكورس مفقود' }, { status: 400 });
    }

    const course = await prisma.course.findUnique({
      where: { id: courseId },
      select: { 
        title: true, 
        price: true, 
        priceSYP: true,
        thumbnail: true,
        instructor: { select: { name: true } }
      }
    });

    if (!course) {
      return NextResponse.json({ error: 'الكورس غير موجود' }, { status: 404 });
    }

    const user = await prisma.user.findUnique({
      where: { id: (session.user as any).id },
      select: { walletUSD: true, walletSYP: true }
    });

    const exchangeRateSetting = await prisma.setting.findUnique({
      where: { key: 'exchangeRate' }
    });
    
    const exchangeRate = exchangeRateSetting ? parseFloat(exchangeRateSetting.value) : 14500;

    const allSettings = await prisma.setting.findMany();
    const paymentSettings: Record<string, string> = {};
    allSettings.forEach(s => {
      if (s.key.startsWith('ENABLE_')) {
        paymentSettings[s.key] = s.value;
      }
    });

    return NextResponse.json({
      course,
      wallet: user,
      exchangeRate,
      paymentSettings
    });
  } catch (error) {
    console.error('Checkout Info API Error:', error);
    return NextResponse.json({ error: 'حدث خطأ في الخادم' }, { status: 500 });
  }
}
