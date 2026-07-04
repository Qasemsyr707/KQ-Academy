import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { postId, content } = await request.json();
    const userId = (session.user as any).id;

    if (!postId || !content) {
      return NextResponse.json({ error: 'Post ID and content are required' }, { status: 400 });
    }

    const comment = await prisma.communityComment.create({
      data: {
        postId,
        content,
        userId,
      },
      include: {
        user: { select: { id: true, name: true, image: true } }
      }
    });

    return NextResponse.json(comment);
  } catch (error: any) {
    console.error('Error creating community comment:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
