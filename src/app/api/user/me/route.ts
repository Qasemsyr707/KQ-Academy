import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user?.email) {
      return NextResponse.json({ error: 'غير مصرح' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        // NOTE: image can be large base64; we return it only here, NOT in the JWT
        image: true,
        walletUSD: true,
        walletSYP: true,
        createdAt: true,
      },
    });

    if (!user) return NextResponse.json({ error: 'المستخدم غير موجود' }, { status: 404 });

    return NextResponse.json({ user });
  } catch (error) {
    console.error('GET /api/user/me error:', error);
    return NextResponse.json({ error: 'خطأ في الخادم' }, { status: 500 });
  }
}
