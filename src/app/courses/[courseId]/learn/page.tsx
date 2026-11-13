import { prisma } from '@/lib/db';
import { redirect, notFound } from 'next/navigation';
import CoursePlayerClient from './CoursePlayerClient';
import { protectCourseAttachmentLinks } from '@/lib/attachment-links';
import { protectLessonSource } from '@/lib/lesson-links';
import { isPublicLesson } from '@/lib/lesson-playback';
import { getCourseAccess, getCourseViewer, managesCourse } from '@/lib/course-access';

export default async function CourseLearnPage(props: { params: Promise<{ courseId: string }>, searchParams: Promise<{ lessonId?: string }> }) {
  const viewer = await getCourseViewer();
  if (!viewer) redirect('/login');
  const { courseId } = await props.params;
  const searchParams = await props.searchParams;

  const course = await prisma.course.findUnique({
      where: { id: courseId },
      include: {
        attachments: true,
        chapters: {
          orderBy: { order: 'asc' },
          include: {
            attachments: true,
            lessons: { orderBy: { order: 'asc' }, include: { attachments: true } },
            quizzes: { include: { questions: { select: { id: true, text: true, options: true, points: true } } } },
          },
        },
        questions: {
          orderBy: { createdAt: 'desc' },
          include: {
            user: { select: { name: true, role: true } },
            answers: { orderBy: { createdAt: 'asc' }, include: { user: { select: { name: true, role: true } } } },
          },
        },
      },
    });
  if (!course) notFound();
  const access = await getCourseAccess(course, viewer);
  if (!access.canView) notFound();
  const hasAccess = access.isEnrolled || managesCourse(course, viewer) || isPublicLesson(course, false);
  if (!hasAccess && !course.chapters.some(chapter => isPublicLesson(course, chapter.isFree))) redirect(`/courses/${courseId}`);

  // Sources stay on the server; the playback endpoint rechecks every request.
  const chapters = course.chapters.map(chapter => {
    const readable = hasAccess || isPublicLesson(course, chapter.isFree);
    return {
      ...chapter,
      isFree: isPublicLesson(course, chapter.isFree),
      attachments: readable ? chapter.attachments : [],
      lessons: chapter.lessons.map(lesson => ({ ...protectLessonSource(lesson, readable), attachments: readable ? lesson.attachments : [] })),
      quizzes: chapter.quizzes.map(quiz => readable ? quiz : { id: quiz.id, title: quiz.title, type: quiz.type }),
    };
  });
  const { chapters: _chapters, ...playerCourse } = course;
  return <CoursePlayerClient
    course={protectCourseAttachmentLinks({ ...playerCourse, attachments: hasAccess ? playerCourse.attachments : [] })}
    chapters={chapters.map(protectCourseAttachmentLinks)}
    hasAccess={hasAccess}
    initialLessonId={searchParams.lessonId}
    currentUserRole={viewer.role}
  />;
}
