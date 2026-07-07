import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET(request: Request) {
  try {
    const shorts = await prisma.short.findMany({
      include: {
        user: { select: { name: true, image: true, role: true } }
      },
      orderBy: { createdAt: 'desc' }
    });
    return NextResponse.json(shorts);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch shorts' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { shortId, action } = await request.json(); // action = 'like'
    if (action === 'like') {
      const short = await prisma.short.update({
        where: { id: shortId },
        data: { likes: { increment: 1 } }
      });
      return NextResponse.json(short);
    }
    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    return NextResponse.json({ error: 'Action failed' }, { status: 500 });
  }
}
