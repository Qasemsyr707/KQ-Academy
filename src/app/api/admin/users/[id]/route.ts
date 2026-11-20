import { hasPermission } from '@/lib/permission-check';
import type { Permission } from '@/lib/permissions';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireRequestUser, RequestUserError } from '@/lib/request-user';

/** Fields this route may change. Anything else in the body is refused. */
const FIELDS = new Set(['role', 'walletSYP', 'walletUSD', 'isBanned', 'banReason', 'bannedUntil', 'maxLiveStreams']);
/** Roles that may be written here. OWNER is never written by the application. */
const ASSIGNABLE_ROLES = new Set(['STUDENT', 'INSTRUCTOR', 'ADMIN']);
const STAFF = new Set(['ADMIN', 'OWNER']);

class UserUpdateError extends Error {
  constructor(public readonly status: number, message: string) { super(message); }
}

type Target = {
  id: string; role: string; walletSYP: number; walletUSD: number; isBanned: boolean;
  banReason: string | null; bannedUntil: Date | null; maxLiveStreams: number;
};

function money(value: unknown, label: string): number {
  const amount = typeof value === 'number' ? value : typeof value === 'string' && value.trim() !== '' ? Number(value) : NaN;
  if (!Number.isFinite(amount) || amount < 0 || amount > 1e12) throw new UserUpdateError(400, `قيمة ${label} غير صالحة`);
  return Math.round(amount * 100) / 100;
}

/**
 * Only the fields that are present AND differ from the stored value are changed, so a client
 * that sends part of a user (the live-stream quota screen) never resets the wallet or the ban.
 */
function changes(body: Record<string, unknown>, target: Target) {
  const data: Partial<Omit<Target, 'id'>> = {};
  if ('role' in body) {
    if (typeof body.role !== 'string' || !ASSIGNABLE_ROLES.has(body.role)) {
      if (body.role === 'OWNER') throw new UserUpdateError(403, 'لا يمكن منح دور المالك من هذه الواجهة');
      throw new UserUpdateError(400, 'الدور غير صالح');
    }
    if (body.role !== target.role) data.role = body.role;
  }
  if ('walletSYP' in body) { const v = money(body.walletSYP, 'الرصيد بالليرة'); if (v !== target.walletSYP) data.walletSYP = v; }
  if ('walletUSD' in body) { const v = money(body.walletUSD, 'الرصيد بالدولار'); if (v !== target.walletUSD) data.walletUSD = v; }
  if ('maxLiveStreams' in body) {
    const v = typeof body.maxLiveStreams === 'number' ? body.maxLiveStreams
      : typeof body.maxLiveStreams === 'string' && body.maxLiveStreams.trim() !== '' ? Number(body.maxLiveStreams) : NaN;
    if (!Number.isInteger(v) || v < 0 || v > 1000) throw new UserUpdateError(400, 'سقف البثوث غير صالح');
    if (v !== target.maxLiveStreams) data.maxLiveStreams = v;
  }
  if ('isBanned' in body) {
    if (typeof body.isBanned !== 'boolean') throw new UserUpdateError(400, 'حالة الحظر غير صالحة');
    if (body.isBanned !== target.isBanned) data.isBanned = body.isBanned;
  }
  const banned = data.isBanned ?? target.isBanned;
  if ('banReason' in body) {
    if (body.banReason !== null && typeof body.banReason !== 'string') throw new UserUpdateError(400, 'سبب الحظر غير صالح');
    const v = banned && typeof body.banReason === 'string' && body.banReason.trim() ? body.banReason.trim().slice(0, 500) : null;
    if (v !== target.banReason) data.banReason = v;
  } else if (data.isBanned === false && target.banReason !== null) data.banReason = null;
  if ('bannedUntil' in body) {
    let v: Date | null = null;
    if (banned && body.bannedUntil !== null && body.bannedUntil !== '') {
      if (typeof body.bannedUntil !== 'string' || Number.isNaN(Date.parse(body.bannedUntil))) throw new UserUpdateError(400, 'تاريخ انتهاء الحظر غير صالح');
      v = new Date(body.bannedUntil);
    }
    if ((v?.getTime() ?? null) !== (target.bannedUntil?.getTime() ?? null)) data.bannedUntil = v;
  } else if (data.isBanned === false && target.bannedUntil !== null) data.bannedUntil = null;
  return data;
}

/**
 * Who may change what:
 * - the OWNER account is never changed, banned or deleted through this API;
 * - granting or removing ADMIN, and any change to an ADMIN account, is for the OWNER only;
 * - nobody changes their own role, wallet or ban.
 */
function authorize(actor: { id: string; role: string }, target: Target, data: Partial<Omit<Target, 'id'>>) {
  if (target.role === 'OWNER') throw new UserUpdateError(403, 'حساب المالك محمي ولا يمكن تعديله من هذه الواجهة');
  if (actor.role !== 'OWNER' && (STAFF.has(target.role) || data.role === 'ADMIN')) {
    throw new UserUpdateError(403, 'إدارة حسابات المدراء ومنح دور المدير متاحة للمالك فقط');
  }
  if (actor.id === target.id && ('role' in data || 'walletSYP' in data || 'walletUSD' in data || 'isBanned' in data)) {
    throw new UserUpdateError(403, 'لا يمكنك تعديل دورك أو رصيدك أو حظر حسابك بنفسك');
  }
}

function failure(error: unknown, fallback: string, label: string) {
  if (error instanceof RequestUserError || error instanceof UserUpdateError) {
    return NextResponse.json({ error: error.message }, { status: error.status });
  }
  console.error(label, error);
  return NextResponse.json({ error: fallback }, { status: 500 });
}

const SELECT = { id: true, name: true, email: true, phone: true, role: true, walletSYP: true, walletUSD: true,
  isBanned: true, banReason: true, bannedUntil: true, maxLiveStreams: true, createdAt: true } as const;

export async function PUT(req: Request, props: { params: Promise<{ id: string }> }) {
  try {
    // Identity and role come from the database on every request, never from the session token.
    const actor = await requireRequestUser(req, ['ADMIN', 'OWNER'], 'USERS');
    const { id } = await props.params;
    let body: unknown;
    try { body = await req.json(); } catch { throw new UserUpdateError(400, 'بيانات غير صالحة'); }
    if (!body || typeof body !== 'object' || Array.isArray(body)) throw new UserUpdateError(400, 'بيانات غير صالحة');
    const input = body as Record<string, unknown>;
    const unknown = Object.keys(input).filter(key => !FIELDS.has(key));
    if (unknown.length) throw new UserUpdateError(400, 'حقول غير مسموح بتعديلها');

    const result = await prisma.$transaction(async tx => {
      // Lock the row so a concurrent role change cannot slip between the check and the write.
      const locked = await tx.$queryRaw<{ id: string }[]>`SELECT id FROM "User" WHERE id = ${id} FOR UPDATE`;
      if (locked.length === 0) throw new UserUpdateError(404, 'المستخدم غير موجود');
      const target = await tx.user.findUniqueOrThrow({ where: { id }, select: {
        id: true, role: true, walletSYP: true, walletUSD: true, isBanned: true, banReason: true, bannedUntil: true, maxLiveStreams: true,
      } });
      const data = changes(input, target);
      authorize(actor, target, data);
      const required: Permission[] = [];
      if ('role' in data) required.push('ADMINISTRATORS');
      if ('walletUSD' in data || 'walletSYP' in data) required.push('WALLETS');
      if ('isBanned' in data || 'banReason' in data || 'bannedUntil' in data) required.push('USER_BANNING');
      if ('maxLiveStreams' in data) required.push('LIVE_CLASSES');
      for (const permission of required) {
        if (!await hasPermission(actor.id, permission)) throw new UserUpdateError(403, 'Permission denied');
      }
      // A later promotion must never resurrect previous grants.
      if ('role' in data) {
        const previous = await tx.user.findUniqueOrThrow({ where: { id }, select: { adminPermissions: true } });
        if (previous.adminPermissions.length) await tx.permissionAuditLog.createMany({ data: previous.adminPermissions.map(permission => ({ actorId: actor.id, targetId: id, permission, action: 'REVOKE' })) });
        await tx.user.update({ where: { id }, data: { adminPermissions: [] } });
      }
      const user = Object.keys(data).length
        ? await tx.user.update({ where: { id }, data, select: SELECT })
        : await tx.user.findUniqueOrThrow({ where: { id }, select: SELECT });
      return { user, fields: Object.keys(data) };
    });
    if (result.fields.length) console.info('[admin-users] updated', { target: id, by: actor.id, role: actor.role, fields: result.fields });
    return NextResponse.json({ message: 'تم تحديث بيانات المستخدم بنجاح', user: result.user }, { status: 200 });
  } catch (error) {
    return failure(error, 'حدث خطأ في الخادم', 'Update User API Error:');
  }
}

export async function DELETE(req: Request, props: { params: Promise<{ id: string }> }) {
  try {
    const actor = await requireRequestUser(req, ['ADMIN', 'OWNER'], 'USERS');
    const params = await props.params;

    if (actor.id === params.id) {
      return NextResponse.json({ error: 'لا يمكنك حذف حسابك الخاص' }, { status: 400 });
    }
    const target = await prisma.user.findUnique({ where: { id: params.id }, select: { role: true } });
    if (!target) return NextResponse.json({ error: 'المستخدم غير موجود' }, { status: 404 });
    if (target.role === 'OWNER') return NextResponse.json({ error: 'حساب المالك محمي ولا يمكن حذفه' }, { status: 403 });
    if (target.role === 'ADMIN' && actor.role !== 'OWNER') {
      return NextResponse.json({ error: 'حذف حسابات المدراء متاح للمالك فقط' }, { status: 403 });
    }

    const courseCount = await prisma.course.count({ where: { instructorId: params.id } });
    if (courseCount > 0) {
      return NextResponse.json({ error: 'لا يمكن حذف حساب مدرب يمتلك كورسات. قم بنقل الكورسات أو حذفها أولاً.' }, { status: 400 });
    }

    await prisma.$transaction(async (tx) => {
      // Re-check under a row lock: the role may have changed since the first read.
      const locked = await tx.$queryRaw<{ role: string }[]>`SELECT role FROM "User" WHERE id = ${params.id} FOR UPDATE`;
      if (locked.length === 0) throw new UserUpdateError(404, 'المستخدم غير موجود');
      if (locked[0].role === 'OWNER' || (locked[0].role === 'ADMIN' && actor.role !== 'OWNER')) {
        throw new UserUpdateError(403, 'لا يمكن حذف هذا الحساب');
      }
      // Unlink referred users
      await tx.user.updateMany({
        where: { referredById: params.id },
        data: { referredById: null }
      });

      // Unlink matchmaking
      await tx.matchmakingRequest.updateMany({
        where: { matchedWithId: params.id },
        data: { matchedWithId: null }
      });

      // Delete dependencies
      await tx.affiliateEarning.deleteMany({ where: { OR: [{ ownerId: params.id }, { buyerId: params.id }] } });
      await tx.userSubscription.deleteMany({ where: { userId: params.id } });
      await tx.enrollment.deleteMany({ where: { userId: params.id } });
      await tx.payment.deleteMany({ where: { userId: params.id } });
      await tx.review.deleteMany({ where: { userId: params.id } });
      await tx.certificate.deleteMany({ where: { userId: params.id } });
      await tx.quizAttempt.deleteMany({ where: { userId: params.id } });
      await tx.courseAnswer.deleteMany({ where: { userId: params.id } });
      await tx.courseQuestion.deleteMany({ where: { userId: params.id } });
      await tx.walletTransaction.deleteMany({ where: { userId: params.id } });
      await tx.examSimulatorAttempt.deleteMany({ where: { userId: params.id } });
      await tx.flashcardDeck.deleteMany({ where: { userId: params.id } });
      await tx.badge.deleteMany({ where: { userId: params.id } });
      await tx.communityComment.deleteMany({ where: { userId: params.id } });
      await tx.communityPost.deleteMany({ where: { userId: params.id } });
      await tx.shortComment.deleteMany({ where: { userId: params.id } });
      await tx.short.deleteMany({ where: { userId: params.id } });
      await tx.liveClass.deleteMany({ where: { instructorId: params.id } });
      await tx.matchmakingRequest.deleteMany({ where: { userId: params.id } });
      await tx.notification.deleteMany({ where: { userId: params.id } });

      // Delete user
      await tx.user.delete({
        where: { id: params.id }
      });
    });
    console.info('[admin-users] deleted', { target: params.id, by: actor.id, role: actor.role });

    return NextResponse.json({ message: 'تم حذف المستخدم نهائياً' }, { status: 200 });
  } catch (error) {
    return failure(error, 'حدث خطأ في الخادم (قد توجد بيانات مرتبطة تمنع الحذف)', 'Delete User API Error:');
  }
}
