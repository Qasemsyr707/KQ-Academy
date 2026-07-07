import { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import { prisma } from '@/lib/db';
import bcrypt from 'bcryptjs';

// Admin emails that always have ADMIN role
const ADMIN_EMAILS = ['qasemalsokhny@gmail.com'];

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

        // Force ADMIN role for admin emails
        const role = ADMIN_EMAILS.includes(user.email.toLowerCase()) ? 'ADMIN' : user.role;

        // Update role in DB if it changed
        if (role !== user.role) {
          await prisma.user.update({
            where: { id: user.id },
            data: { role: 'ADMIN' },
          });
        }

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
      }
      if (trigger === 'update' && session) {
        if (session.name) token.name = session.name;
        if (session.phone) token.phone = session.phone;
      }
      return token;
    },
    async session({ session, token }) {
      if (token && session.user) {
        (session.user as any).id = token.id;
        (session.user as any).role = token.role;
        (session.user as any).phone = token.phone;
        if (token.name) session.user.name = token.name;
      }
      return session;
    },
  },
  pages: { signIn: '/login' },
  secret: process.env.NEXTAUTH_SECRET || 'kq-academy-secret-2026-qasem-khaled',
};
