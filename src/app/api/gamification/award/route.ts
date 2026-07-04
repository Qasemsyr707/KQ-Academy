import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { action } = await request.json(); // e.g. "WATCH_VIDEO", "PASS_EXAM"
    const userId = (session.user as any).id;

    // Define point rewards for actions
    const rewards: Record<string, number> = {
      'WATCH_VIDEO': 10,
      'PASS_EXAM': 50,
      'DAILY_LOGIN': 5,
    };

    const pointsToAward = rewards[action] || 10;

    const user = await prisma.user.update({
      where: { id: userId },
      data: {
        points: { increment: pointsToAward }
      }
    });

    return NextResponse.json({ success: true, pointsAwarded: pointsToAward, totalPoints: user.points });
  } catch (error: any) {
    console.error('Error awarding points:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
