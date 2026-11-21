import { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import { prisma } from '@/lib/db';
import bcrypt from 'bcryptjs';

const ROLE_REFRESH_MS = 60_000;

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        const user = await prisma.user.findFirst({
          where: { 
            email: {
              equals: credentials.email,
              mode: 'insensitive'
            }
          },
        });

        if (!user) return null;

        if (user.isBanned) {
          throw new Error(user.banReason || 'تم حظر هذا الحساب من قبل الإدارة.');
        }

        const isPasswordValid = await bcrypt.compare(credentials.password, user.password);
        if (!isPasswordValid) return null;

        // Database privileges are authoritative; login must never promote users.
        const role = user.role;

        // NOTE: We do NOT store the image in the token to avoid
        // REQUEST_HEADER_TOO_LARGE errors (base64 images are too big for cookies).
        // Image is fetched directly from DB via /api/user/me endpoint.
        return {
          id: user.id,
          name: user.name,
          email: user.email,
          role,
          phone: user.phone,
        };
      },
    }),
  ],
  session: { strategy: 'jwt' },
  callbacks: {
    async jwt({ token, user, trigger, session }) {
      if (user) {
        token.id = user.id;
        token.role = (user as any).role;
        token.phone = (user as any).phone;
        token.roleCheckedAt = 0;
      }
      if (trigger === 'update' && session) {
        if (session.name) token.name = session.name;
        if (session.phone) token.phone = session.phone;
      }
      // Display only: the navigation follows a role change within a minute, without signing out.
      // Every protected page and API still reads the role and permissions from the database.
      const checkedAt = typeof token.roleCheckedAt === 'number' ? token.roleCheckedAt : 0;
      if (typeof token.id === 'string' && (trigger === 'update' || Date.now() - checkedAt > ROLE_REFRESH_MS)) {
        try {
          const current = await prisma.user.findUnique({ where: { id: token.id }, select: { role: true, isBanned: true, adminPermissions: true } });
          if (current) {
            token.role = current.role;
            token.canAdmin = !current.isBanned && (current.role === 'OWNER' || (current.role === 'ADMIN' && current.adminPermissions.includes('DASHBOARD')));
          } else {
            token.canAdmin = false;
          }
          token.roleCheckedAt = Date.now();
        } catch { /* Keep the previous display values; authorization does not depend on them. */ }
      }
      return token;
    },
    async session({ session, token }) {
      if (token && session.user) {
        (session.user as any).id = token.id;
        (session.user as any).role = token.role;
        (session.user as any).canAdmin = token.canAdmin === true;
        (session.user as any).phone = token.phone;
        if (token.name) session.user.name = token.name;
      }
      return session;
    },
  },
  pages: { signIn: '/login' },
  secret: process.env.NEXTAUTH_SECRET,
};
