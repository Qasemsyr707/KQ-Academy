import { prisma } from '@/lib/db';
import { requireRolePage } from '@/lib/rbac';
import Link from 'next/link';
import UsersClient from './UsersClient';
import { ArrowRight } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function AdminUsersPage() {
  const { email: userEmail } = await requireRolePage(['ADMIN']);

  const users = await prisma.user.findMany({
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      role: true,
      walletSYP: true,
      walletUSD: true,
      createdAt: true,
    },
    orderBy: { createdAt: 'desc' }
  });

  return (
    <div style={{ padding: '2rem 5%', minHeight: '100vh', background: '#050505', color: '#fff' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '2.5rem', fontWeight: 'bold' }}>إدارة المستخدمين</h1>
        <Link href="/admin" style={{ color: '#fff', textDecoration: 'none', fontWeight: 'bold', padding: '0.5rem 1rem', background: 'rgba(255,255,255,0.1)', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          العودة للوحة الإدارة <ArrowRight size={18} />
        </Link>
      </div>

      <UsersClient initialUsers={users} currentUserEmail={userEmail || ''} />
    </div>
  );
}
