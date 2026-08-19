import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function GET(req: Request, { params }: { params: { id: string } }) {
  try {
    const comments = await prisma.shortComment.findMany({
      where: { shortId: params.id },
      include: {
        user: { select: { name: true, image: true } }
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
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: 'يجب تسجيل الدخول' }, { status: 401 });
    }

    const { content } = await req.json();
    if (!content) return NextResponse.json({ error: 'التعليق فارغ' }, { status: 400 });

    const comment = await prisma.shortComment.create({
      data: {
        content,
        shortId: params.id,
        userId: (session.user as any).id,
      },
      include: {
        user: { select: { name: true, image: true } }
      }
    });

    return NextResponse.json({ success: true, comment });
  } catch (error) {
    return NextResponse.json({ error: 'حدث خطأ' }, { status: 500 });
  }
}
