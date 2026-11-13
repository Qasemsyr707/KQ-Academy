import type { Prisma, PrismaClient } from '@prisma/client';
import { prisma } from '@/lib/db';

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
  if (totalItems === 0) return { completedItemIds: [], totalItems: 0, progress: 0, complete: false };

  const [doneLessons, passedQuizzes] = await Promise.all([
    lessonIds.length ? db.lessonProgress.findMany({
      where: { userId, lessonId: { in: lessonIds } }, select: { lessonId: true },
    }) : [],
    quizIds.length ? db.quizAttempt.findMany({
      where: { userId, quizId: { in: quizIds }, passed: true, status: 'COMPLETED' },
      select: { quizId: true }, distinct: ['quizId'],
    }) : [],
  ]);
  const completedItemIds = [...doneLessons.map(row => row.lessonId), ...passedQuizzes.map(row => row.quizId)];
  const complete = completedItemIds.length === totalItems;
  // Never show 100% unless every item is really done.
  const progress = complete ? 100 : Math.min(99, Math.round((completedItemIds.length / totalItems) * 100));
  return { completedItemIds, totalItems, progress, complete };
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
 * Record completed lessons for an enrolled student. Lessons that do not belong
 * to the course are ignored, so a client cannot complete another course's
 * content. Free published courses enrol the student on their first lesson,
 * because they never pass through checkout.
 */
export async function completeLessons(userId: string, courseId: string, lessonIds: string[]): Promise<CourseCompletion> {
  const course = await prisma.course.findUnique({
    where: { id: courseId },
    select: { id: true, status: true, price: true, priceSYP: true },
  });
  if (!course) throw new ProgressError(404, 'الكورس غير موجود');

  let enrollment = await prisma.enrollment.findUnique({
    where: { userId_courseId: { userId, courseId } }, select: { id: true },
  });
  if (!enrollment) {
    const free = course.status === 'PUBLISHED' && course.price === 0 && course.priceSYP === 0;
    if (!free) throw new ProgressError(403, 'يجب الاشتراك في الكورس لحفظ التقدّم');
    enrollment = await prisma.enrollment.upsert({
      where: { userId_courseId: { userId, courseId } }, update: {}, create: { userId, courseId }, select: { id: true },
    });
  }

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
