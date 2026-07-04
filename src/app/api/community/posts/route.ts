import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const posts = await prisma.communityPost.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        user: { select: { id: true, name: true, image: true } },
        comments: {
          include: { user: { select: { id: true, name: true, image: true } } },
          orderBy: { createdAt: 'asc' }
        }
      }
    });

    return NextResponse.json(posts);
  } catch (error: any) {
    console.error('Error fetching community posts:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { title, content } = await request.json();
    const userId = (session.user as any).id;

    if (!title || !content) {
      return NextResponse.json({ error: 'Title and content are required' }, { status: 400 });
    }

    const post = await prisma.communityPost.create({
      data: {
        title,
        content,
        userId,
      },
      include: {
        user: { select: { id: true, name: true, image: true } },
        comments: true
      }
    });

    return NextResponse.json(post);
  } catch (error: any) {
    console.error('Error creating community post:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
