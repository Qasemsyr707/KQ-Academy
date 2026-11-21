import { prisma } from '@/lib/db';
import { redirect, notFound } from 'next/navigation';
import CoursePlayerClient from './CoursePlayerClient';
import { protectCourseAttachmentLinks } from '@/lib/attachment-links';
import { protectLessonSource } from '@/lib/lesson-links';
import { isPublicLesson } from '@/lib/lesson-playback';
import { getCourseAccess, getCourseViewer, managesCourse } from '@/lib/course-access';
import { enrollInFreeCourse } from '@/lib/course-progress';
import { enrollmentDate, isCertificateRequirement, passingPercent } from '@/lib/course-exams';

export default async function CourseLearnPage(props: { params: Promise<{ courseId: string }>, searchParams: Promise<{ lessonId?: string }> }) {
  const viewer = await getCourseViewer();
  if (!viewer) redirect('/login');
  const { courseId } = await props.params;
  const searchParams = await props.searchParams;

  const course = await prisma.course.findUnique({
      where: { id: courseId },
      include: {
        attachments: true,
        // The final exam: a course-level quiz shown after the last chapter.
        finalExams: { where: { kind: 'FINAL' }, include: { questions: { select: { id: true, text: true, options: true, points: true } }, _count: { select: { questions: true } } } },
        chapters: {
          orderBy: { order: 'asc' },
          include: {
            attachments: true,
            lessons: { orderBy: { order: 'asc' }, include: { attachments: true } },
            quizzes: { orderBy: { createdAt: 'asc' }, include: { questions: { select: { id: true, text: true, options: true, points: true } }, _count: { select: { questions: true } } } },
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
  // Starting a free course enrols the student (all conditions rechecked on the server).
  if (viewer.role === 'STUDENT') await enrollInFreeCourse(viewer.id, course.id);
  const access = await getCourseAccess(course, viewer);
  if (!access.canView) notFound();
  const hasAccess = access.isEnrolled || await managesCourse(course, viewer) || isPublicLesson(course, false);
  if (!hasAccess && !course.chapters.some(chapter => isPublicLesson(course, chapter.isFree))) redirect(`/courses/${courseId}`);

  const manager = await managesCourse(course, viewer);
  const enrolledAt = await enrollmentDate(prisma, viewer.id, course.id);
  const allQuizIds = [...course.chapters.flatMap(c => c.quizzes.map(q => q.id)), ...course.finalExams.map(q => q.id)];
  const attemptCounts = new Map((await prisma.quizAttempt.groupBy({
    by: ['quizId'], where: { userId: viewer.id, quizId: { in: allQuizIds } }, _count: { _all: true },
  })).map(row => [row.quizId, row._count._all]));
  // File quizzes: the student's latest submission (pending grading, or graded with its result).
  const fileQuizIds = [...course.chapters.flatMap(c => c.quizzes), ...course.finalExams].filter(q => q.type === 'MANUAL_FILE').map(q => q.id);
  const lastFileAttempt = new Map<string, { status: string; score: number | null; passed: boolean; at: string }>();
  if (fileQuizIds.length) {
    for (const row of await prisma.quizAttempt.findMany({
      where: { userId: viewer.id, quizId: { in: fileQuizIds } }, orderBy: { createdAt: 'desc' },
      select: { quizId: true, status: true, score: true, passed: true, createdAt: true },
    })) if (!lastFileAttempt.has(row.quizId)) lastFileAttempt.set(row.quizId, { status: row.status, score: row.score, passed: row.passed, at: row.createdAt.toISOString() });
  }
  type PlayerQuiz = (typeof course.chapters)[number]['quizzes'][number] | (typeof course.finalExams)[number];
  // What the student sees of a quiz: questions without answers, its rules, and their attempts.
  const playerQuiz = (quiz: PlayerQuiz, readable: boolean) => {
    const meta = {
      id: quiz.id, title: quiz.title, type: quiz.type, kind: quiz.kind,
      isRequirement: isCertificateRequirement(quiz, enrolledAt ?? new Date()),
      requiredForCertificate: quiz.requiredForCertificate, passingPercent: passingPercent(quiz),
      maxAttempts: quiz.maxAttempts, attemptsUsed: attemptCounts.get(quiz.id) ?? 0, instructions: quiz.instructions,
      lastFileAttempt: lastFileAttempt.get(quiz.id) ?? null,
    };
    if (!readable) return meta;
    return { ...meta, fileUrl: quiz.fileUrl, totalMarks: quiz.scoringVersion >= 2 ? quiz.totalMarks : 100, questions: quiz.questions };
  };
  // Unpublished quizzes are hidden from students; the course's managers still see them.
  const visible = (quiz: PlayerQuiz) => manager || quiz.isPublished;

  // Sources stay on the server; the playback endpoint rechecks every request.
  const chapters = course.chapters.map(chapter => {
    const readable = hasAccess || isPublicLesson(course, chapter.isFree);
    return {
      ...chapter,
      isFree: isPublicLesson(course, chapter.isFree),
      attachments: readable ? chapter.attachments : [],
      lessons: chapter.lessons.map(lesson => ({ ...protectLessonSource(lesson, readable), attachments: readable ? lesson.attachments : [] })),
      quizzes: chapter.quizzes.filter(visible).map(quiz => playerQuiz(quiz, readable)),
    };
  });
  const finalExam = course.finalExams.find(visible);
  if (finalExam) {
    chapters.push({
      id: `final-exam-${finalExam.id}`, title: 'الاختبار النهائي', isFree: false, attachments: [], lessons: [],
      quizzes: [playerQuiz(finalExam, hasAccess)],
    } as unknown as (typeof chapters)[number]);
  }
  const { chapters: _chapters, finalExams: _finalExams, ...playerCourse } = course;
  return <CoursePlayerClient
    course={protectCourseAttachmentLinks({ ...playerCourse, attachments: hasAccess ? playerCourse.attachments : [] })}
    chapters={chapters.map(protectCourseAttachmentLinks)}
    hasAccess={hasAccess}
    initialLessonId={searchParams.lessonId}
    currentUserRole={viewer.role}
  />;
}
