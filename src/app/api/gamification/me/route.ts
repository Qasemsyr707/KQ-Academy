import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = (session.user as any).id;
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        points: true,
        badges: true
      }
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Calculate Rank
    const rank = await prisma.user.count({
      where: {
        role: 'STUDENT',
        points: { gt: user.points }
      }
    });

    return NextResponse.json({ 
      points: user.points, 
      badges: user.badges, 
      rank: rank + 1 
    });
  } catch (error: any) {
    console.error('Error fetching user gamification stats:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
