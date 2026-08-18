import { prisma } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import LiveScheduleClient from './LiveScheduleClient';

export default async function ScheduleLivePage() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect('/login');
  }

  const user = session.user as any;

  // Fetch courses managed by this instructor
  const courses = await prisma.course.findMany({
    where: user.role === 'ADMIN' || user.role === 'OWNER' 
      ? {} 
      : { instructorId: user.id },
    include: {
      chapters: {
        orderBy: { order: 'asc' }
      }
    },
    orderBy: { createdAt: 'desc' }
  });

  return <LiveScheduleClient courses={courses} />;
}
