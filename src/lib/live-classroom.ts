import { RoomServiceClient, TrackSource } from 'livekit-server-sdk';
import { prisma } from '@/lib/db';
import { hasPermission } from '@/lib/permission-check';
import { consume } from '@/lib/rate-limit';

/**
 * KQ Classroom Pro — participant management for a live session.
 * Every decision here is enforced on the server (database + LiveKit RoomService);
 * the classroom UI only reflects it.
 */

export class ClassroomError extends Error {
  constructor(public readonly status: number, message: string) { super(message); }
}

type Actor = { id: string; role?: string | null };
const ID = /^[A-Za-z0-9_-]{1,200}$/;
const MODERATION_RULE = { name: 'live-moderation', burst: 40, perMinute: 120 } as const;
const HAND_RULE = { name: 'live-hand', burst: 6, perMinute: 20 } as const;

export const SETTINGS = ['locked', 'waitingRoom', 'chatEnabled', 'reactionsEnabled', 'screenShareAllowed'] as const;
export type Setting = (typeof SETTINGS)[number];
export type ClassroomSettings = Record<Setting, boolean>;

/** Actions a limited assistant may take; everything else is for the host only. */
const ASSISTANT_ACTIONS = new Set(['admit', 'deny', 'lowerHand', 'mute', 'grant', 'revoke']);
const ACTIONS = new Set(['admit', 'deny', 'lowerHand', 'mute', 'muteAll', 'grant', 'revoke', 'remove', 'setAssistant', 'unsetAssistant', 'settings']);
const GRANTS = { microphone: [TrackSource.MICROPHONE], camera: [TrackSource.MICROPHONE, TrackSource.CAMERA],
  screen: [TrackSource.MICROPHONE, TrackSource.CAMERA, TrackSource.SCREEN_SHARE, TrackSource.SCREEN_SHARE_AUDIO] } as const;

const SESSION_SELECT = {
  id: true, status: true, instructorId: true, locked: true, waitingRoom: true, chatEnabled: true,
  reactionsEnabled: true, screenShareAllowed: true, course: { select: { id: true, instructorId: true } },
} as const;

export const roomName = (id: string) => `live_${id}`;

export function settingsOf(row: Partial<ClassroomSettings>): ClassroomSettings {
  return { locked: row.locked === true, waitingRoom: row.waitingRoom === true, chatEnabled: row.chatEnabled !== false,
    reactionsEnabled: row.reactionsEnabled !== false, screenShareAllowed: row.screenShareAllowed !== false };
}

/** null when LiveKit is not configured; callers decide whether that is fatal. */
export function roomService(): RoomServiceClient | null {
  const key = process.env.LIVEKIT_API_KEY?.trim();
  const secret = process.env.LIVEKIT_API_SECRET?.trim();
  const raw = process.env.NEXT_PUBLIC_LIVEKIT_URL?.trim();
  if (!key || !secret || !raw) return null;
  try {
    const url = new URL(raw);
    url.protocol = url.protocol === 'ws:' ? 'http:' : 'https:';
    return new RoomServiceClient(url.origin, key, secret);
  } catch { return null; }
}

async function isHost(actor: Actor, session: { instructorId: string; course: { instructorId: string } }) {
  if (actor.role === 'OWNER') return true;
  if (actor.role === 'ADMIN') return hasPermission(actor.id, 'LIVE_CLASSES');
  return actor.role === 'INSTRUCTOR' && (session.instructorId === actor.id || session.course.instructorId === actor.id);
}

/** Resolves the session and the actor's power over it: host, assistant, or nothing. */
export async function classroomAccess(actor: Actor, id: string) {
  if (!ID.test(id)) throw new ClassroomError(400, 'الجلسة غير صالحة');
  const session = await prisma.liveClass.findUnique({ where: { id }, select: SESSION_SELECT });
  if (!session) throw new ClassroomError(404, 'الجلسة غير موجودة');
  if (await isHost(actor, session)) return { session, power: 'host' as const };
  const seat = await prisma.liveClassParticipant.findUnique({
    where: { liveClassId_userId: { liveClassId: id, userId: actor.id } }, select: { role: true, status: true },
  });
  if (seat?.role === 'assistant' && seat.status === 'admitted') return { session, power: 'assistant' as const };
  return { session, power: null };
}

async function audit(liveClassId: string, actorId: string, action: string, targetUserId?: string | null, detail?: object) {
  await prisma.liveClassAuditLog.create({ data: { liveClassId, actorId, action, targetUserId: targetUserId ?? null, detail: detail ?? undefined } });
}

/** Room metadata can only be written by the server, so every client may trust it. */
export async function publishRoomSettings(id: string, settings: ClassroomSettings, svc = roomService()) {
  if (!svc) return;
  try { await svc.updateRoomMetadata(roomName(id), JSON.stringify({ kq: 1, ...settings })); }
  catch { /* the room may not exist yet; the token route sends settings on join */ }
}

async function connectedIdentities(svc: RoomServiceClient, id: string) {
  try { return await svc.listParticipants(roomName(id)); } catch { return []; }
}

/** Pushes the stored settings into the LiveKit room (called once the host's studio is live). */
export async function syncRoomSettings(id: string) {
  const row = await prisma.liveClass.findUnique({ where: { id }, select: { locked: true, waitingRoom: true, chatEnabled: true, reactionsEnabled: true, screenShareAllowed: true } });
  if (row) await publishRoomSettings(id, settingsOf(row));
}

/** Snapshot for the host / assistant panel. */
export async function classroomState(actor: Actor, id: string) {
  const { session, power } = await classroomAccess(actor, id);
  if (!power) throw new ClassroomError(403, 'لا تملك صلاحية إدارة هذه الحصة');
  const [seats, log] = await Promise.all([
    prisma.liveClassParticipant.findMany({
      where: { liveClassId: id }, orderBy: { createdAt: 'asc' }, take: 500,
      select: { userId: true, status: true, role: true, handRaisedAt: true, removedReason: true, firstJoinedAt: true, user: { select: { name: true } } },
    }),
    power === 'host' ? prisma.liveClassAuditLog.findMany({ where: { liveClassId: id }, orderBy: { createdAt: 'desc' }, take: 50,
      select: { id: true, action: true, actorId: true, targetUserId: true, detail: true, createdAt: true } }) : Promise.resolve([]),
  ]);
  const svc = roomService();
  const online = new Set((svc ? await connectedIdentities(svc, id) : []).map(p => p.identity));
  return {
    power, status: session.status, settings: settingsOf(session), liveKitReady: !!svc,
    participants: seats.map(s => ({
      userId: s.userId, name: s.user.name || 'طالب', status: s.status, role: s.role, online: online.has(s.userId),
      handRaisedAt: s.handRaisedAt?.toISOString() ?? null, removedReason: s.removedReason, firstJoinedAt: s.firstJoinedAt?.toISOString() ?? null,
    })),
    audit: log.map(l => ({ ...l, createdAt: l.createdAt.toISOString() })),
  };
}

type Body = Record<string, unknown>;

function parse(body: unknown) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) throw new ClassroomError(400, 'بيانات الطلب غير صالحة');
  const b = body as Body;
  if (typeof b.action !== 'string' || !ACTIONS.has(b.action)) throw new ClassroomError(400, 'الإجراء غير معروف');
  return b as Body & { action: string };
}

async function requireStudentSeat(id: string, courseId: string, userId: unknown) {
  if (typeof userId !== 'string' || !ID.test(userId)) throw new ClassroomError(400, 'المشارك غير صالح');
  const [user, enrollment, seat] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId }, select: { id: true, role: true, isBanned: true } }),
    prisma.enrollment.findUnique({ where: { userId_courseId: { userId, courseId } }, select: { id: true } }),
    prisma.liveClassParticipant.findUnique({ where: { liveClassId_userId: { liveClassId: id, userId } }, select: { status: true, role: true } }),
  ]);
  if (!user || user.role !== 'STUDENT' || user.isBanned || !enrollment) throw new ClassroomError(403, 'هذا الإجراء متاح لطلاب الكورس فقط');
  return { userId, seat };
}

function needService() {
  const svc = roomService();
  if (!svc) throw new ClassroomError(503, 'خدمة البث غير مهيأة على الخادم');
  return svc;
}

async function setPublish(svc: RoomServiceClient, id: string, identity: string, sources: readonly TrackSource[], canPublishData: boolean) {
  await svc.updateParticipant(roomName(id), identity, undefined, {
    canPublish: sources.length > 0, canPublishSources: [...sources], canSubscribe: true, canPublishData, canUpdateMetadata: false,
  });
}

async function muteAllTracks(svc: RoomServiceClient, id: string, identity: string, participants?: Awaited<ReturnType<RoomServiceClient['listParticipants']>>) {
  const list = participants ?? await connectedIdentities(svc, id);
  const p = list.find(x => x.identity === identity);
  for (const track of p?.tracks ?? []) {
    if (!track.muted) await svc.mutePublishedTrack(roomName(id), identity, track.sid, true).catch(() => undefined);
  }
}

/** Executes one moderation action. Returns a short Arabic confirmation. */
export async function moderate(actor: Actor, id: string, raw: unknown): Promise<string> {
  const body = parse(raw);
  if (!consume(MODERATION_RULE, actor.id).allowed) throw new ClassroomError(429, 'إجراءات كثيرة خلال وقت قصير، انتظر قليلاً');
  const { session, power } = await classroomAccess(actor, id);
  if (!power) throw new ClassroomError(403, 'لا تملك صلاحية إدارة هذه الحصة');
  if (power === 'assistant' && !ASSISTANT_ACTIONS.has(body.action)) throw new ClassroomError(403, 'هذا الإجراء للمدرّب فقط');
  if (['ended', 'cancelled'].includes(session.status)) throw new ClassroomError(409, 'انتهت هذه الحصة');
  const settings = settingsOf(session);
  const key = { liveClassId: id };

  if (body.action === 'settings') {
    const changes: Partial<ClassroomSettings> = {};
    for (const name of SETTINGS) if (typeof body[name] === 'boolean') changes[name] = body[name] as boolean;
    if (!Object.keys(changes).length) throw new ClassroomError(400, 'لم يتم تحديد أي إعداد');
    await prisma.liveClass.update({ where: { id }, data: changes });
    const next = { ...settings, ...changes };
    const svc = roomService();
    await publishRoomSettings(id, next, svc);
    if (svc && 'chatEnabled' in changes) {
      // Chat travels on the data channel: revoke or restore it for every connected student now.
      const seats = await prisma.liveClassParticipant.findMany({ where: { ...key, status: 'admitted' }, select: { userId: true, role: true } });
      const roles = new Map(seats.map(s => [s.userId, s.role]));
      for (const p of await connectedIdentities(svc, id)) {
        if (!roles.has(p.identity)) continue;
        const assistant = roles.get(p.identity) === 'assistant';
        await svc.updateParticipant(roomName(id), p.identity, undefined, {
          ...p.permission, canPublishData: next.chatEnabled || assistant, canUpdateMetadata: false,
        }).catch(() => undefined);
      }
    }
    if (svc && changes.screenShareAllowed === false) {
      for (const p of await connectedIdentities(svc, id)) {
        const sources = p.permission?.canPublishSources ?? [];
        if (!sources.includes(TrackSource.SCREEN_SHARE) || !(await prisma.liveClassParticipant.count({ where: { ...key, userId: p.identity } }))) continue;
        await setPublish(svc, id, p.identity, sources.filter(s => s !== TrackSource.SCREEN_SHARE && s !== TrackSource.SCREEN_SHARE_AUDIO), p.permission?.canPublishData ?? true).catch(() => undefined);
      }
    }
    await audit(id, actor.id, 'settings', null, changes);
    return 'تم حفظ إعدادات الحصة';
  }

  if (body.action === 'muteAll') {
    const svc = needService();
    const list = await connectedIdentities(svc, id);
    const students = new Set((await prisma.liveClassParticipant.findMany({ where: key, select: { userId: true } })).map(s => s.userId));
    for (const p of list) if (students.has(p.identity)) await muteAllTracks(svc, id, p.identity, list);
    await audit(id, actor.id, 'muteAll');
    return 'تم كتم جميع الطلاب';
  }

  const { userId, seat } = await requireStudentSeat(id, session.course.id, body.userId);
  if (userId === actor.id) throw new ClassroomError(400, 'لا يمكنك تطبيق هذا الإجراء على نفسك');
  const where = { liveClassId_userId: { liveClassId: id, userId } };

  switch (body.action) {
    case 'admit':
    case 'deny': {
      if (seat?.status !== 'pending') throw new ClassroomError(409, 'لا يوجد طلب دخول معلّق لهذا الطالب');
      await prisma.liveClassParticipant.update({ where, data: { status: body.action === 'admit' ? 'admitted' : 'denied' } });
      await audit(id, actor.id, body.action, userId);
      return body.action === 'admit' ? 'تم قبول الطالب' : 'تم رفض الدخول';
    }
    case 'lowerHand': {
      if (!seat) throw new ClassroomError(404, 'الطالب ليس في الحصة');
      await prisma.liveClassParticipant.update({ where, data: { handRaisedAt: null } });
      await audit(id, actor.id, 'lowerHand', userId);
      return 'تم إنزال اليد';
    }
    case 'mute': {
      const svc = needService();
      await muteAllTracks(svc, id, userId);
      await audit(id, actor.id, 'mute', userId);
      return 'تم كتم الطالب';
    }
    case 'grant':
    case 'revoke': {
      if (seat?.status !== 'admitted') throw new ClassroomError(409, 'الطالب غير مقبول في الحصة');
      const media = body.action === 'revoke' ? null : body.media;
      if (media !== null && (typeof media !== 'string' || !(media in GRANTS))) throw new ClassroomError(400, 'نوع الصلاحية غير صالح');
      if (media === 'screen' && !settings.screenShareAllowed) throw new ClassroomError(409, 'مشاركة الشاشة معطّلة في إعدادات الحصة');
      const svc = needService();
      const online = (await connectedIdentities(svc, id)).some(p => p.identity === userId);
      if (!online) throw new ClassroomError(404, 'الطالب غير متصل بالبث حالياً');
      const sources = media ? GRANTS[media as keyof typeof GRANTS] : [];
      await setPublish(svc, id, userId, sources, settings.chatEnabled || seat.role === 'assistant');
      if (!media) await muteAllTracks(svc, id, userId);
      else await prisma.liveClassParticipant.update({ where, data: { handRaisedAt: null } });
      await audit(id, actor.id, body.action, userId, media ? { media } : undefined);
      return media ? 'تم منح الصلاحية' : 'تم سحب صلاحيات الوسائط';
    }
    case 'remove': {
      const reason = typeof body.reason === 'string' ? body.reason.trim().slice(0, 300) : '';
      await prisma.liveClassParticipant.upsert({
        where, update: { status: 'removed', role: 'student', handRaisedAt: null, removedReason: reason || null },
        create: { liveClassId: id, userId, status: 'removed', removedReason: reason || null },
      });
      const svc = roomService();
      if (svc) await svc.removeParticipant(roomName(id), userId).catch(() => undefined);
      await audit(id, actor.id, 'remove', userId, reason ? { reason } : undefined);
      return 'تمت إزالة الطالب من الحصة';
    }
    case 'setAssistant':
    case 'unsetAssistant': {
      if (seat?.status !== 'admitted') throw new ClassroomError(409, 'يجب أن يكون الطالب مقبولاً في الحصة أولاً');
      const assistant = body.action === 'setAssistant';
      await prisma.liveClassParticipant.update({ where, data: { role: assistant ? 'assistant' : 'student' } });
      const svc = roomService();
      if (svc && !assistant && !settings.chatEnabled) {
        await svc.updateParticipant(roomName(id), userId, undefined, { canPublishData: false, canSubscribe: true, canUpdateMetadata: false }).catch(() => undefined);
      }
      await audit(id, actor.id, body.action, userId);
      return assistant ? 'تم تعيين الطالب مساعداً' : 'تم إلغاء صلاحية المساعد';
    }
  }
  throw new ClassroomError(400, 'الإجراء غير معروف');
}

/** Student raises or lowers their own hand; stored, ordered and survives reconnects. */
export async function setOwnHand(actor: Actor, id: string, raised: unknown) {
  if (typeof raised !== 'boolean') throw new ClassroomError(400, 'بيانات الطلب غير صالحة');
  if (!ID.test(id)) throw new ClassroomError(400, 'الجلسة غير صالحة');
  if (!consume(HAND_RULE, actor.id).allowed) throw new ClassroomError(429, 'انتظر قليلاً قبل رفع يدك مجدداً');
  const seat = await prisma.liveClassParticipant.findUnique({
    where: { liveClassId_userId: { liveClassId: id, userId: actor.id } }, select: { status: true, liveClass: { select: { status: true } } },
  });
  if (!seat || seat.status !== 'admitted' || seat.liveClass.status !== 'live') throw new ClassroomError(403, 'لست مشاركاً في هذه الحصة');
  await prisma.liveClassParticipant.update({
    where: { liveClassId_userId: { liveClassId: id, userId: actor.id } },
    data: { handRaisedAt: raised ? new Date() : null },
  });
  return raised;
}

/** Student view of their own seat: admission and hand state. */
export async function ownSeat(actor: Actor, id: string) {
  if (!ID.test(id)) throw new ClassroomError(400, 'الجلسة غير صالحة');
  const seat = await prisma.liveClassParticipant.findUnique({
    where: { liveClassId_userId: { liveClassId: id, userId: actor.id } }, select: { status: true, role: true, handRaisedAt: true },
  });
  return { status: seat?.status ?? null, role: seat?.role ?? null, handRaised: !!seat?.handRaisedAt };
}

/**
 * Admission decision for a student asking for a token. Returns the seat role, or throws:
 * 403 removed/denied, 423 locked, 202 waiting for the host.
 */
export async function admitForToken(userId: string, session: { id: string; locked?: boolean; waitingRoom?: boolean }) {
  const where = { liveClassId_userId: { liveClassId: session.id, userId } };
  const seat = await prisma.liveClassParticipant.findUnique({ where, select: { status: true, role: true, firstJoinedAt: true } });
  if (seat?.status === 'removed') throw new ClassroomError(403, 'أزالك المدرّب من هذه الحصة');
  if (seat?.status === 'denied') throw new ClassroomError(403, 'رفض المدرّب طلب انضمامك لهذه الحصة');
  if (seat?.status === 'admitted') {
    if (!seat.firstJoinedAt) await prisma.liveClassParticipant.update({ where, data: { firstJoinedAt: new Date() } });
    return seat.role;
  }
  // A student already admitted may always rejoin after a dropped connection; only newcomers are stopped.
  if (session.locked) throw new ClassroomError(423, 'أغلق المدرّب الحصة أمام المنضمين الجدد');
  if (session.waitingRoom) {
    await prisma.liveClassParticipant.upsert({ where, update: {}, create: { liveClassId: session.id, userId, status: 'pending' } });
    throw new ClassroomError(202, 'أنت في غرفة الانتظار؛ سيسمح لك المدرّب بالدخول قريباً');
  }
  await prisma.liveClassParticipant.upsert({
    where, update: { status: 'admitted', firstJoinedAt: new Date() },
    create: { liveClassId: session.id, userId, status: 'admitted', firstJoinedAt: new Date() },
  });
  return 'student';
}

/** Ending a session must also close the LiveKit room so nobody lingers in it. */
export async function closeLiveRoom(actorId: string, id: string) {
  const svc = roomService();
  let closed = false;
  if (svc) {
    try { await svc.deleteRoom(roomName(id)); closed = true; } catch { /* already gone or unreachable */ }
  }
  await audit(id, actorId, 'end', null, { roomClosed: closed }).catch(() => undefined);
  return closed;
}
