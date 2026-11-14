import { getServerSession } from 'next-auth';
import jwt from 'jsonwebtoken';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

export class RequestUserError extends Error {
  constructor(public readonly status: number, message: string) { super(message); }
}

export interface RequestUser {
  id: string;
  role: string;
  email: string;
  name: string;
  phone: string | null;
}

export type RequestAuthorization =
  | { kind: 'none' }
  | { kind: 'bearer'; token: string }
  | { kind: 'invalid' };

/**
 * Classify the Authorization header for this application.
 *
 * - `Bearer <token>`: the mobile app's credential (verified by the caller).
 * - `Basic ...`: belongs to a reverse proxy in front of the site (password
 *   protection of a staging environment). Browsers repeat it on every request,
 *   so it is not an application credential and is ignored: the web session
 *   cookie keeps working, behind the same cross-site checks as without it.
 * - anything else, an oversized value or an empty Bearer: rejected, never
 *   silently replaced by the session cookie.
 */
export function readAuthorization(headers: Pick<Headers, 'get'>): RequestAuthorization {
  const value = headers.get('authorization');
  if (!value || !value.trim()) return { kind: 'none' };
  if (/^basic(\s|$)/i.test(value.trim())) return { kind: 'none' };
  if (!value.startsWith('Bearer ') || value.length > 8192) return { kind: 'invalid' };
  const token = value.slice(7).trim();
  return token ? { kind: 'bearer', token } : { kind: 'invalid' };
}

/** Resolve identity from a verified credential, then refresh privileges from DB. */
export async function requireRequestUser(req: Request, roles?: readonly string[]): Promise<RequestUser> {
  const secret = process.env.NEXTAUTH_SECRET;
  if (!secret) throw new RequestUserError(503, 'خدمة تسجيل الدخول غير متاحة حالياً');
  let id: unknown;
  const authorization = readAuthorization(req.headers);
  if (authorization.kind === 'invalid') throw new RequestUserError(401, 'يرجى تسجيل الدخول');
  if (authorization.kind === 'bearer') {
    try {
      const claims = jwt.verify(authorization.token, secret, { algorithms: ['HS256'] });
      if (typeof claims !== 'string') id = claims.id;
    } catch { throw new RequestUserError(401, 'يرجى تسجيل الدخول'); }
  } else {
    if (!['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
      const origin = req.headers.get('origin');
      const configuredUrl = process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_APP_URL || req.url;
      if ((origin && origin !== new URL(configuredUrl).origin)
        || req.headers.get('content-type')?.split(';')[0].trim().toLowerCase() !== 'application/json') {
        throw new RequestUserError(403, 'مصدر الطلب غير مصرح به');
      }
    }
    const session = await getServerSession(authOptions);
    id = session?.user?.id;
  }
  if (typeof id !== 'string' || !id || id.length > 200) {
    throw new RequestUserError(401, 'يرجى تسجيل الدخول');
  }
  const user = await prisma.user.findUnique({
    where: { id }, select: { id: true, role: true, email: true, name: true, phone: true, isBanned: true },
  });
  if (!user || user.isBanned) throw new RequestUserError(401, 'يرجى تسجيل الدخول');
  if (roles && !roles.includes(user.role)) throw new RequestUserError(403, 'غير مصرح لك بإجراء هذه العملية');
  return { id: user.id, role: user.role, email: user.email, name: user.name, phone: user.phone };
}
