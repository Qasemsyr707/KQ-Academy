import type { Prisma, PrismaClient } from '@prisma/client';
import { prisma } from '@/lib/db';
import { notifyEnrollment } from '@/lib/notifications';
import { isPubliclyOffered } from '@/lib/catalogue-visibility';

type Db = Prisma.TransactionClient | PrismaClient;

export class ProgressError extends Error {
  constructor(public readonly status: number, message: string) { super(message); }
}

export interface CourseCompletion {
  /** Lessons the student completed, plus quizzes they passed. */
  completedItemIds: string[];
  totalItems: number;
  /** 0–100, the same "lessons + quizzes" rule the course player always showed. */
  progress: number;
  /** Every lesson completed and every quiz passed (and the course is not empty). */
  complete: boolean;
  /** When the last requirement was met (null until the course is complete). */
  completedAt: Date | null;
}

/**
 * The single server-side definition of course completion. It keeps the rule
 * the platform already used in the player and the certificate check: every
 * lesson is completed and every quiz has a passed attempt.
 */
export async function getCourseCompletion(db: Db, userId: string, courseId: string): Promise<CourseCompletion> {
  const chapters = await db.chapter.findMany({
    where: { courseId },
    select: { lessons: { select: { id: true } }, quizzes: { select: { id: true } } },
  });
  const lessonIds = chapters.flatMap(chapter => chapter.lessons.map(lesson => lesson.id));
  const quizIds = chapters.flatMap(chapter => chapter.quizzes.map(quiz => quiz.id));
  const totalItems = lessonIds.length + quizIds.length;
  if (totalItems === 0) return { completedItemIds: [], totalItems: 0, progress: 0, complete: false, completedAt: null };

  const [doneLessons, passedQuizzes] = await Promise.all([
    lessonIds.length ? db.lessonProgress.findMany({
      where: { userId, lessonId: { in: lessonIds } }, select: { lessonId: true, completedAt: true },
    }) : [],
    // The first passing attempt is when a quiz requirement was met.
    quizIds.length ? db.quizAttempt.findMany({
      where: { userId, quizId: { in: quizIds }, passed: true, status: 'COMPLETED' },
      select: { quizId: true, createdAt: true }, distinct: ['quizId'], orderBy: { createdAt: 'asc' },
    }) : [],
  ]);
  const completedItemIds = [...doneLessons.map(row => row.lessonId), ...passedQuizzes.map(row => row.quizId)];
  const complete = completedItemIds.length === totalItems;
  // Never show 100% unless every item is really done.
  const progress = complete ? 100 : Math.min(99, Math.round((completedItemIds.length / totalItems) * 100));
  const moments = [...doneLessons.map(row => row.completedAt.getTime()), ...passedQuizzes.map(row => row.createdAt.getTime())];
  const completedAt = complete ? new Date(Math.max(...moments)) : null;
  return { completedItemIds, totalItems, progress, complete, completedAt };
}

/** Store the recalculated percentage on the enrollment (dashboard, reminders). */
export async function syncEnrollmentProgress(db: Db, userId: string, courseId: string): Promise<CourseCompletion> {
  const completion = await getCourseCompletion(db, userId, courseId);
  await db.enrollment.updateMany({
    where: { userId, courseId, progress: { not: completion.progress } },
    data: { progress: completion.progress },
  });
  return completion;
}

/**
 * Join a free course. This is the only enrollment path outside checkout, and
 * every condition is checked here on the server: the course is published,
 * publicly offered and costs nothing in both currencies. Returns false when
 * the course is not free (the caller then leaves access rules unchanged).
 */
export async function enrollInFreeCourse(userId: string, courseId: string): Promise<boolean> {
  const course = await prisma.course.findUnique({
    where: { id: courseId },
    select: { id: true, title: true, type: true, status: true, price: true, priceSYP: true, instructorId: true },
  });
  if (!course || course.status !== 'PUBLISHED' || course.price !== 0 || course.priceSYP !== 0) return false;
  if (!isPubliclyOffered(course) || course.instructorId === userId) return false;
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { role: true, isBanned: true } });
  if (!user || user.isBanned || user.role !== 'STUDENT') return false;
  await prisma.$transaction(async tx => {
    const created = await tx.enrollment.createMany({ data: [{ userId, courseId }], skipDuplicates: true });
    if (created.count === 1) {
      await notifyEnrollment(tx, { userId, courseId, courseTitle: course.title, instructorId: course.instructorId, eventKey: `free:${courseId}` });
    }
  });
  return true;
}

/**
 * Record completed lessons for an ENROLLED student. A progress event is a
 * claim from the browser, so it can never create an enrollment, and it only
 * counts lessons that really belong to this course. Quizzes cannot be
 * completed here at all: they count only through a passed, server-graded
 * attempt. This is also the path used to upload progress an older browser
 * kept locally, so that import can grant nothing a student could not already
 * record by pressing "mark as completed" on each lesson.
 */
export async function completeLessons(userId: string, courseId: string, lessonIds: string[]): Promise<CourseCompletion> {
  const course = await prisma.course.findUnique({
    where: { id: courseId },
    select: { id: true },
  });
  if (!course) throw new ProgressError(404, 'الكورس غير موجود');

  const enrollment = await prisma.enrollment.findUnique({
    where: { userId_courseId: { userId, courseId } }, select: { id: true },
  });
  if (!enrollment) throw new ProgressError(403, 'يجب الاشتراك في الكورس لحفظ التقدّم');

  const wanted = [...new Set(lessonIds)].slice(0, 500);
  if (wanted.length > 0) {
    const valid = await prisma.lesson.findMany({
      where: { id: { in: wanted }, chapter: { courseId } }, select: { id: true },
    });
    if (valid.length > 0) {
      await prisma.lessonProgress.createMany({
        data: valid.map(lesson => ({ userId, lessonId: lesson.id, courseId })),
        skipDuplicates: true,
      });
    }
  }
  return syncEnrollmentProgress(prisma, userId, courseId);
}
