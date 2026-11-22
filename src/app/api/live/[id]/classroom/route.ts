import { NextResponse } from 'next/server';
import { requireRequestUser, RequestUserError } from '@/lib/request-user';
import { ClassroomError, classroomState, moderate } from '@/lib/live-classroom';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
const headers = { 'Cache-Control': 'private, no-store', Vary: 'Cookie, Authorization' };

function failure(error: unknown) {
  if (error instanceof RequestUserError || error instanceof ClassroomError) return NextResponse.json({ error: error.message }, { status: error.status, headers });
  console.error('[live classroom]', error instanceof Error ? error.name : 'unknown');
  return NextResponse.json({ error: 'تعذّر تنفيذ الإجراء، حاول مجدداً' }, { status: 503, headers });
}

/** Host / assistant panel: participants, waiting room, raised hands, settings and audit log. */
export async function GET(req: Request, props: { params: Promise<{ id: string }> }) {
  try {
    const actor = await requireRequestUser(req);
    const { id } = await props.params;
    return NextResponse.json(await classroomState(actor, id), { headers });
  } catch (error) { return failure(error); }
}

/** POST { action, userId?, media?, reason?, ...settings } — every rule is enforced in lib/live-classroom. */
export async function POST(req: Request, props: { params: Promise<{ id: string }> }) {
  try {
    const actor = await requireRequestUser(req);
    const { id } = await props.params;
    const body = await req.json().catch(() => null);
    const message = await moderate(actor, id, body);
    return NextResponse.json({ success: true, message }, { headers });
  } catch (error) { return failure(error); }
}
