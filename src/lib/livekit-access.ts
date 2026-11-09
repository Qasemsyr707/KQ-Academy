import { AccessToken, TrackSource, type VideoGrant } from 'livekit-server-sdk';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { isPublicLesson } from '@/lib/lesson-playback';
import { requireRequestUser, RequestUserError, type RequestUser } from '@/lib/request-user';

const privateHeaders = { 'Cache-Control': 'private, no-store', Vary: 'Cookie, Authorization' };
const courseSelect = { id: true, instructorId: true, status: true, price: true, priceSYP: true } as const;
type Course = { id: string; instructorId: string; status: string; price: number; priceSYP: number };
type RoomReference = { room: string | null } | { liveClassId: string | null };
type RoomAccess = { room: string; canPublish: boolean; audioOnly?: boolean };

class LiveKitAccessError extends Error {
  constructor(public readonly status: number, message: string) { super(message); }
}

function validRoomReference(value: unknown): value is string {
  return typeof value === 'string' && /^[A-Za-z0-9_-]{1,200}$/.test(value);
}

function canHost(user: RequestUser, course: Course, instructorId = course.instructorId) {
  return ['ADMIN', 'OWNER'].includes(user.role)
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
    where: { id }, select: { id: true, instructorId: true, status: true, course: { select: courseSelect } },
  });
  if (!liveClass) throw new LiveKitAccessError(404, 'الجلسة غير موجودة');
  if (!['upcoming', 'live'].includes(liveClass.status)) throw new LiveKitAccessError(409, 'هذه الجلسة غير متاحة حالياً');
  const host = canHost(user, liveClass.course, liveClass.instructorId);
  if (!host) await requireCourseViewer(user, liveClass.course);
  return { room: `live_${liveClass.id}`, canPublish: host };
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
    const host = canHost(user, course);
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
export async function serveLiveKitToken(req: Request, reference: RoomReference) {
  try {
    const user = await requireRequestUser(req);
    const access = await resolveRoomAccess(user, reference);
    const apiKey = process.env.LIVEKIT_API_KEY;
    const apiSecret = process.env.LIVEKIT_API_SECRET;
    if (!apiKey?.trim() || !apiSecret?.trim()) throw new LiveKitAccessError(503, 'خدمة البث غير متاحة حالياً');
    const token = new AccessToken(apiKey, apiSecret, { identity: user.id, name: user.name || 'مستخدم', ttl: '15m' });
    const grant: VideoGrant = {
      roomJoin: true, room: access.room, canPublish: access.canPublish, canSubscribe: true, canPublishData: true,
    };
    if (access.audioOnly) grant.canPublishSources = [TrackSource.MICROPHONE];
    token.addGrant(grant);
    return NextResponse.json({ token: await token.toJwt(), roomName: access.room }, { headers: privateHeaders });
  } catch (error) {
    const known = error instanceof RequestUserError || error instanceof LiveKitAccessError;
    if (!known) console.error('Live session authorization failed');
    return NextResponse.json({ error: known ? error.message : 'تعذّر الانضمام للجلسة، يرجى المحاولة مجدداً' }, {
      status: known ? error.status : 503, headers: privateHeaders,
    });
  }
}
