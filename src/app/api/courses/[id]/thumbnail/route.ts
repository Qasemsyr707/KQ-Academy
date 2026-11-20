import { prisma } from '@/lib/db';
import { publicCourseWhere } from '@/lib/catalogue-visibility';
import { limitRequest, RATE_RULES } from '@/lib/rate-limit';

const TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);
const MAX_BYTES = 3 * 1024 * 1024;
const notFound = () => new Response(null, { status: 404, headers: { 'Cache-Control': 'public, max-age=60' } });

/**
 * The thumbnail of a public course whose image was stored as a data URL, served
 * as an image so search suggestions stay small. Only publicly offered courses;
 * other thumbnails (URLs) are linked directly and are not served here.
 */
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const limited = limitRequest(req, RATE_RULES.thumbnail);
  if (limited) return limited;
  const { id } = await params;
  if (!/^[A-Za-z0-9_-]{1,64}$/.test(id)) return notFound();
  const course = await prisma.course.findFirst({ where: publicCourseWhere({ id }), select: { thumbnail: true, updatedAt: true } });
  const match = course?.thumbnail?.match(/^data:(image\/[a-z]+);base64,([A-Za-z0-9+/=\s]+)$/i);
  if (!course || !match || !TYPES.has(match[1].toLowerCase())) return notFound();
  const bytes = Buffer.from(match[2], 'base64');
  if (!bytes.length || bytes.length > MAX_BYTES) return notFound();
  const etag = `"${course.updatedAt.getTime().toString(36)}-${bytes.length.toString(36)}"`;
  const headers = {
    'Content-Type': match[1].toLowerCase(), 'Cache-Control': 'public, max-age=3600, s-maxage=3600', ETag: etag,
    'X-Content-Type-Options': 'nosniff', 'Content-Security-Policy': "default-src 'none'; sandbox",
  };
  if (req.headers.get('if-none-match') === etag) return new Response(null, { status: 304, headers });
  return new Response(new Uint8Array(bytes), { status: 200, headers });
}
