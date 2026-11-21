import { NextResponse } from 'next/server';
import { RoomServiceClient } from 'livekit-server-sdk';
import { requireRequestUser, RequestUserError } from '@/lib/request-user';
import { browserLiveKitUrl } from '@/lib/livekit-access';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const headers = { 'Cache-Control': 'private, no-store', Vary: 'Cookie, Authorization' };
const fail = (code: number, message: string) => NextResponse.json({ error: message }, { status: code, headers });

/** Restricted, read-only checks. Never returns a credential, token or a signed URL. */
export async function GET(req: Request) {
  try {
    await requireRequestUser(req, ['INSTRUCTOR', 'ADMIN', 'OWNER'], 'LIVE_CLASSES');
    const key = process.env.LIVEKIT_API_KEY?.trim();
    const secret = process.env.LIVEKIT_API_SECRET?.trim();
    const raw = process.env.NEXT_PUBLIC_LIVEKIT_URL?.trim();
    const missing = [!key && 'LIVEKIT_API_KEY', !secret && 'LIVEKIT_API_SECRET', !raw && 'NEXT_PUBLIC_LIVEKIT_URL'].filter(Boolean);
    if (missing.length) return NextResponse.json({ ok: false, stage: 'CONFIG', missing, detail: 'المتغيرات ناقصة في التطبيق الجاري' }, { status: 503, headers });

    // Same normalisation the token route applies, so this checks exactly the URL browsers receive.
    const browserUrl = browserLiveKitUrl(raw!);
    if (!browserUrl) {
      return NextResponse.json({ ok: false, stage: 'URL',
        detail: 'استعمل عنوان WebSocket الأصلي بصيغة wss://hostname فقط، بدون مسار أو مفاتيح' }, { status: 503, headers });
    }
    const url = new URL(browserUrl);
    const host = url.hostname;
    const httpOrigin = `https://${url.host}`;
    const startedAt = Date.now();
    let probe: { reachable: boolean; status?: number; elapsedMs: number; detail: string };
    try {
      // A response with any HTTP status establishes DNS/TLS/HTTPS reachability from Coolify.
      const res = await fetch(`${httpOrigin}/settings/regions`, { method: 'GET', cache: 'no-store', signal: AbortSignal.timeout(6500) });
      probe = { reachable: true, status: res.status, elapsedMs: Date.now() - startedAt,
        detail: 'خادم التطبيق يستطيع الوصول إلى نطاق LiveKit عبر HTTPS' };
    } catch (error) {
      probe = { reachable: false, elapsedMs: Date.now() - startedAt,
        detail: error instanceof Error && error.name === 'TimeoutError' ? 'انتهت المهلة؛ افحص DNS والخروج على TCP 443' : 'فشل الاتصال عبر HTTPS من Coolify' };
    }

    let credentials: 'valid' | 'rejected-or-unreachable' | 'not-checked' = 'not-checked';
    if (probe.reachable) {
      try {
        const client = new RoomServiceClient(httpOrigin, key!, secret!);
        await client.listRooms([]); // read-only; validates server API access and project credentials
        credentials = 'valid';
      } catch {
        credentials = 'rejected-or-unreachable';
      }
    }
    return NextResponse.json({ ok: probe.reachable && credentials === 'valid', stage: 'SERVER_CHECK',
      hostname: host, urlFormat: 'valid', probe, credentials,
      browserIndependent: true,
      next: !probe.reachable ? 'افحص عنوان المشروع وDNS/TLS من Coolify' : credentials !== 'valid'
        ? 'افحص تطابق LIVEKIT_API_KEY وLIVEKIT_API_SECRET مع هذا المشروع'
        : 'اتصال الخادم ومفاتيحه صحيحان؛ افحص Network في متصفح المستخدم لاتصال /rtc و/settings/regions' }, { headers });
  } catch (error) {
    if (error instanceof RequestUserError) return fail(error.status, error.message);
    console.error('[livekit diagnostics]', error instanceof Error ? error.name : 'unknown');
    return fail(503, 'تعذر تنفيذ فحص الاتصال');
  }
}
