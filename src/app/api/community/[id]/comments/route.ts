import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireRequestUser } from '@/lib/request-user';
import { COMMUNITY_HEADERS, COMMUNITY_LIMITS, COMMUNITY_RATES, CommunityError, communityFailure, communityText, limitCommunity } from '@/lib/community';

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const comments = await prisma.communityComment.findMany({
      where: { postId: id },
      include: { user: { select: { name: true, role: true } } },
      orderBy: { createdAt: 'asc' },
      take: COMMUNITY_LIMITS.commentsPerRead,
    });
    return NextResponse.json(comments, { headers: COMMUNITY_HEADERS });
  } catch (error) {
    return communityFailure(error, 'list comments');
  }
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireRequestUser(req);
    const body = await req.json();
    const content = communityText(body?.content, COMMUNITY_LIMITS.comment, 'نص التعليق');
    const { id } = await params;
    if (!await prisma.communityPost.findUnique({ where: { id }, select: { id: true } })) throw new CommunityError(404, 'المنشور غير موجود');
    limitCommunity(COMMUNITY_RATES.write, user.id);
    const comment = await prisma.communityComment.create({
      data: { content, postId: id, userId: user.id },
      include: { user: { select: { name: true, role: true } } },
    });
    return NextResponse.json(comment, { headers: COMMUNITY_HEADERS });
  } catch (error) {
    return communityFailure(error, 'create comment');
  }
}
