import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireRequestUser } from '@/lib/request-user';
import { COMMUNITY_HEADERS, COMMUNITY_LIMITS, COMMUNITY_RATES, communityFailure, communityPage, communityText, limitCommunity } from '@/lib/community';

/** Newest posts, one page at a time (`?before=<createdAt of the last post>`). Response shape unchanged: an array. */
export async function GET(req: Request) {
  try {
    const { take, before } = communityPage(req.url);
    const posts = await prisma.communityPost.findMany({
      where: before ? { createdAt: { lt: before } } : undefined,
      include: {
        user: { select: { name: true, role: true } },
        _count: { select: { comments: true } },
      },
      orderBy: { createdAt: 'desc' },
      take,
    });
    return NextResponse.json(posts, { headers: COMMUNITY_HEADERS });
  } catch (error) {
    return communityFailure(error, 'list posts');
  }
}

/** Signed-in, non-banned members only; same-origin JSON (CSRF), validated, rate-limited per account. */
export async function POST(req: Request) {
  try {
    const user = await requireRequestUser(req);
    const body = await req.json();
    const content = communityText(body?.content, COMMUNITY_LIMITS.post, 'نص المنشور');
    const title = body?.title === undefined || body?.title === null || body?.title === ''
      ? 'منشور جديد' : communityText(body.title, COMMUNITY_LIMITS.title, 'العنوان');
    limitCommunity(COMMUNITY_RATES.write, user.id);
    const post = await prisma.communityPost.create({
      data: { title, content, userId: user.id },
      include: {
        user: { select: { name: true, role: true } },
        _count: { select: { comments: true } },
      },
    });
    return NextResponse.json(post, { headers: COMMUNITY_HEADERS });
  } catch (error) {
    return communityFailure(error, 'create post');
  }
}
