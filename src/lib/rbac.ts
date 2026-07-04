import { getServerSession } from 'next-auth';
import { authOptions } from './auth';
import { NextResponse } from 'next/server';
import { redirect } from 'next/navigation';

export const OWNER_EMAILS = ['qasemalsokhny@gmail.com'];

export type Role = 'ADMIN' | 'INSTRUCTOR' | 'STUDENT';

export async function checkRole(allowedRoles: Role[]): Promise<{ authorized: boolean; role?: Role; email?: string; isOwner: boolean; session?: any }> {
  const session = await getServerSession(authOptions);
  
  if (!session || !session.user) {
    return { authorized: false, isOwner: false };
  }

  const userEmail = session.user.email?.toLowerCase() || '';
  const userRole = (session.user as any).role as Role;
  const isOwner = OWNER_EMAILS.includes(userEmail);

  // Owner always has access
  if (isOwner) {
    return { authorized: true, role: userRole, email: userEmail, isOwner: true, session };
  }

  // Check if user's role is in the allowed list
  if (allowedRoles.includes(userRole)) {
    return { authorized: true, role: userRole, email: userEmail, isOwner: false, session };
  }

  return { authorized: false, role: userRole, email: userEmail, isOwner: false, session };
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
