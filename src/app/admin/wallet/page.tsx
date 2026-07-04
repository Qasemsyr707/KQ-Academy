import { prisma } from '@/lib/db';
import { requireRolePage } from '@/lib/rbac';
import Link from 'next/link';
import AdminWalletClient from './AdminWalletClient';

export const dynamic = 'force-dynamic';

export default async function AdminWalletPage() {
  await requireRolePage(['ADMIN']);

  const pendingTransactions = await prisma.walletTransaction.findMany({
    where: { status: 'PENDING', type: 'DEPOSIT' },
    include: {
      user: { select: { name: true, email: true } }
    },
    orderBy: { createdAt: 'desc' }
  });

  const exchangeRateSetting = await prisma.setting.findUnique({
    where: { key: 'exchangeRate' }
  });
  
  const exchangeRate = exchangeRateSetting?.value || '14500';

  return (
    <div style={{ padding: '2rem 5%', minHeight: '100vh', background: '#050505', color: '#fff' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '2.5rem', fontWeight: 'bold' }}>إدارة المحافظ (شحن الرصيد)</h1>
        <Link href="/admin" style={{ color: 'var(--primary)', textDecoration: 'none', fontWeight: 'bold' }}>
          العودة للوحة الإدارة
        </Link>
      </div>

      <AdminWalletClient initialTransactions={pendingTransactions} initialRate={exchangeRate} />
    </div>
  );
}
