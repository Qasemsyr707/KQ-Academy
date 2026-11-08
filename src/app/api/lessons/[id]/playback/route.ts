import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getLessonPlayback, LessonPlaybackError, type LessonViewer } from '@/lib/lesson-playback';
import { BunnyServerError } from '@/lib/bunny-upload-server';
import { prisma } from '@/lib/db';
import jwt from 'jsonwebtoken';

export const runtime = 'nodejs';
const headers = { 'Cache-Control': 'private, no-store', 'CDN-Cache-Control': 'no-store', Vary: 'Cookie, Authorization' };

async function currentPlaybackViewer(id: string): Promise<LessonViewer> {
  // Both cookie and mobile claims can outlive a ban or a role change.
  const current = await prisma.user.findUnique({ where: { id }, select: { id: true, role: true, isBanned: true } });
  if (!current || current.isBanned) throw new LessonPlaybackError(401, 'يرجى تسجيل الدخول لمشاهدة الدرس');
  return { id: current.id, role: current.role };
}

async function playbackViewer(req: Request): Promise<LessonViewer | null> {
  const session = await getServerSession(authOptions);
  const user = session?.user as Partial<LessonViewer> | undefined;
  if (typeof user?.id === 'string' && user.id) return currentPlaybackViewer(user.id);
  const authorization = req.headers.get('Authorization');
  if (!authorization) return null;
  const secret = process.env.NEXTAUTH_SECRET;
  if (!secret || !authorization.startsWith('Bearer ')) throw new LessonPlaybackError(401, 'يرجى تسجيل الدخول لمشاهدة الدرس');
  let payload: string | jwt.JwtPayload;
  try {
    payload = jwt.verify(authorization.slice(7), secret, { algorithms: ['HS256'] });
  } catch { throw new LessonPlaybackError(401, 'يرجى تسجيل الدخول لمشاهدة الدرس'); }
  if (typeof payload === 'string' || typeof payload.id !== 'string' || !payload.id || payload.id.length > 200) {
    throw new LessonPlaybackError(401, 'يرجى تسجيل الدخول لمشاهدة الدرس');
  }
  return currentPlaybackViewer(payload.id);
}

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const viewer = await playbackViewer(req);
    const { id } = await params;
    const url = await getLessonPlayback(id, viewer);
    return Response.json({ url }, { headers });
  } catch (error) {
    const known = error instanceof LessonPlaybackError || error instanceof BunnyServerError;
    return Response.json({ error: known ? error.message : 'تعذّر تشغيل الفيديو، يرجى المحاولة مجدداً' }, {
      status: known ? error.status : 503, headers,
    });
  }
}
