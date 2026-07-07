import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { redirect } from 'next/navigation';
import WalletClient from './WalletClient';
import Link from 'next/link';
import { ChevronRight, Wallet } from 'lucide-react';

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
    <div style={{ minHeight: '100vh', background: '#050505', color: '#fff' }}>
      
      {/* Top Accent Line */}
      <div style={{ height: '4px', background: 'linear-gradient(to right, var(--primary), #b8852a, #3b82f6)', width: '100%' }} />

      <div style={{ padding: '3rem 5%', maxWidth: '1400px', margin: '0 auto' }}>
        
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '3rem' }}>
          <div>
            <Link href="/dashboard" style={{ color: 'rgba(255,255,255,0.5)', display: 'flex', alignItems: 'center', gap: '0.3rem', marginBottom: '0.5rem', textDecoration: 'none' }}>
              <ChevronRight size={16} /> العودة للوحة القيادة
            </Link>
            <h1 style={{ fontSize: '2.5rem', fontWeight: 900, display: 'flex', alignItems: 'center', gap: '1rem', margin: 0 }}>
              <Wallet color="var(--primary)" size={40} /> محفظتي (K&Q Wallet)
            </h1>
          </div>
        </div>

        {/* Balance Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem', marginBottom: '4rem' }}>
          
          {/* USD Balance */}
          <div style={{ 
            background: 'url(/abstract-bg-blue.jpg) center/cover, linear-gradient(135deg, rgba(30,58,138,0.9), rgba(5,5,5,0.9))',
            backgroundBlendMode: 'overlay',
            padding: '2.5rem', 
            borderRadius: '24px', 
            boxShadow: '0 20px 40px -10px rgba(59,130,246,0.3)',
            border: '1px solid rgba(59,130,246,0.2)',
            position: 'relative',
            overflow: 'hidden'
          }}>
            <div style={{ position: 'absolute', top: '-20px', right: '-20px', width: '100px', height: '100px', background: 'radial-gradient(circle, rgba(59,130,246,0.4) 0%, transparent 70%)', filter: 'blur(20px)' }} />
            <h3 style={{ fontSize: '1.2rem', color: 'rgba(255,255,255,0.8)', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              الرصيد بالدولار (USD)
            </h3>
            <p style={{ fontSize: '3.5rem', fontWeight: 900, margin: 0, textShadow: '0 0 20px rgba(59,130,246,0.5)' }}>
              ${user.walletUSD.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
          </div>

          {/* SYP Balance */}
          <div style={{ 
            background: 'url(/abstract-bg-gold.jpg) center/cover, linear-gradient(135deg, rgba(203,161,83,0.9), rgba(5,5,5,0.9))',
            backgroundBlendMode: 'overlay',
            padding: '2.5rem', 
            borderRadius: '24px', 
            boxShadow: '0 20px 40px -10px rgba(203,161,83,0.3)',
            border: '1px solid rgba(203,161,83,0.2)',
            position: 'relative',
            overflow: 'hidden'
          }}>
            <div style={{ position: 'absolute', top: '-20px', right: '-20px', width: '100px', height: '100px', background: 'radial-gradient(circle, rgba(203,161,83,0.4) 0%, transparent 70%)', filter: 'blur(20px)' }} />
            <h3 style={{ fontSize: '1.2rem', color: 'rgba(255,255,255,0.9)', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              الرصيد بالليرة السورية (SYP)
            </h3>
            <p style={{ fontSize: '3.5rem', fontWeight: 900, margin: 0, color: '#fff', textShadow: '0 0 20px rgba(203,161,83,0.5)' }}>
              {user.walletSYP.toLocaleString()} <span style={{ fontSize: '1.5rem', fontWeight: 600, opacity: 0.8 }}>ل.س</span>
            </p>
          </div>

        </div>

        <WalletClient initialTransactions={transactions} />
      </div>
    </div>
  );
}
