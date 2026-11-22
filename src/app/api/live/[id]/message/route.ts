import { NextResponse } from 'next/server';
import { requireRequestUser, RequestUserError } from '@/lib/request-user';
import { ClassroomError, relayMessage } from '@/lib/live-classroom';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
const headers = { 'Cache-Control': 'private, no-store', Vary: 'Cookie, Authorization' };

/** POST { kind: 'chat', text } | { kind: 'reaction', emoji } — policed and relayed by the server. */
export async function POST(req: Request, props: { params: Promise<{ id: string }> }) {
  try {
    const actor = await requireRequestUser(req);
    const body = await req.json().catch(() => null);
    await relayMessage(actor, (await props.params).id, body);
    return NextResponse.json({ success: true }, { headers });
  } catch (error) {
    if (error instanceof RequestUserError || error instanceof ClassroomError) return NextResponse.json({ error: error.message }, { status: error.status, headers });
    console.error('[live message]', error instanceof Error ? error.name : 'unknown');
    return NextResponse.json({ error: 'تعذّر إرسال الرسالة' }, { status: 503, headers });
  }
}
