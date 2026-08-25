import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    const { id } = await params;
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: 'يجب تسجيل الدخول للإعجاب' }, { status: 401 });
    }

    // In a full implementation, we'd have a ShortLike model to prevent duplicate likes,
    // but for simplicity and speed, we will just increment the likes counter.
    const short = await prisma.short.update({
      where: { id: id },
      data: { likes: { increment: 1 } },
    });

    return NextResponse.json({ success: true, likes: short.likes });
  } catch (error) {
    console.error('Error liking short:', error);
    return NextResponse.json({ error: 'حدث خطأ' }, { status: 500 });
  }
}
