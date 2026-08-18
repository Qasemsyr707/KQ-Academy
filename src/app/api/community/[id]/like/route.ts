import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { liked } = await req.json(); // boolean indicating if we are liking or unliking

    const post = await prisma.communityPost.update({
      where: { id: params.id },
      data: {
        upvotes: {
          increment: liked ? 1 : -1
        }
      }
    });

    return NextResponse.json({ upvotes: post.upvotes });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to update like' }, { status: 500 });
  }
}
