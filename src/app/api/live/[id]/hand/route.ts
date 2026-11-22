import { NextResponse } from 'next/server';
import { requireRequestUser, RequestUserError } from '@/lib/request-user';
import { ClassroomError, ownSeat, setOwnHand } from '@/lib/live-classroom';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
const headers = { 'Cache-Control': 'private, no-store', Vary: 'Cookie, Authorization' };

function failure(error: unknown) {
  if (error instanceof RequestUserError || error instanceof ClassroomError) return NextResponse.json({ error: error.message }, { status: error.status, headers });
  console.error('[live hand]', error instanceof Error ? error.name : 'unknown');
  return NextResponse.json({ error: 'تعذّر تنفيذ الطلب' }, { status: 503, headers });
}

/** The signed-in student's own seat: admission status, assistant role and hand. */
export async function GET(req: Request, props: { params: Promise<{ id: string }> }) {
  try {
    const actor = await requireRequestUser(req);
    return NextResponse.json(await ownSeat(actor, (await props.params).id), { headers });
  } catch (error) { return failure(error); }
}

/** POST { raised: boolean } — only for the caller's own admitted seat in a live session. */
export async function POST(req: Request, props: { params: Promise<{ id: string }> }) {
  try {
    const actor = await requireRequestUser(req);
    const body = await req.json().catch(() => null);
    const raised = await setOwnHand(actor, (await props.params).id, body && typeof body === 'object' ? (body as Record<string, unknown>).raised : undefined);
    return NextResponse.json({ success: true, raised }, { headers });
  } catch (error) { return failure(error); }
}
