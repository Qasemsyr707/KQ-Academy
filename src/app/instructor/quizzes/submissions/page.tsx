import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { PrismaClient } from '@prisma/client';
import { redirect } from 'next/navigation';
import SubmissionsClient from './SubmissionsClient';

const prisma = new PrismaClient();

export default async function SubmissionsPage() {
  const session = await getServerSession(authOptions);
  const user = session?.user as any;
  if (!session || !user || (user.role !== 'INSTRUCTOR' && user.role !== 'ADMIN' && user.role !== 'OWNER')) {
    redirect('/login');
  }

  // Fetch pending quiz attempts for courses taught by this instructor
  const pendingAttempts = await prisma.quizAttempt.findMany({
    where: {
      status: 'PENDING_GRADING',
      quiz: {
        chapter: {
          course: {
            instructorId: user.id
          }
        }
      }
    },
    include: {
      user: {
        select: { id: true, name: true, email: true, image: true }
      },
      quiz: {
        select: { id: true, title: true, type: true, totalMarks: true, passingScore: true, fileUrl: true, chapter: { select: { title: true, course: { select: { title: true } } } } }
      }
    },
    orderBy: {
      createdAt: 'asc'
    }
  });

  return <SubmissionsClient pendingAttempts={pendingAttempts} />;
}
