import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function GET(req: Request, { params }: { params: { id: string } }) {
  try {
    const { id } = await params;
    const comments = await prisma.shortComment.findMany({
      where: { 
        shortId: id,
        parentId: null, // Only fetch top-level comments 
      },
      include: {
        user: { select: { name: true, image: true, role: true } },
        replies: {
          include: {
            user: { select: { name: true, image: true, role: true } }
          },
          orderBy: { createdAt: 'asc' }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
    return NextResponse.json(comments);
  } catch (error) {
    return NextResponse.json({ error: 'حدث خطأ' }, { status: 500 });
  }
}

export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    const { id } = await params;
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: 'يجب تسجيل الدخول' }, { status: 401 });
    }

    const { content, parentId } = await req.json();
    if (!content) return NextResponse.json({ error: 'التعليق فارغ' }, { status: 400 });

    let finalParentId = parentId || null;

    // Prevent deeply nested replies (if parent itself is a reply, attach to its parent)
    if (finalParentId) {
      const parentComment = await prisma.shortComment.findUnique({ where: { id: finalParentId } });
      if (parentComment && parentComment.parentId) {
        finalParentId = parentComment.parentId;
      }
    }

    const comment = await prisma.shortComment.create({
      data: {
        content,
        shortId: id,
        userId: (session.user as any).id,
        parentId: finalParentId,
      },
      include: {
        user: { select: { name: true, image: true, role: true } },
        replies: { include: { user: { select: { name: true, image: true, role: true } } } }
      }
    });

    return NextResponse.json({ success: true, comment, isReply: !!finalParentId });
  } catch (error) {
    return NextResponse.json({ error: 'حدث خطأ' }, { status: 500 });
  }
}
