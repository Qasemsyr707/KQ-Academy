import { NextResponse } from 'next/server';
import { RoomServiceClient, TrackSource } from 'livekit-server-sdk';
import { prisma } from '@/lib/db';
import { hasPermission } from '@/lib/permission-check';
import { requireRequestUser, RequestUserError } from '@/lib/request-user';

export const runtime = 'nodejs';
const headers = { 'Cache-Control': 'private, no-store', Vary: 'Cookie, Authorization' };
const actions = ['microphone', 'camera', 'screen', 'revoke'] as const;
type Action = (typeof actions)[number];

/** Only a verified course host may grant publishing to an enrolled student. */
export async function POST(req: Request, props: { params: Promise<{ id: string }> }) {
  try {
    const actor = await requireRequestUser(req, ['INSTRUCTOR', 'ADMIN', 'OWNER']);
    const { id } = await props.params;
    if (!/^[A-Za-z0-9_-]{1,200}$/.test(id)) {
      return NextResponse.json({ error: 'الجلسة غير صالحة' }, { status: 400, headers });
    }
    const payload: unknown = await req.json().catch(() => null);
    if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
      return NextResponse.json({ error: 'بيانات الطلب غير صالحة' }, { status: 400, headers });
    }
    const { identity, action } = payload as Record<string, unknown>;
    if (typeof identity !== 'string' || !/^[A-Za-z0-9_-]{1,200}$/.test(identity) ||
        typeof action !== 'string' || !actions.includes(action as Action)) {
      return NextResponse.json({ error: 'المشارك أو الإجراء غير صالح' }, { status: 400, headers });
    }
    const session = await prisma.liveClass.findUnique({
      where: { id },
      select: { id: true, status: true, instructorId: true, course: { select: { id: true, instructorId: true } } },
    });
    if (!session) return NextResponse.json({ error: 'الجلسة غير موجودة' }, { status: 404, headers });
    if (session.status !== 'live') return NextResponse.json({ error: 'يجب أن يكون البث مباشراً لتغيير صلاحيات المشاركين' }, { status: 409, headers });

    const host = actor.role === 'OWNER'
      || (actor.role === 'ADMIN' && await hasPermission(actor.id, 'LIVE_CLASSES'))
      || (actor.role === 'INSTRUCTOR' && (session.instructorId === actor.id || session.course.instructorId === actor.id));
    if (!host) return NextResponse.json({ error: 'لا تملك صلاحية إدارة المشاركين' }, { status: 403, headers });

    // A participant's identity is their authenticated database user ID (see livekit-access.ts).
    // Check identity against DB and enrollment; never grant permissions to a fabricated identity.
    if (identity === actor.id) return NextResponse.json({ error: 'لا يمكنك تغيير صلاحيتك من هنا' }, { status: 400, headers });
    const target = await prisma.user.findUnique({ where: { id: identity }, select: { id: true, role: true, isBanned: true } });
    if (!target || target.role !== 'STUDENT' || target.isBanned) {
      return NextResponse.json({ error: 'هذا الإجراء متاح للطلاب المشاركين فقط' }, { status: 403, headers });
    }
    const enrollment = await prisma.enrollment.findUnique({
      where: { userId_courseId: { userId: identity, courseId: session.course.id } }, select: { id: true },
    });
    if (!enrollment) return NextResponse.json({ error: 'المشارك غير مسجل في هذا الكورس' }, { status: 403, headers });

    const key = process.env.LIVEKIT_API_KEY?.trim();
    const secret = process.env.LIVEKIT_API_SECRET?.trim();
    const wsUrl = process.env.NEXT_PUBLIC_LIVEKIT_URL?.trim();
    if (!key || !secret || !wsUrl) return NextResponse.json({ error: 'إعداد LiveKit غير مكتمل' }, { status: 503, headers });
    const url = new URL(wsUrl);
    if (url.protocol !== 'wss:' && url.protocol !== 'ws:') {
      return NextResponse.json({ error: 'عنوان LiveKit غير صالح' }, { status: 503, headers });
    }
    url.protocol = url.protocol === 'wss:' ? 'https:' : 'http:';
    const svc = new RoomServiceClient(url.origin, key, secret);
    const roomName = `live_${session.id}`;
    const attendees = await svc.listParticipants(roomName);
    if (!attendees.some(p => p.identity === identity)) {
      return NextResponse.json({ error: 'الطالب غير متصل بالبث حالياً' }, { status: 404, headers });
    }

    const sources = action === 'microphone' ? [TrackSource.MICROPHONE]
      : action === 'camera' ? [TrackSource.MICROPHONE, TrackSource.CAMERA]
      : action === 'screen' ? [TrackSource.MICROPHONE, TrackSource.CAMERA, TrackSource.SCREEN_SHARE, TrackSource.SCREEN_SHARE_AUDIO]
      : [];
    // Updating permissions server-side enforces the decision even if a student tampers with UI.
    await svc.updateParticipant(roomName, identity, undefined, {
      canPublish: action !== 'revoke', canPublishSources: sources, canSubscribe: true,
      canPublishData: true, canUpdateMetadata: false,
    });
    return NextResponse.json({ success: true, identity, action }, { headers });
  } catch (error) {
    if (error instanceof RequestUserError) return NextResponse.json({ error: error.message }, { status: error.status, headers });
    console.error('[live participant permission]', error instanceof Error ? error.message : error);
    return NextResponse.json({ error: 'تعذّر تحديث صلاحية المشارك. تحقق من اتصال LiveKit.' }, { status: 503, headers });
  }
}
