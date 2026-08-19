import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET(req: Request) {
  try {
    const shorts = await prisma.short.findMany({
      include: {
        user: { select: { name: true, image: true } },
        course: { select: { title: true, id: true } },
        _count: {
          select: { comments: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    return NextResponse.json(shorts);
  } catch (error) {
    console.error('Error fetching shorts:', error);
    return NextResponse.json({ error: 'Failed to fetch shorts' }, { status: 500 });
  }
}
