import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireRoleApi } from '@/lib/rbac';

// GET /api/admin/subscriptions — list plans
export async function GET() {
  try {
    // Role from the database (not the session token), so a removed admin loses access at once.
    const staff = await requireRoleApi(['ADMIN']);
    if (staff.errorResponse) return staff.errorResponse;
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
    // Role from the database (not the session token), so a removed admin loses access at once.
    const staff = await requireRoleApi(['ADMIN']);
    if (staff.errorResponse) return staff.errorResponse;
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
