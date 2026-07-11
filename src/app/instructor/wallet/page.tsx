import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/db';
import InstructorWalletClient from './InstructorWalletClient';

export const dynamic = 'force-dynamic';

export default async function InstructorWalletPage() {
  const session = await getServerSession(authOptions);
  
  if (!session || !session.user) {
    redirect('/login');
  }
  
  if (session.user.role !== 'INSTRUCTOR' && session.user.role !== 'ADMIN') {
    redirect('/');
  }

  const userId = session.user.id;

  // Fetch User's wallet balances
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { walletUSD: true, walletSYP: true }
  });

  if (!user) {
    redirect('/login');
  }

  // Fetch transaction history
  const transactions = await prisma.walletTransaction.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    take: 20
  });

  return (
    <InstructorWalletClient 
      walletUSD={user.walletUSD} 
      walletSYP={user.walletSYP} 
      transactions={transactions} 
    />
  );
}
