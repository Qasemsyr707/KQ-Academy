import { createHash, createHmac, timingSafeEqual } from 'node:crypto';
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { BunnyOperationError, createOrGetBunnyOperation } from '@/lib/bunny-upload-operations';
import { parseBunnyEmbed } from '@/lib/bunny-embed';

const RESUME_SCOPE = 'kq-academy:bunny-resume:v2:';
const RESUME_TTL = 7 * 24 * 60 * 60;
export const BUNNY_AUTH_TTL = 24 * 60 * 60;
export const BUNNY_PRIVATE_HEADERS = { 'Cache-Control': 'private, no-store' };
export interface UploadScope { operationId: string; courseId?: string; purpose: 'lesson' | 'preview' | 'short' }
export interface UploadUser { id: string; role: string }
export type BunnyVideoState = 'uploading' | 'processing' | 'ready' | 'failed';
export class BunnyServerError extends Error {
  constructor(public readonly status: number, message: string) { super(message); }
}

export function isBunnyVideoId(value: unknown): value is string {
  return typeof value === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
}

function configuration() {
  const libraryId = process.env.BUNNY_LIBRARY_ID;
  const apiKey = process.env.BUNNY_API_KEY;
  if (!libraryId || !/^\d+$/.test(libraryId) || !apiKey) throw new BunnyServerError(503, 'خدمة الفيديو غير متاحة حالياً، يرجى التواصل مع إدارة المنصة');
  return { libraryId, apiKey };
}

export function createResumeToken(userId: string, libraryId: string, videoId: string, scope: UploadScope, apiKey: string, now = Math.floor(Date.now() / 1000)) {
  const payload = Buffer.from(JSON.stringify({ userId, libraryId, videoId, ...scope, expires: now + RESUME_TTL })).toString('base64url');
  const mac = createHmac('sha256', apiKey).update(RESUME_SCOPE + payload).digest('base64url');
  return `${payload}.${mac}`;
}

export function verifyResumeToken(token: unknown, userId: string, libraryId: string, videoId: string, scope: UploadScope, apiKey: string, now = Math.floor(Date.now() / 1000)) {
  if (typeof token !== 'string' || token.length > 4096) return false;
  const parts = token.split('.');
  if (parts.length !== 2 || !/^[A-Za-z0-9_-]+$/.test(parts[0]) || !/^[A-Za-z0-9_-]{43}$/.test(parts[1])) return false;
  const expected = createHmac('sha256', apiKey).update(RESUME_SCOPE + parts[0]).digest('base64url');
  if (!timingSafeEqual(Buffer.from(parts[1]), Buffer.from(expected))) return false;
  try {
    const data = JSON.parse(Buffer.from(parts[0], 'base64url').toString('utf8'));
    return data.userId === userId && data.libraryId === libraryId && data.videoId === videoId
      && data.operationId === scope.operationId && data.courseId === scope.courseId && data.purpose === scope.purpose
      && Number.isSafeInteger(data.expires) && data.expires > now;
  } catch { return false; }
}

export function signBunnyUpload(libraryId: string, apiKey: string, videoId: string, resumeToken: string, operationId: string, now = Math.floor(Date.now() / 1000)) {
  const expireTime = now + BUNNY_AUTH_TTL;
  const signature = createHash('sha256').update(`${libraryId}${apiKey}${expireTime}${videoId}`).digest('hex');
  return { success: true, state: 'uploading' as const, videoId, libraryId, signature, expireTime, resumeToken, operationId };
}

export async function authorizeCourseUpload(user: UploadUser, scope: UploadScope) {
  if (!scope.courseId) {
    if (scope.purpose !== 'short') throw new BunnyServerError(400, 'الكورس مطلوب لرفع الدرس أو المقدمة');
    return;
  }
  const course = await prisma.course.findUnique({ where: { id: scope.courseId }, select: { instructorId: true } });
  if (!course) throw new BunnyServerError(404, 'الكورس غير موجود');
  if (course.instructorId !== user.id && !['ADMIN', 'OWNER'].includes(user.role)) throw new BunnyServerError(403, 'هذا الكورس لا يخص المدرّب');
}

export async function getBunnyVideo(videoId: string): Promise<{ videoId: string; libraryId: string; state: BunnyVideoState; embedUrl?: string }> {
  const { libraryId, apiKey } = configuration();
  if (!isBunnyVideoId(videoId)) throw new BunnyServerError(400, 'معرّف الفيديو غير صالح');
  let response: Response;
  let video;
  try {
    response = await fetch(`https://video.bunnycdn.com/library/${libraryId}/videos/${videoId}`, {
      headers: { accept: 'application/json', AccessKey: apiKey }, cache: 'no-store', signal: AbortSignal.timeout(20000),
    });
    if (response.status === 404) throw new BunnyServerError(404, 'الفيديو غير موجود، يرجى التحقق من الرابط');
    if (!response.ok) throw new BunnyServerError(502, 'تعذّر التحقق من الفيديو، يرجى المحاولة مجدداً');
    video = await response.json();
  } catch (error) {
    if (error instanceof BunnyServerError) throw error;
    throw new BunnyServerError(502, 'تعذّر الاتصال بخدمة الفيديو، يرجى المحاولة مجدداً');
  }
  if (typeof video?.guid !== 'string' || video.guid.toLowerCase() !== videoId.toLowerCase()
    || String(video.videoLibraryId) !== libraryId || !Number.isInteger(video.status)) throw new BunnyServerError(502, 'تعذّر التحقق من الفيديو، يرجى المحاولة مجدداً');
  const state: BunnyVideoState = video.status === 0 ? 'uploading' : video.status === 4 ? 'ready'
    : [1, 2, 3, 7, 8].includes(video.status) ? 'processing' : 'failed';
  return { videoId, libraryId, state,
    ...(state === 'ready' ? { embedUrl: `https://iframe.mediadelivery.net/embed/${libraryId}/${videoId}` } : {}),
  };
}

/** Guard writes of Bunny embeds, including manually pasted links. Other supported
 * external video URLs retain their existing application behavior. */
export async function assertBunnyVideoReady(videoUrl: unknown): Promise<void> {
  if (typeof videoUrl !== 'string' || !videoUrl) return;
  const embed = parseBunnyEmbed(videoUrl);
  if (!embed && !/mediadelivery\.net/i.test(videoUrl)) return;
  if (!embed || embed.libraryId !== configuration().libraryId) throw new BunnyServerError(400, 'يرجى إدخال رابط فيديو من مكتبة الأكاديمية');
  const video = await getBunnyVideo(embed.videoId);
  if (video.state === 'failed') throw new BunnyServerError(409, 'تعذّر تجهيز الفيديو، يرجى اختيار فيديو آخر');
  if (video.state !== 'ready') throw new BunnyServerError(409, 'جاري تجهيز الفيديو للمشاهدة... يرجى المحاولة بعد اكتمال التجهيز');
}

function parseScope(body: Record<string, unknown>): UploadScope {
  if (!isBunnyVideoId(body.operationId) || typeof body.purpose !== 'string' || !['lesson', 'preview', 'short'].includes(body.purpose)) throw new BunnyServerError(400, 'معرّف عملية الرفع أو نوعها غير صالح');
  if (body.courseId !== undefined && (typeof body.courseId !== 'string' || !body.courseId || body.courseId.length > 200)) throw new BunnyServerError(400, 'معرّف الكورس غير صالح');
  const scope = { operationId: body.operationId, purpose: body.purpose as UploadScope['purpose'], ...(body.courseId ? { courseId: body.courseId as string } : {}) };
  if (scope.purpose !== 'short' && !scope.courseId) throw new BunnyServerError(400, 'الكورس مطلوب');
  return scope;
}

export async function handleBunnyUploadRequest(action: 'create' | 'refresh' | 'status', req: Request) {
  try {
    const session = await getServerSession(authOptions);
    const user = session?.user as Partial<UploadUser> | undefined;
    if (typeof user?.id !== 'string' || !user.id || !user.role || !['INSTRUCTOR', 'ADMIN', 'OWNER'].includes(user.role)) throw new BunnyServerError(401, 'غير مصرح لك برفع الفيديو');
    let body: Record<string, unknown>;
    try {
      body = await req.json();
      if (!body || typeof body !== 'object' || Array.isArray(body)) throw new Error('Invalid body');
    } catch { throw new BunnyServerError(400, 'طلب غير صالح'); }
    const scope = parseScope(body);
    await authorizeCourseUpload(user as UploadUser, scope);
    const { libraryId, apiKey } = configuration();
    if (action === 'create') {
      if (typeof body.title !== 'string' || !body.title.trim() || body.title.length > 1000) throw new BunnyServerError(400, 'عنوان الفيديو مطلوب وبحد أقصى 1000 حرف');
      const title = body.title.trim();
      const operation = await createOrGetBunnyOperation({ userId: user.id, libraryId, ...scope, title }, async () => {
        const response = await fetch(`https://video.bunnycdn.com/library/${libraryId}/videos`, {
          method: 'POST', headers: { accept: 'application/json', 'content-type': 'application/json', AccessKey: apiKey },
          body: JSON.stringify({ title }), cache: 'no-store', signal: AbortSignal.timeout(20000),
        });
        if (!response.ok) throw new BunnyServerError(502, 'تعذر حسم إنشاء الفيديو؛ أعد نفس عملية الرفع دون إنشاء نسخة أخرى');
        const data = await response.json();
        if (!isBunnyVideoId(data?.guid) || (data.videoLibraryId !== undefined && String(data.videoLibraryId) !== libraryId)) throw new BunnyServerError(502, 'استجابة إنشاء الفيديو غير صالحة');
        return data.guid;
      });
      const resumeToken = createResumeToken(user.id, libraryId, operation.videoId, scope, apiKey);
      if (!operation.created) {
        const video = await getBunnyVideo(operation.videoId);
        if (video.state !== 'uploading') return NextResponse.json({ ...video, operationId: scope.operationId, resumeToken }, { headers: BUNNY_PRIVATE_HEADERS });
      }
      return NextResponse.json(signBunnyUpload(libraryId, apiKey, operation.videoId, resumeToken, scope.operationId), { headers: BUNNY_PRIVATE_HEADERS });
    }
    if (!isBunnyVideoId(body.videoId)) throw new BunnyServerError(400, 'معرّف الفيديو غير صالح');
    if (!verifyResumeToken(body.resumeToken, user.id, libraryId, body.videoId, scope, apiKey)) throw new BunnyServerError(403, 'إذن الاستكمال منتهٍ أو لا يخص المستخدم والكورس والفيديو');
    const video = await getBunnyVideo(body.videoId);
    // Signing cannot resurrect parts after the old server-side TUS resource dies.
    if (action === 'refresh' && video.state === 'uploading') return NextResponse.json(signBunnyUpload(libraryId, apiKey, body.videoId, body.resumeToken as string, scope.operationId), { headers: BUNNY_PRIVATE_HEADERS });
    return NextResponse.json({ ...video, operationId: scope.operationId, resumeToken: body.resumeToken }, { headers: BUNNY_PRIVATE_HEADERS });
  } catch (error) {
    const known = error instanceof BunnyServerError || error instanceof BunnyOperationError;
    if (!known) console.error('Bunny upload request failed');
    return NextResponse.json({ error: known ? error.message : 'تعذر إتمام طلب الرفع؛ أعد نفس العملية لاحقاً' }, { status: known ? error.status : 500, headers: BUNNY_PRIVATE_HEADERS });
  }
}
