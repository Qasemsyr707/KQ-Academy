import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireRequestUser, RequestUserError } from '@/lib/request-user';
import { isPermission, PERMISSION_KEYS } from '@/lib/permissions';

const headers = { 'Cache-Control': 'private, no-store', Vary: 'Cookie, Authorization' };
export async function PUT(req: Request) {
  try {
    const actor = await requireRequestUser(req, ['OWNER']);
    const body: unknown = await req.json();
    if (!body || typeof body !== 'object' || Array.isArray(body)) throw new RequestUserError(400, 'بيانات غير صالحة');
    const { targetId, permission, granted, expected } = body as Record<string, unknown>;
    if (typeof targetId !== 'string' || !targetId || targetId.length > 200 || !isPermission(permission)
      || typeof granted !== 'boolean' || typeof expected !== 'boolean'
      || Object.keys(body).some(key => !['targetId', 'permission', 'granted', 'expected'].includes(key))) {
      throw new RequestUserError(400, 'بيانات الإذن غير صالحة');
    }
    const result = await prisma.$transaction(async tx => {
      // Serialize against role changes and concurrent owner edits, with stable lock ordering.
      await tx.$queryRaw`SELECT id FROM "User" WHERE id IN (${actor.id}, ${targetId}) ORDER BY id FOR UPDATE`;
      const owner = await tx.user.findUnique({ where: { id: actor.id }, select: { role: true, isBanned: true } });
      if (!owner || owner.role !== 'OWNER' || owner.isBanned) throw new RequestUserError(403, 'هذه العملية متاحة للمالك فقط');
      const target = await tx.user.findUnique({ where: { id: targetId }, select: { role: true, adminPermissions: true } });
      if (!target) throw new RequestUserError(404, 'الحساب غير موجود');
      if (target.role !== 'ADMIN') throw new RequestUserError(403, 'يمكن تعديل أذونات حسابات المدراء فقط');
      const current = target.adminPermissions.includes(permission);
      if (current !== expected) throw new RequestUserError(409, 'تغيّر الإذن، أعد تحميل الصفحة');
      if (current === granted) return { changed: false };
      await tx.user.update({ where: { id: targetId }, data: {
        adminPermissions: granted ? [...target.adminPermissions, permission] : target.adminPermissions.filter(p => p !== permission),
      } });
      await tx.permissionAuditLog.create({ data: {
        actorId: actor.id, targetId, permission, action: granted ? 'GRANT' : 'REVOKE',
      } });
      return { changed: true };
    });
    return NextResponse.json(result, { headers });
  } catch (error) {
    const known = error instanceof RequestUserError;
    return NextResponse.json({ error: known ? error.message : error instanceof SyntaxError ? 'بيانات غير صالحة' : 'تعذّر حفظ الإذن' }, {
      status: known ? error.status : error instanceof SyntaxError ? 400 : 500, headers,
    });
  }
}

/** Replace an administrator's whole permission set at once (presets), with an optimistic check on the current set. */
export async function POST(req: Request) {
  try {
    const actor = await requireRequestUser(req, ['OWNER']);
    const body: unknown = await req.json();
    if (!body || typeof body !== 'object' || Array.isArray(body)) throw new RequestUserError(400, 'بيانات غير صالحة');
    const { targetId, permissions, expected } = body as Record<string, unknown>;
    const validList = (value: unknown): value is string[] => Array.isArray(value) && value.length <= PERMISSION_KEYS.length
      && value.every(isPermission) && new Set(value).size === value.length;
    if (typeof targetId !== 'string' || !targetId || targetId.length > 200 || !validList(permissions) || !validList(expected)
      || Object.keys(body).some(key => !['targetId', 'permissions', 'expected'].includes(key))) {
      throw new RequestUserError(400, 'بيانات الأذونات غير صالحة');
    }
    const result = await prisma.$transaction(async tx => {
      await tx.$queryRaw`SELECT id FROM "User" WHERE id IN (${actor.id}, ${targetId}) ORDER BY id FOR UPDATE`;
      const owner = await tx.user.findUnique({ where: { id: actor.id }, select: { role: true, isBanned: true } });
      if (!owner || owner.role !== 'OWNER' || owner.isBanned) throw new RequestUserError(403, 'هذه العملية متاحة للمالك فقط');
      const target = await tx.user.findUnique({ where: { id: targetId }, select: { role: true, adminPermissions: true } });
      if (!target) throw new RequestUserError(404, 'الحساب غير موجود');
      if (target.role !== 'ADMIN') throw new RequestUserError(403, 'يمكن تعديل أذونات حسابات المدراء فقط');
      const current = new Set(target.adminPermissions);
      if (current.size !== expected.length || expected.some(p => !current.has(p))) throw new RequestUserError(409, 'تغيّرت الأذونات، أعد تحميل الصفحة');
      const next = PERMISSION_KEYS.filter(p => permissions.includes(p));
      const granted = next.filter(p => !current.has(p));
      const revoked = target.adminPermissions.filter(p => !next.includes(p as never));
      if (!granted.length && !revoked.length) return { changed: false };
      await tx.user.update({ where: { id: targetId }, data: { adminPermissions: next } });
      await tx.permissionAuditLog.createMany({ data: [
        ...granted.map(permission => ({ actorId: actor.id, targetId, permission, action: 'GRANT' })),
        ...revoked.map(permission => ({ actorId: actor.id, targetId, permission, action: 'REVOKE' })),
      ] });
      return { changed: true };
    });
    return NextResponse.json(result, { headers });
  } catch (error) {
    const known = error instanceof RequestUserError;
    return NextResponse.json({ error: known ? error.message : error instanceof SyntaxError ? 'بيانات غير صالحة' : 'تعذّر حفظ الأذونات' }, {
      status: known ? error.status : error instanceof SyntaxError ? 400 : 500, headers,
    });
  }
}
