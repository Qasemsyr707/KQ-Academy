import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user?.email) {
      return NextResponse.json({ error: 'غير مصرح' }, { status: 401 });
    }

    const notifications = await prisma.notification.findMany({
      where: { user: { email: session.user.email } },
      orderBy: { createdAt: 'desc' },
      take: 20
    });

    return NextResponse.json({ notifications });
  } catch (error) {
    console.error('Error fetching notifications:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user?.email) {
      return NextResponse.json({ error: 'غير مصرح' }, { status: 401 });
    }

    const { id, markAll } = await req.json();

    if (markAll) {
      await prisma.notification.updateMany({
        where: { user: { email: session.user.email }, isRead: false },
        data: { isRead: true }
      });
      return NextResponse.json({ success: true });
    }

    if (id) {
      // Find the user first to ensure they own the notification
      const user = await prisma.user.findUnique({ where: { email: session.user.email } });
      if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

      await prisma.notification.updateMany({
        where: { id, userId: user.id },
        data: { isRead: true }
      });
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: 'Bad Request' }, { status: 400 });
  } catch (error) {
    console.error('Error updating notifications:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
