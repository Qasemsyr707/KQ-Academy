import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { PrismaClient } from '@prisma/client';
import LiveInstructorClient from './LiveInstructorClient';

const prisma = new PrismaClient();

export default async function InstructorLiveLessonPage({ params }: { params: Promise<{ courseId: string, lessonId: string }> }) {
  const resolvedParams = await params;
  const { courseId, lessonId } = resolvedParams;

  const session = await getServerSession(authOptions);
  const user = session?.user as any;
  if (!session || !user || (user.role !== 'INSTRUCTOR' && user.role !== 'ADMIN' && user.role !== 'OWNER')) {
    redirect('/login');
  }

  const course = await prisma.course.findUnique({
    where: { id: courseId },
    include: {
      instructor: true
    }
  });

  if (!course || (course.instructorId !== user.id && user.role !== 'ADMIN' && user.role !== 'OWNER')) {
    redirect('/instructor/courses');
  }

  const lesson = await prisma.lesson.findUnique({
    where: { id: lessonId }
  });

  if (!lesson || !lesson.isLive) {
    redirect(`/instructor/courses/${courseId}/chapters`);
  }

  return <LiveInstructorClient lesson={lesson} course={course} />;
}
