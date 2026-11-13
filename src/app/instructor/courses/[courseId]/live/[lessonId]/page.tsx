import { redirect } from 'next/navigation';
import { prisma } from '@/lib/db';
import { getCourseViewer, managesCourse } from '@/lib/course-access';
import { publicInstructorSelect } from '@/lib/public-course';
import LiveInstructorClient from './LiveInstructorClient';

export default async function InstructorLiveLessonPage({ params }: { params: Promise<{ courseId: string, lessonId: string }> }) {
  const resolvedParams = await params;
  const { courseId, lessonId } = resolvedParams;

  const user = await getCourseViewer();
  if (!user || !['INSTRUCTOR', 'ADMIN', 'OWNER'].includes(user.role)) {
    redirect('/login');
  }

  const course = await prisma.course.findUnique({
    where: { id: courseId },
    include: {
      instructor: { select: publicInstructorSelect }
    }
  });

  if (!course || !managesCourse(course, user)) {
    redirect('/instructor/courses');
  }

  const lesson = await prisma.lesson.findUnique({
    where: { id: lessonId, chapter: { courseId } }
  });

  if (!lesson || !lesson.isLive) {
    redirect(`/instructor/courses/${courseId}/chapters`);
  }

  return <LiveInstructorClient lesson={lesson} course={course} />;
}
