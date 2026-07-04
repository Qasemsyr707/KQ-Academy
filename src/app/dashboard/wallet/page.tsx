import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { redirect } from 'next/navigation';
import WalletClient from './WalletClient';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default async function WalletPage() {
  const session = await getServerSession(authOptions);
  
  if (!session || !session.user) {
    redirect('/login');
  }

  const userId = (session.user as any).id;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { walletUSD: true, walletSYP: true }
  });

  if (!user) {
    redirect('/login');
  }

  const transactions = await prisma.walletTransaction.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' }
  });

  return (
    <div style={{ padding: '2rem 5%', minHeight: '100vh', background: '#050505', color: '#fff' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '2.5rem', fontWeight: 'bold', color: 'var(--primary)' }}>محفظتي (K&Q Wallet)</h1>
        <Link href="/dashboard" style={{ color: '#fff', textDecoration: 'none', fontWeight: 'bold', padding: '0.5rem 1rem', background: 'rgba(255,255,255,0.1)', borderRadius: '8px' }}>
          العودة للوحة القيادة
        </Link>
      </div>

      {/* Balance Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem', marginBottom: '3rem' }}>
        <div style={{ background: 'linear-gradient(135deg, #1e3a8a, #3b82f6)', padding: '2rem', borderRadius: '16px', boxShadow: '0 10px 25px rgba(0,0,0,0.5)' }}>
          <h3 style={{ fontSize: '1.2rem', color: 'rgba(255,255,255,0.8)', marginBottom: '0.5rem' }}>الرصيد بالدولار (USD)</h3>
          <p style={{ fontSize: '3rem', fontWeight: 'bold' }}>
            ${user.walletUSD.toLocaleString()}
          </p>
        </div>
        <div style={{ background: 'linear-gradient(135deg, #b45309, #cba153)', padding: '2rem', borderRadius: '16px', boxShadow: '0 10px 25px rgba(0,0,0,0.5)' }}>
          <h3 style={{ fontSize: '1.2rem', color: 'rgba(255,255,255,0.8)', marginBottom: '0.5rem' }}>الرصيد بالليرة السورية (SYP)</h3>
          <p style={{ fontSize: '3rem', fontWeight: 'bold', color: '#000' }}>
            {user.walletSYP.toLocaleString()} <span style={{ fontSize: '1.5rem' }}>ل.س</span>
          </p>
        </div>
      </div>

      <WalletClient initialTransactions={transactions} />
    </div>
  );
}
