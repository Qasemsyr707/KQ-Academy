import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

// GET /api/admin/subscriptions — list plans
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || (session.user as any).role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const plans = await prisma.subscriptionPlan.findMany({
      include: { subscriptions: { where: { status: 'ACTIVE' }, select: { id: true } } },
      orderBy: { priceMonthly: 'asc' }
    });
    return NextResponse.json({ plans });
  } catch (e) {
    return NextResponse.json({ error: 'Error' }, { status: 500 });
  }
}

// POST /api/admin/subscriptions — create plan
export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || (session.user as any).role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const { name, description, priceMonthly, priceYearly, features } = await req.json();
    if (!name || !priceMonthly || !priceYearly) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }
    const plan = await prisma.subscriptionPlan.create({
      data: {
        name,
        description,
        priceMonthly: parseFloat(priceMonthly),
        priceYearly: parseFloat(priceYearly),
        features: JSON.stringify(features || [])
      }
    });
    return NextResponse.json({ success: true, plan });
  } catch (e) {
    return NextResponse.json({ error: 'Failed to create plan' }, { status: 500 });
  }
}
