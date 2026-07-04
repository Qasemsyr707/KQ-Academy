import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { PrismaClient } from '@prisma/client';
import LiveInstructorClient from './LiveInstructorClient';

const prisma = new PrismaClient();

export default async function InstructorLiveLessonPage({ params }: { params: { courseId: string, lessonId: string } }) {
  const session = await getServerSession(authOptions);
  const user = session?.user as any;
  if (!session || !user || (user.role !== 'INSTRUCTOR' && user.role !== 'ADMIN' && user.role !== 'OWNER')) {
    redirect('/login');
  }

  const course = await prisma.course.findUnique({
    where: { id: params.courseId },
    include: {
      instructor: true
    }
  });

  if (!course || (course.instructorId !== user.id && user.role !== 'ADMIN' && user.role !== 'OWNER')) {
    redirect('/instructor/courses');
  }

  const lesson = await prisma.lesson.findUnique({
    where: { id: params.lessonId }
  });

  if (!lesson || !lesson.isLive) {
    redirect(`/instructor/courses/${params.courseId}/chapters`);
  }

  return <LiveInstructorClient lesson={lesson} course={course} />;
}
