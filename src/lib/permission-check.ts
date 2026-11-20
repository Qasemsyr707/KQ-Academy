import { prisma } from '@/lib/db';
import type { Permission } from './permissions';

/** Never trust JWT privileges, cache grants, or treat a missing grant as legacy access. */
export async function hasPermission(userId: string, permission: Permission): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { id: userId }, select: { role: true, isBanned: true, adminPermissions: true },
  });
  return !!user && !user.isBanned && (user.role === 'OWNER'
    || (user.role === 'ADMIN' && user.adminPermissions?.includes(permission) === true));
}
