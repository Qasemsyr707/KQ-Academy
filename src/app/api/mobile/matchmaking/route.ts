import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const auth = { userId: session.user.id };

    const { subject } = await request.json();
    
    // Create or find match
    const existingMatch = await prisma.matchmakingRequest.findFirst({
      where: { subject, status: 'searching', userId: { not: auth.userId } }
    });

    if (existingMatch) {
      // Complete match
      const updatedMatch = await prisma.matchmakingRequest.update({
        where: { id: existingMatch.id },
        data: { status: 'matched', matchedWithId: auth.userId }
      });
      return NextResponse.json({ match: updatedMatch, isMatched: true });
    } else {
      // Create new request
      const newRequest = await prisma.matchmakingRequest.create({
        data: { userId: auth.userId, subject, status: 'searching' }
      });
      return NextResponse.json({ request: newRequest, isMatched: false });
    }
  } catch (error) {
    return NextResponse.json({ error: 'Failed to match' }, { status: 500 });
  }
}
