import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireRequestUser } from '@/lib/request-user';
import { COMMUNITY_HEADERS, COMMUNITY_LIMITS, COMMUNITY_RATES, CommunityError, communityFailure, communityText, limitCommunity } from '@/lib/community';

export async function POST(request: Request) {
  try {
    const user = await requireRequestUser(request);
    const body = await request.json();
    const postId = body?.postId;
    if (typeof postId !== 'string' || !postId || postId.length > 64) throw new CommunityError(400, 'المنشور غير صالح');
    const content = communityText(body?.content, COMMUNITY_LIMITS.comment, 'نص التعليق');
    if (!await prisma.communityPost.findUnique({ where: { id: postId }, select: { id: true } })) throw new CommunityError(404, 'المنشور غير موجود');
    limitCommunity(COMMUNITY_RATES.write, user.id);
    const comment = await prisma.communityComment.create({
      data: { postId, content, userId: user.id },
      include: { user: { select: { id: true, name: true, image: true } } },
    });
    return NextResponse.json(comment, { headers: COMMUNITY_HEADERS });
  } catch (error) {
    return communityFailure(error, 'create comment');
  }
}
