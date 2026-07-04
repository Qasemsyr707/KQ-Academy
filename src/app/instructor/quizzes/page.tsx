import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { PrismaClient } from '@prisma/client';
import { redirect } from 'next/navigation';
import QuizzesListClient from './QuizzesListClient';

const prisma = new PrismaClient();

export default async function QuizzesPage() {
  const session = await getServerSession(authOptions);
  const user = session?.user as any;
  if (!session || !user || (user.role !== 'INSTRUCTOR' && user.role !== 'ADMIN' && user.role !== 'OWNER')) {
    redirect('/login');
  }

  // Fetch quizzes for courses taught by this instructor
  const quizzes = await prisma.quiz.findMany({
    where: {
      chapter: {
        course: {
          instructorId: user.id
        }
      }
    },
    include: {
      chapter: {
        include: {
          course: true
        }
      },
      _count: {
        select: { questions: true, attempts: true }
      }
    },
    orderBy: {
      createdAt: 'desc'
    }
  });

  return <QuizzesListClient quizzes={quizzes} />;
}
