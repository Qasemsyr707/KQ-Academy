import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireRequestUser } from '@/lib/request-user';
import { COMMUNITY_HEADERS, COMMUNITY_RATES, CommunityError, communityFailure, limitCommunity } from '@/lib/community';

/**
 * Like / unlike a post.
 * KNOWN LIMIT (needs a schema change, see the community audit): likes are a bare
 * counter with no per-member record, so the server cannot know whether this member
 * already liked the post. Until a CommunityPostLike table exists, this endpoint at
 * least requires an active member, rate-limits each account and never goes below 0.
 */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireRequestUser(req);
    const body = await req.json();
    if (typeof body?.liked !== 'boolean') throw new CommunityError(400, 'قيمة الإعجاب غير صالحة');
    const { id } = await params;
    if (!await prisma.communityPost.findUnique({ where: { id }, select: { id: true } })) throw new CommunityError(404, 'المنشور غير موجود');
    limitCommunity(COMMUNITY_RATES.like, user.id);
    if (body.liked) {
      await prisma.communityPost.update({ where: { id }, data: { upvotes: { increment: 1 } } });
    } else {
      // Conditional: concurrent unlikes cannot push the counter below zero.
      await prisma.communityPost.updateMany({ where: { id, upvotes: { gt: 0 } }, data: { upvotes: { decrement: 1 } } });
    }
    const post = await prisma.communityPost.findUnique({ where: { id }, select: { upvotes: true } });
    return NextResponse.json({ upvotes: post?.upvotes ?? 0 }, { headers: COMMUNITY_HEADERS });
  } catch (error) {
    return communityFailure(error, 'like');
  }
}
