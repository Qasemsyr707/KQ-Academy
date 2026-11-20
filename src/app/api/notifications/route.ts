import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireRequestUser, RequestUserError } from '@/lib/request-user';

const HEADERS = { 'Cache-Control': 'private, no-store', Vary: 'Cookie, Authorization' };
const fail = (error: unknown) => {
  if (error instanceof RequestUserError) return NextResponse.json({ error: error.message }, { status: error.status, headers: HEADERS });
  console.error('[notifications]', error);
  return NextResponse.json({ error: 'تعذّر تحميل الإشعارات حالياً' }, { status: 500, headers: HEADERS });
};

/** The caller's latest notifications and the true unread total (not just the visible page). */
export async function GET(req: Request) {
  try {
    const user = await requireRequestUser(req);
    const [notifications, unreadCount] = await Promise.all([
      prisma.notification.findMany({
        where: { userId: user.id },
        orderBy: { createdAt: 'desc' },
        take: 20,
        select: { id: true, title: true, message: true, link: true, isRead: true, createdAt: true },
      }),
      prisma.notification.count({ where: { userId: user.id, isRead: false } }),
    ]);
    return NextResponse.json({ notifications, unreadCount }, { headers: HEADERS });
  } catch (error) { return fail(error); }
}

/** Mark one (`{ id }`) or all (`{ markAll: true }`) of the caller's notifications as read. */
export async function PATCH(req: Request) {
  try {
    const user = await requireRequestUser(req);
    const body = await req.json().catch(() => null) as { id?: unknown; markAll?: unknown } | null;
    if (body?.markAll === true) {
      await prisma.notification.updateMany({ where: { userId: user.id, isRead: false }, data: { isRead: true } });
    } else if (typeof body?.id === 'string' && body.id.length <= 200) {
      // Scoped to the owner: another user's id simply matches nothing.
      await prisma.notification.updateMany({ where: { id: body.id, userId: user.id }, data: { isRead: true } });
    } else {
      return NextResponse.json({ error: 'طلب غير صالح' }, { status: 400, headers: HEADERS });
    }
    const unreadCount = await prisma.notification.count({ where: { userId: user.id, isRead: false } });
    return NextResponse.json({ success: true, unreadCount }, { headers: HEADERS });
  } catch (error) { return fail(error); }
}
