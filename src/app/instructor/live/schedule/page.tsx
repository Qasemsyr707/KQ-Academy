import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { PrismaClient } from '@prisma/client';
import { redirect } from 'next/navigation';
import LiveScheduleClient from './LiveScheduleClient';

const prisma = new PrismaClient();

export default async function LiveSchedulePage() {
  const session = await getServerSession(authOptions);
  const user = session?.user as any;
  if (!session || !user || (user.role !== 'INSTRUCTOR' && user.role !== 'ADMIN' && user.role !== 'OWNER')) {
    redirect('/login');
  }

  // Fetch courses taught by this instructor (including their chapters)
  const courses = await prisma.course.findMany({
    where: {
      instructorId: user.id
    },
    include: {
      chapters: {
        orderBy: {
          order: 'asc'
        }
      }
    }
  });

  return <LiveScheduleClient courses={courses} />;
}
