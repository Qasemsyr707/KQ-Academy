import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { redirect } from 'next/navigation';
import DashboardClient from './DashboardClient';

export const dynamic = 'force-dynamic';

export default async function StudentDashboardPage() {
  const session = await getServerSession(authOptions);
  
  if (!session || !session.user) {
    redirect('/login');
  }

  const user = await prisma.user.findUnique({
    where: { id: (session.user as any).id },
    select: { points: true }
  });

  const enrollments = await prisma.enrollment.findMany({
    where: { userId: (session.user as any).id },
    include: {
      course: {
        select: {
          id: true,
          title: true,
          thumbnail: true
        }
      }
    },
    orderBy: { updatedAt: 'desc' }
  });

  return <DashboardClient enrollments={enrollments} points={user?.points || 0} />;
}
