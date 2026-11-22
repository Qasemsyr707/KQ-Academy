import { NextResponse } from 'next/server';
import { requireRequestUser, RequestUserError } from '@/lib/request-user';
import { LiveSessionError, transitionLiveSession } from '@/lib/live-sessions';
import { closeLiveRoom, syncRoomSettings } from '@/lib/live-classroom';

const headers = { 'Cache-Control': 'private, no-store', Vary: 'Cookie, Authorization' };

/**
 * PATCH { action: 'start' | 'end' | 'cancel' }.
 * start  : upcoming -> live   (sent by the host's studio only after it connected to LiveKit)
 * end    : live|upcoming -> ended
 * cancel : upcoming -> cancelled
 * Only the session's host, OWNER, or an ADMIN with LIVE_CLASSES may change it.
 */
export async function PATCH(req: Request, props: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireRequestUser(req, ['INSTRUCTOR', 'ADMIN', 'OWNER']);
    const { id } = await props.params;
    const body = await req.json().catch(() => null);
    const result = await transitionLiveSession(user, id, body?.action);
    // Ending must also close the LiveKit room; the database status alone would leave people connected.
    const roomClosed = result.status === 'ended' ? await closeLiveRoom(user.id, id) : undefined;
    if (result.status === 'live') await syncRoomSettings(id).catch(() => undefined);
    return NextResponse.json({ success: true, status: result.status, roomClosed }, { headers });
  } catch (error) {
    if (error instanceof RequestUserError || error instanceof LiveSessionError) return NextResponse.json({ error: error.message }, { status: error.status, headers });
    console.error('[live status]', error instanceof Error ? error.message : error);
    return NextResponse.json({ error: 'تعذّر تحديث حالة الجلسة' }, { status: 500, headers });
  }
}
