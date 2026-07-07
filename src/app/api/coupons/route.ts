import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireRoleApi } from '@/lib/rbac';

export async function POST(req: Request) {
  try {
    const admin = await requireRoleApi(['ADMIN']);
    if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { code, discount } = await req.json();

    if (!code || discount === undefined) {
      return NextResponse.json({ error: 'Code and discount required' }, { status: 400 });
    }

    const coupon = await prisma.coupon.create({
      data: {
        code,
        discount
      }
    });

    return NextResponse.json({ success: true, coupon });
  } catch (error) {
    console.error('Create Coupon Error:', error);
    return NextResponse.json({ error: 'Failed to create coupon' }, { status: 500 });
  }
}
