import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET(request: Request) {
  try {
    const liveClasses = await prisma.liveClass.findMany({
      include: {
        instructor: { select: { id: true, name: true, image: true } }
      },
      orderBy: { scheduledAt: 'asc' }
    });
    return NextResponse.json(liveClasses);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch live classes' }, { status: 500 });
  }
}
