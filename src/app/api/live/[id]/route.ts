import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireRequestUser, RequestUserError } from '@/lib/request-user';
import { hasPermission } from '@/lib/permission-check';

const headers = { 'Cache-Control': 'private, no-store', Vary: 'Cookie, Authorization' };

/**
 * Session status follows what really happened:
 *   start  : upcoming -> live    (the host's studio connected to LiveKit)
 *   end    : live|upcoming -> ended
 *   cancel : upcoming -> cancelled
 * Only the session's instructor, or OWNER / an ADMIN with LIVE_CLASSES, may change it.
 */
const TRANSITIONS: Record<string, { from: string[]; to: string }> = {
  start: { from: ['upcoming'], to: 'live' },
  end: { from: ['live', 'upcoming'], to: 'ended' },
  cancel: { from: ['upcoming'], to: 'cancelled' },
};

export async function PATCH(req: Request, props: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireRequestUser(req, ['INSTRUCTOR', 'ADMIN', 'OWNER']);
    const { id } = await props.params;
    const body = await req.json().catch(() => null);
    const transition = TRANSITIONS[typeof body?.action === 'string' ? body.action : ''];
    if (!transition) return NextResponse.json({ error: 'الإجراء غير صالح' }, { status: 400, headers });
    const session = await prisma.liveClass.findUnique({ where: { id }, select: { id: true, instructorId: true, status: true } });
    if (!session) return NextResponse.json({ error: 'الجلسة غير موجودة' }, { status: 404, headers });
    const staff = user.role === 'OWNER' || (user.role === 'ADMIN' && await hasPermission(user.id, 'LIVE_CLASSES'));
    if (session.instructorId !== user.id && !staff) return NextResponse.json({ error: 'لا تملك صلاحية إدارة هذه الجلسة' }, { status: 403, headers });
    if (session.status === transition.to) return NextResponse.json({ success: true, status: session.status }, { headers });
    const changed = await prisma.liveClass.updateMany({ where: { id, status: { in: transition.from } }, data: { status: transition.to } });
    if (changed.count !== 1) return NextResponse.json({ error: 'تغيّرت حالة الجلسة؛ حدّث الصفحة' }, { status: 409, headers });
    return NextResponse.json({ success: true, status: transition.to }, { headers });
  } catch (error) {
    if (error instanceof RequestUserError) return NextResponse.json({ error: error.message }, { status: error.status, headers });
    console.error('[live status]', error);
    return NextResponse.json({ error: 'تعذّر تحديث حالة الجلسة' }, { status: 500, headers });
  }
}
