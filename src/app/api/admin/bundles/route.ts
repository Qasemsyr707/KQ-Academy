import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireRoleApi } from '@/lib/rbac';

// GET /api/admin/bundles — list all bundles
export async function GET() {
  try {
    // Role from the database (not the session token), so a removed admin loses access at once.
    const staff = await requireRoleApi(['ADMIN'], 'MARKETING');
    if (staff.errorResponse) return staff.errorResponse;
    const bundles = await prisma.courseBundle.findMany({
      include: { courses: { include: { course: { select: { id: true, title: true, price: true } } } } },
      orderBy: { createdAt: 'desc' }
    });
    return NextResponse.json({ bundles });
  } catch (e) {
    return NextResponse.json({ error: 'Error' }, { status: 500 });
  }
}

// POST /api/admin/bundles — create bundle
export async function POST(req: Request) {
  try {
    // Role from the database (not the session token), so a removed admin loses access at once.
    const staff = await requireRoleApi(['ADMIN'], 'MARKETING');
    if (staff.errorResponse) return staff.errorResponse;
    const { title, description, price, priceSYP, courseIds } = await req.json();
    if (!title || !price || !courseIds?.length) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }
    const bundle = await prisma.courseBundle.create({
      data: {
        title,
        description,
        price: parseFloat(price),
        priceSYP: parseFloat(priceSYP || 0),
        courses: {
          create: courseIds.map((courseId: string, i: number) => ({ courseId, order: i }))
        }
      },
      include: { courses: { include: { course: { select: { id: true, title: true } } } } }
    });
    return NextResponse.json({ success: true, bundle });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Failed to create bundle' }, { status: 500 });
  }
}
