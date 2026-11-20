import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireRequestUser } from '@/lib/request-user';
import { COMMUNITY_HEADERS, COMMUNITY_LIMITS, COMMUNITY_RATES, communityFailure, communityPage, communityText, limitCommunity } from '@/lib/community';

export const dynamic = 'force-dynamic';

/** Posts with their comments (used by /features/community). Paged; comments bounded per post. */
export async function GET(req: Request) {
  try {
    const { take, before } = communityPage(req.url);
    const posts = await prisma.communityPost.findMany({
      where: before ? { createdAt: { lt: before } } : undefined,
      orderBy: { createdAt: 'desc' },
      take,
      include: {
        user: { select: { id: true, name: true, image: true } },
        comments: {
          include: { user: { select: { id: true, name: true, image: true } } },
          orderBy: { createdAt: 'asc' },
          take: COMMUNITY_LIMITS.commentsPerRead,
        },
      },
    });
    return NextResponse.json(posts, { headers: COMMUNITY_HEADERS });
  } catch (error) {
    return communityFailure(error, 'list posts with comments');
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireRequestUser(request);
    const body = await request.json();
    const title = communityText(body?.title, COMMUNITY_LIMITS.title, 'العنوان');
    const content = communityText(body?.content, COMMUNITY_LIMITS.post, 'نص المنشور');
    limitCommunity(COMMUNITY_RATES.write, user.id);
    const post = await prisma.communityPost.create({
      data: { title, content, userId: user.id },
      include: { user: { select: { id: true, name: true, image: true } }, comments: true },
    });
    return NextResponse.json(post, { headers: COMMUNITY_HEADERS });
  } catch (error) {
    return communityFailure(error, 'create post');
  }
}
