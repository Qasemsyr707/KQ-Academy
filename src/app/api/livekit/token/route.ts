import { serveLiveKitToken } from '@/lib/livekit-access';

export const runtime = 'nodejs';

export async function GET(req: Request) {
  return serveLiveKitToken(req, { room: new URL(req.url).searchParams.get('room') });
}
