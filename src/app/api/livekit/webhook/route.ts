import { NextResponse } from 'next/server';
import { WebhookReceiver } from 'livekit-server-sdk';
import { enforceJoin } from '@/lib/live-classroom';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
const headers = { 'Cache-Control': 'no-store' };

/**
 * LiveKit webhook (configure in the LiveKit project: <app>/api/livekit/webhook).
 * The signature is verified with the project's API key/secret; unsigned or forged requests are rejected.
 * On participant_joined, anyone whose class seat is not admitted is removed immediately, whether or not
 * the host's panel is open. Safe to retry: removal is idempotent.
 */
export async function POST(req: Request) {
  const key = process.env.LIVEKIT_API_KEY?.trim();
  const secret = process.env.LIVEKIT_API_SECRET?.trim();
  if (!key || !secret) return NextResponse.json({ error: 'not configured' }, { status: 503, headers });
  const body = await req.text();
  if (body.length > 64_000) return NextResponse.json({ error: 'too large' }, { status: 413, headers });
  let event;
  try { event = await new WebhookReceiver(key, secret).receive(body, req.headers.get('authorization') ?? undefined); }
  catch { return NextResponse.json({ error: 'invalid signature' }, { status: 401, headers }); }
  try {
    if (event.event === 'participant_joined') await enforceJoin(event.room?.name, event.participant?.identity);
    return NextResponse.json({ ok: true }, { headers });
  } catch (error) {
    console.error('[livekit webhook]', error instanceof Error ? error.name : 'unknown');
    // 5xx lets LiveKit retry the delivery.
    return NextResponse.json({ error: 'temporary failure' }, { status: 503, headers });
  }
}
