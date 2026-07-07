import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

// GET /api/bundles — List all active bundles
export async function GET() {
  try {
    const bundles = await prisma.courseBundle.findMany({
      where: { isActive: true },
      include: {
        courses: {
          include: {
            course: {
              select: {
                id: true,
                title: true,
                thumbnail: true,
                price: true,
                category: true,
                instructor: { select: { name: true } }
              }
            }
          },
          orderBy: { order: 'asc' }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    return NextResponse.json({ bundles });
  } catch (error) {
    console.error('Bundles Error:', error);
    return NextResponse.json({ error: 'خطأ في جلب الحزم' }, { status: 500 });
  }
}
