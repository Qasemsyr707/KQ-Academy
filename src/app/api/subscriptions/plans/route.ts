import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

// GET /api/subscriptions/plans — List all active subscription plans
export async function GET() {
  try {
    const plans = await prisma.subscriptionPlan.findMany({
      where: { isActive: true },
      orderBy: { priceMonthly: 'asc' }
    });

    return NextResponse.json({ plans });
  } catch (error) {
    console.error('Subscription Plans Error:', error);
    return NextResponse.json({ error: 'خطأ في جلب خطط الاشتراك' }, { status: 500 });
  }
}
