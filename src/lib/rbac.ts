import { getServerSession, type Session } from 'next-auth';
import { authOptions } from './auth';
import { NextResponse } from 'next/server';
import { redirect } from 'next/navigation';
import { prisma } from './db';

export type Role = 'OWNER' | 'ADMIN' | 'INSTRUCTOR' | 'STUDENT';

type RoleResult =
  | { authorized: true; role: Role; email: string; isOwner: boolean; session: Session }
  | { authorized: false; role?: Role; email?: string; isOwner: boolean; session?: Session };

export async function checkRole(allowedRoles: Role[]): Promise<RoleResult> {
  if (!process.env.NEXTAUTH_SECRET) return { authorized: false, isOwner: false };
  const session = await getServerSession(authOptions);
  
  if (!session || !session.user) {
    return { authorized: false, isOwner: false };
  }

  if (!session.user.id) return { authorized: false, isOwner: false };
  const user = await prisma.user.findUnique({
    where: { id: session.user.id }, select: { id: true, role: true, email: true, isBanned: true },
  });
  if (!user || user.isBanned) return { authorized: false, isOwner: false };
  const userEmail = user.email.toLowerCase();
  const userRole = ['OWNER', 'ADMIN', 'INSTRUCTOR', 'STUDENT'].find(role => role === user.role) as Role | undefined;
  if (!userRole) return { authorized: false, isOwner: false };
  const isOwner = userRole === 'OWNER';
  const currentSession: Session = { ...session, user: { ...session.user, id: user.id, email: user.email, role: userRole } };

  // Owner always has access
  if (isOwner) {
    return { authorized: true, role: userRole, email: userEmail, isOwner: true, session: currentSession };
  }

  // Check if user's role is in the allowed list
  if (allowedRoles.includes(userRole)) {
    return { authorized: true, role: userRole, email: userEmail, isOwner: false, session: currentSession };
  }

  return { authorized: false, role: userRole, email: userEmail, isOwner: false, session: currentSession };
}

// For Server Components (Pages)
export async function requireRolePage(allowedRoles: Role[], redirectTo = '/dashboard') {
  const result = await checkRole(allowedRoles);
  if (!result.authorized) {
    redirect(redirectTo);
  }
  return result;
}

// For API Routes
export async function requireRoleApi(allowedRoles: Role[]) {
  const result = await checkRole(allowedRoles);
  if (!result.authorized) {
    return { 
      errorResponse: NextResponse.json({ error: 'غير مصرح لك بالوصول إلى هذه الواجهة' }, { status: 403 }),
      ...result 
    };
  }
  return { errorResponse: undefined, ...result };
}
