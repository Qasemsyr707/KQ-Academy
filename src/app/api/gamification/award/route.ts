import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function POST(req: Request) {
  try {
    const { userId, points, reason } = await req.json();

    if (!userId || !points) {
      return NextResponse.json({ error: 'Missing userId or points' }, { status: 400 });
    }

    const user = await prisma.user.update({
      where: { id: userId },
      data: {
        points: { increment: points }
      }
    });

    // Optionally create a Badge if threshold is crossed, we will keep it simple for now
    
    return NextResponse.json({ success: true, newTotal: user.points, reason });
  } catch (error) {
    console.error('Gamification Award Error:', error);
    return NextResponse.json({ error: 'Failed to award points' }, { status: 500 });
  }
}
