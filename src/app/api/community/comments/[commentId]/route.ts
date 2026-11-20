import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireRequestUser } from '@/lib/request-user';
import { COMMUNITY_HEADERS, CommunityError, communityFailure, isStaff } from '@/lib/community';

/** Delete a comment: its author, or an administrator/owner (moderation). */
export async function DELETE(req: Request, { params }: { params: Promise<{ commentId: string }> }) {
  try {
    const user = await requireRequestUser(req);
    const { commentId } = await params;
    const comment = await prisma.communityComment.findUnique({ where: { id: commentId }, select: { userId: true } });
    if (!comment) throw new CommunityError(404, 'التعليق غير موجود');
    if (comment.userId !== user.id && !isStaff(user.role)) throw new CommunityError(403, 'لا يمكنك حذف تعليق شخص آخر');
    await prisma.communityComment.deleteMany({ where: { id: commentId } });
    return NextResponse.json({ success: true }, { headers: COMMUNITY_HEADERS });
  } catch (error) {
    return communityFailure(error, 'delete comment');
  }
}
