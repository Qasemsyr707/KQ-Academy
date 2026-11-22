import { hasPermission } from '@/lib/permission-check';
import { AccessToken, TrackSource, type VideoGrant } from 'livekit-server-sdk';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { isPublicLesson } from '@/lib/lesson-playback';
import { isExpired } from '@/lib/live-session-rules';
import { requireRequestUser, RequestUserError, type RequestUser } from '@/lib/request-user';
import { admitForToken, ClassroomError, settingsOf, type ClassroomSettings } from '@/lib/live-classroom';

const privateHeaders = { 'Cache-Control': 'private, no-store', Vary: 'Cookie, Authorization' };
const courseSelect = { id: true, instructorId: true, status: true, price: true, priceSYP: true } as const;
type Course = { id: string; instructorId: string; status: string; price: number; priceSYP: number };
type RoomReference = { room: string | null } | { liveClassId: string | null };
type RoomAccess = { room: string; canPublish: boolean; audioOnly?: boolean; status?: string; canPublishData?: boolean; settings?: ClassroomSettings; seatRole?: string };

class LiveKitAccessError extends Error {
  constructor(public readonly status: number, message: string) { super(message); }
}

function validRoomReference(value: unknown): value is string {
  return typeof value === 'string' && /^[A-Za-z0-9_-]{1,200}$/.test(value);
}

async function canHost(user: RequestUser, course: Course, instructorId = course.instructorId) {
  return (['ADMIN', 'OWNER'].includes(user.role ?? '') && await hasPermission(user.id, 'LIVE_CLASSES'))
    || (user.role === 'INSTRUCTOR' && (course.instructorId === user.id || instructorId === user.id));
}

async function requireCourseViewer(user: RequestUser, course: Course, isPublic = false) {
  if (isPublic) return;
  const enrollment = await prisma.enrollment.findUnique({
    where: { userId_courseId: { userId: user.id, courseId: course.id } }, select: { id: true },
  });
  if (!enrollment) throw new LiveKitAccessError(403, 'هذه الجلسة متاحة للمشتركين في الكورس فقط');
}

async function liveClassAccess(user: RequestUser, id: string): Promise<RoomAccess> {
  if (!validRoomReference(id)) throw new LiveKitAccessError(400, 'يرجى تحديد جلسة صالحة');
  const liveClass = await prisma.liveClass.findUnique({
    where: { id }, select: { id: true, instructorId: true, status: true, scheduledAt: true, locked: true, waitingRoom: true, chatEnabled: true,
      reactionsEnabled: true, screenShareAllowed: true, course: { select: courseSelect } },
  });
  if (!liveClass) throw new LiveKitAccessError(404, 'الجلسة غير موجودة');
  if (liveClass.status === 'ended') throw new LiveKitAccessError(410, 'انتهت هذه الجلسة');
  if (liveClass.status === 'cancelled') throw new LiveKitAccessError(410, 'أُلغيت هذه الجلسة');
  if (!['upcoming', 'live'].includes(liveClass.status)) throw new LiveKitAccessError(409, 'هذه الجلسة غير متاحة حالياً');
  if (isExpired(liveClass)) throw new LiveKitAccessError(410, 'انتهت مهلة هذه الجلسة المجدولة دون أن تبدأ');
  const host = await canHost(user, liveClass.course, liveClass.instructorId);
  if (!host) {
    await requireCourseViewer(user, liveClass.course);
    // Students join only once the host's studio is really connected.
    if (liveClass.status !== 'live') throw new LiveKitAccessError(425, 'لم يبدأ المدرّب البث بعد');
  }
  const settings = settingsOf(liveClass);
  if (host) return { room: `live_${liveClass.id}`, canPublish: true, status: liveClass.status, settings, canPublishData: true, seatRole: 'host' };
  // Waiting room, lock and removals are decided here, before any token is signed.
  let seatRole: string;
  try { seatRole = await admitForToken(user.id, liveClass); }
  catch (error) { if (error instanceof ClassroomError) throw new LiveKitAccessError(error.status, error.message); throw error; }
  // The data channel stays open for polls; chat and reactions are relayed and policed by the server.
  return { room: `live_${liveClass.id}`, canPublish: false, status: liveClass.status, settings, seatRole, canPublishData: true };
}

async function resolveRoomAccess(user: RequestUser, reference: RoomReference): Promise<RoomAccess> {
  if ('liveClassId' in reference) {
    if (!validRoomReference(reference.liveClassId)) throw new LiveKitAccessError(400, 'يرجى تحديد جلسة صالحة');
    return liveClassAccess(user, reference.liveClassId);
  }
  const room = reference.room;
  if (!validRoomReference(room)) throw new LiveKitAccessError(400, 'يرجى تحديد غرفة صالحة');
  // Never fall through from a denied live session to another room type.
  if (room.startsWith('live_')) return liveClassAccess(user, room.slice(5));
  const lessons = await prisma.lesson.findMany({
    where: { liveRoomName: room }, take: 2,
    select: { isLive: true, liveRoomName: true, chapter: { select: { isFree: true, course: { select: courseSelect } } } },
  });
  if (lessons.length > 1) throw new LiveKitAccessError(409, 'تعذّر تحديد جلسة واحدة لهذه الغرفة');
  const lesson = lessons[0];
  if (lesson) {
    if (!lesson.isLive || !lesson.liveRoomName) throw new LiveKitAccessError(404, 'الجلسة غير موجودة');
    const course = lesson.chapter.course;
    const host = await canHost(user, course);
    if (!host) await requireCourseViewer(user, course, isPublicLesson(course, lesson.chapter.isFree));
    return { room: lesson.liveRoomName, canPublish: host };
  }
  // Study rooms are collaborative audio rooms for authenticated Academy users.
  // Their real database ID is required; arbitrary LiveKit room names grant nothing.
  const studyRoom = await prisma.studyRoom.findUnique({ where: { id: room }, select: { id: true } });
  if (!studyRoom) throw new LiveKitAccessError(404, 'الغرفة غير موجودة');
  return { room: studyRoom.id, canPublish: true, audioOnly: true };
}

/** All token routes share authorization, so a second endpoint cannot bypass it. */
/**
 * The browser opens a WebSocket to this URL and, on failure, fetches <host>/rtc/validate.
 * An https page cannot reach ws:// (mixed content) and a path/trailing slash breaks /rtc, both surfacing
 * only as "could not establish signal connection: Failed to fetch". Normalise to a bare wss origin.
 */
export function browserLiveKitUrl(raw: string): string | null {
  let url: URL;
  try { url = new URL(raw); } catch { console.error('[livekit] NEXT_PUBLIC_LIVEKIT_URL is not a URL'); return null; }
  if (url.protocol === 'https:') url.protocol = 'wss:';
  const plainAllowed = process.env.NODE_ENV !== 'production' && url.protocol === 'ws:';
  if (url.protocol !== 'wss:' && !plainAllowed) { console.error(`[livekit] NEXT_PUBLIC_LIVEKIT_URL must use wss:// (got ${url.protocol})`); return null; }
  if (url.username || url.password || url.search || url.hash) { console.error('[livekit] NEXT_PUBLIC_LIVEKIT_URL must be a bare origin'); return null; }
  return `${url.protocol}//${url.host}`;
}

export async function serveLiveKitToken(req: Request, reference: RoomReference) {
  try {
    const user = await requireRequestUser(req);
    const access = await resolveRoomAccess(user, reference);
    const apiKey = process.env.LIVEKIT_API_KEY;
    const apiSecret = process.env.LIVEKIT_API_SECRET;
    if (!apiKey?.trim() || !apiSecret?.trim() || !process.env.NEXT_PUBLIC_LIVEKIT_URL?.trim()) {
      // Which setting is missing is logged for the operator, never sent to the browser.
      console.error('[livekit] not configured: LIVEKIT_API_KEY, LIVEKIT_API_SECRET and NEXT_PUBLIC_LIVEKIT_URL are all required');
      throw new LiveKitAccessError(503, 'خدمة البث غير مهيأة على الخادم حالياً؛ تواصل مع إدارة المنصة');
    }
    const serverUrl = browserLiveKitUrl(process.env.NEXT_PUBLIC_LIVEKIT_URL!.trim());
    if (!serverUrl) throw new LiveKitAccessError(503, 'عنوان خادم البث غير صالح على الخادم؛ تواصل مع إدارة المنصة');
    const token = new AccessToken(apiKey, apiSecret, { identity: user.id, name: user.name || 'مستخدم', ttl: '5m', metadata: access.canPublish && !access.audioOnly ? 'kq-role:host' : 'kq-role:student' });
    // Viewers (canPublish false) may send chat messages (data) but never audio or video.
    const grant: VideoGrant = {
      roomJoin: true, room: access.room, canPublish: access.canPublish, canSubscribe: true, canPublishData: access.canPublishData ?? true, canUpdateOwnMetadata: false,
    };
    if (access.audioOnly) grant.canPublishSources = [TrackSource.MICROPHONE];
    token.addGrant(grant);
    return NextResponse.json({ token: await token.toJwt(), roomName: access.room, canPublish: access.canPublish, status: access.status ?? null, serverUrl,
      settings: access.settings ?? null, seatRole: access.seatRole ?? null }, { headers: privateHeaders });
  } catch (error) {
    const known = error instanceof RequestUserError || error instanceof LiveKitAccessError;
    if (!known) console.error('Live session authorization failed');
    return NextResponse.json({ error: known ? error.message : 'تعذّر الانضمام للجلسة، يرجى المحاولة مجدداً' }, {
      status: known ? error.status : 503, headers: privateHeaders,
    });
  }
}
