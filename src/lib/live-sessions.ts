import { prisma } from '@/lib/db';
import { hasPermission } from '@/lib/permission-check';
import { displayStatus, isExpired, SESSION_EXPIRY_MS } from '@/lib/live-session-rules';

/**
 * One LiveClass record per live session. A session scheduled inside a chapter also gets the
 * course Lesson that shows it in the course player; that lesson's room is `live_<LiveClass.id>`,
 * so the player, the /live page and the studio all read the same status and share one room.
 *
 * Status follows what really happened:
 *   upcoming --(host's studio connected to LiveKit)--> live --(host ends)--> ended
 *   upcoming --(host cancels)--> cancelled
 * An upcoming session that was never started is expired SESSION_EXPIRY_MS after its start time.
 */
export const MAX_SCHEDULE_AHEAD_MS = 366 * 24 * 60 * 60 * 1000;
export { displayStatus, isExpired, SESSION_EXPIRY_MS };

export class LiveSessionError extends Error {
  constructor(public readonly status: number, message: string) { super(message); }
}

type Actor = { id: string; role?: string | null };

export async function canManageLiveCourse(actor: Actor, course: { instructorId: string }) {
  if (actor.role === 'OWNER') return true;
  if (actor.role === 'ADMIN') return hasPermission(actor.id, 'LIVE_CLASSES');
  return actor.role === 'INSTRUCTOR' && course.instructorId === actor.id;
}

function text(value: unknown, max: number) {
  return typeof value === 'string' && value.trim() ? value.trim().slice(0, max) : null;
}

/**
 * Create a session now (`immediate`) or for a future time, optionally inside a chapter.
 * Ownership, the chapter's course and the host's open-session quota are checked on the server.
 */
export async function createLiveSession(actor: Actor, input: Record<string, unknown>, now = new Date()) {
  const title = text(input.title, 200);
  if (!title) throw new LiveSessionError(400, 'عنوان البث مطلوب (200 حرف كحد أقصى)');
  if (typeof input.courseId !== 'string' || !input.courseId || input.courseId.length > 200) throw new LiveSessionError(400, 'اختر الكورس');
  const immediate = input.isImmediate === true;
  const when = immediate ? now : new Date(typeof input.scheduledAt === 'string' ? input.scheduledAt : NaN);
  if (Number.isNaN(when.getTime())) throw new LiveSessionError(400, 'موعد البث غير صالح');
  if (!immediate) {
    if (when.getTime() < now.getTime() - 5 * 60 * 1000) throw new LiveSessionError(400, 'موعد البث يجب أن يكون في المستقبل');
    if (when.getTime() > now.getTime() + MAX_SCHEDULE_AHEAD_MS) throw new LiveSessionError(400, 'لا يمكن جدولة بث بعد أكثر من سنة');
  }

  const course = await prisma.course.findUnique({ where: { id: input.courseId }, select: { id: true, instructorId: true } });
  if (!course || !await canManageLiveCourse(actor, course)) throw new LiveSessionError(403, 'الكورس غير موجود أو لا تملك صلاحية إدارته');

  const chapterId = typeof input.chapterId === 'string' && input.chapterId ? input.chapterId : null;
  if (chapterId) {
    const chapter = await prisma.chapter.findUnique({ where: { id: chapterId }, select: { courseId: true } });
    if (!chapter || chapter.courseId !== course.id) throw new LiveSessionError(403, 'الفصل لا ينتمي إلى هذا الكورس');
  }

  return prisma.$transaction(async tx => {
    // Serialize session creation per host so two parallel requests cannot both pass the quota.
    const hosts = await tx.$queryRaw<{ maxLiveStreams: number }[]>`SELECT "maxLiveStreams" FROM "User" WHERE "id" = ${actor.id} FOR UPDATE`;
    const quota = hosts[0]?.maxLiveStreams;
    if (quota === undefined) throw new LiveSessionError(401, 'الحساب غير موجود');
    const open = await tx.liveClass.count({
      where: { instructorId: actor.id, status: { in: ['upcoming', 'live'] }, scheduledAt: { gte: new Date(now.getTime() - SESSION_EXPIRY_MS) } },
    });
    if (open >= quota) {
      throw new LiveSessionError(409, `وصلت إلى الحد الأقصى للجلسات المفتوحة (${quota}). أنهِ أو ألغِ جلسة قبل إنشاء أخرى.`);
    }
    const liveClass = await tx.liveClass.create({ data: {
      title, description: text(input.description, 5000), courseId: course.id, instructorId: actor.id,
      isImmediate: immediate, scheduledAt: when, status: 'upcoming',
    } });
    if (!chapterId) return liveClass;
    const last = await tx.lesson.findFirst({ where: { chapterId }, orderBy: { order: 'desc' }, select: { order: true } });
    const lesson = await tx.lesson.create({ data: {
      title, chapterId, order: (last?.order ?? 0) + 1, isLive: true, liveRoomName: `live_${liveClass.id}`, liveStartTime: when,
    } });
    return tx.liveClass.update({ where: { id: liveClass.id }, data: { lessonId: lesson.id } });
  });
}

const TRANSITIONS: Record<string, { from: string[]; to: string }> = {
  start: { from: ['upcoming'], to: 'live' },
  end: { from: ['live', 'upcoming'], to: 'ended' },
  cancel: { from: ['upcoming'], to: 'cancelled' },
};

/**
 * Change a session's status. The update is conditional on the current status, so concurrent
 * requests (two tabs, a double click, start racing cancel) can never apply two transitions.
 */
export async function transitionLiveSession(actor: Actor, id: string, action: unknown, now = new Date()) {
  const transition = TRANSITIONS[typeof action === 'string' ? action : ''];
  if (!transition) throw new LiveSessionError(400, 'الإجراء غير صالح');
  if (!/^[A-Za-z0-9_-]{1,200}$/.test(id)) throw new LiveSessionError(400, 'الجلسة غير صالحة');
  const session = await prisma.liveClass.findUnique({ where: { id }, select: { id: true, instructorId: true, status: true, scheduledAt: true, course: { select: { instructorId: true } } } });
  if (!session) throw new LiveSessionError(404, 'الجلسة غير موجودة');
  const owner = session.instructorId === actor.id;
  if (!owner && !await canManageLiveCourse(actor, session.course)) throw new LiveSessionError(403, 'لا تملك صلاحية إدارة هذه الجلسة');
  if (session.status === transition.to) return { status: session.status, changed: false };
  if (transition.to === 'live' && isExpired(session, now.getTime())) throw new LiveSessionError(410, 'انتهت مهلة هذه الجلسة المجدولة؛ أنشئ جلسة جديدة');
  const data = transition.to === 'live' ? { status: 'live', startedAt: now }
    : transition.to === 'ended' ? { status: 'ended', endedAt: now } : { status: transition.to };
  const changed = await prisma.liveClass.updateMany({ where: { id, status: { in: transition.from } }, data });
  if (changed.count !== 1) throw new LiveSessionError(409, 'تغيّرت حالة الجلسة؛ حدّث الصفحة');
  return { status: transition.to, changed: true };
}

const SESSION_LIST_SELECT = {
  id: true, title: true, description: true, status: true, scheduledAt: true, startedAt: true, endedAt: true, isImmediate: true,
  courseId: true, lessonId: true, instructorId: true,
  course: { select: { title: true } }, lesson: { select: { chapter: { select: { title: true } } } },
} as const;

/** Sessions a manager sees in "بثوثي المباشرة": their own; OWNER/permitted ADMIN see all. */
export async function listManagedSessions(actor: Actor, staff: boolean) {
  const rows = await prisma.liveClass.findMany({
    where: staff ? {} : { instructorId: actor.id },
    orderBy: { scheduledAt: 'desc' }, take: 200, select: SESSION_LIST_SELECT,
  });
  const now = Date.now();
  return rows.map(row => ({
    id: row.id, title: row.title, description: row.description, status: displayStatus(row, now),
    scheduledAt: row.scheduledAt.toISOString(), startedAt: row.startedAt?.toISOString() ?? null, endedAt: row.endedAt?.toISOString() ?? null,
    courseId: row.courseId, courseTitle: row.course.title, chapterTitle: row.lesson?.chapter.title ?? null,
    isOwn: row.instructorId === actor.id,
  }));
}

/**
 * Live lessons scheduled before LiveClass records existed (room "room-..."). They are left
 * untouched and still open in their original lesson studio.
 */
export async function listLegacyLiveLessons(courseWhere: object) {
  const lessons = await prisma.lesson.findMany({
    where: { isLive: true, liveRoomName: { not: null }, liveClass: { is: null }, NOT: { liveRoomName: { startsWith: 'live_' } }, chapter: { course: courseWhere } },
    orderBy: { liveStartTime: 'desc' }, take: 100,
    select: { id: true, title: true, liveStartTime: true, chapter: { select: { title: true, course: { select: { id: true, title: true } } } } },
  });
  return lessons.map(l => ({
    id: l.id, title: l.title, liveStartTime: l.liveStartTime?.toISOString() ?? null,
    chapterTitle: l.chapter.title, courseId: l.chapter.course.id, courseTitle: l.chapter.course.title,
  }));
}

/** Booleans only: the values themselves never leave the server. */
export function liveKitConfiguration() {
  const url = process.env.NEXT_PUBLIC_LIVEKIT_URL?.trim() ?? '';
  const missing = [
    !process.env.LIVEKIT_API_KEY?.trim() && 'LIVEKIT_API_KEY',
    !process.env.LIVEKIT_API_SECRET?.trim() && 'LIVEKIT_API_SECRET',
    !url && 'NEXT_PUBLIC_LIVEKIT_URL',
  ].filter(Boolean) as string[];
  const invalidUrl = !!url && !/^wss?:\/\/[^\s/]+/i.test(url);
  return { ready: missing.length === 0 && !invalidUrl, missing, invalidUrl };
}
