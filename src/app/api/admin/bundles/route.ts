import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

// GET /api/admin/bundles — list all bundles
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || (session.user as any).role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
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
    const session = await getServerSession(authOptions);
    if (!session?.user || (session.user as any).role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
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
