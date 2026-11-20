import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireRequestUser } from '@/lib/request-user';
import { COMMUNITY_HEADERS, CommunityError, communityFailure, isStaff } from '@/lib/community';

/** Delete a post: its author, or an administrator/owner (moderation). Its comments go with it. */
export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireRequestUser(req);
    const { id } = await params;
    const post = await prisma.communityPost.findUnique({ where: { id }, select: { userId: true } });
    if (!post) throw new CommunityError(404, 'المنشور غير موجود');
    if (post.userId !== user.id && !isStaff(user.role)) throw new CommunityError(403, 'لا يمكنك حذف منشور شخص آخر');
    await prisma.communityPost.deleteMany({ where: { id } });
    return NextResponse.json({ success: true }, { headers: COMMUNITY_HEADERS });
  } catch (error) {
    return communityFailure(error, 'delete post');
  }
}
