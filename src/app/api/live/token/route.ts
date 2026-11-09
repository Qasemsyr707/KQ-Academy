import { serveLiveKitToken } from '@/lib/livekit-access';

export const runtime = 'nodejs';

export async function GET(req: Request) {
  return serveLiveKitToken(req, { liveClassId: new URL(req.url).searchParams.get('id') });
}
