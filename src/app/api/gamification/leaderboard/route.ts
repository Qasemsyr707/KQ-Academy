import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    // Get top 20 students by points
    const topUsers = await prisma.user.findMany({
      where: { role: 'STUDENT' },
      orderBy: { points: 'desc' },
      take: 20,
      select: {
        id: true,
        name: true,
        points: true,
        image: true,
        badges: {
          select: {
            id: true,
            name: true,
            icon: true,
          }
        }
      }
    });

    return NextResponse.json({ leaderboard: topUsers });
  } catch (error: any) {
    console.error('Error fetching leaderboard:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
