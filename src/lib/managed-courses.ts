import { prisma } from '@/lib/db';

/**
 * Which courses an already-authorized account may manage (quizzes, live sessions).
 *
 * The caller must have passed requireRequestUser / requireRolePage with the feature's
 * permission first, so an ADMIN here already holds it (COURSES or LIVE_CLASSES) and OWNER
 * always does. Instructors manage only the courses they teach.
 *
 * Every instructor page used `instructorId = me` for every role, so an OWNER or an ADMIN
 * opening the quiz manager saw zero courses whenever the platform's courses belong to an
 * instructor account, while the write APIs (quiz create, live create) already allowed staff
 * on any course. Pages and APIs now share this one rule.
 */
export function managedCourseWhere(user: { id: string; role?: string | null }) {
  if (user.role === 'OWNER' || user.role === 'ADMIN') return {};
  return { instructorId: user.id };
}

export const isStaff = (user: { role?: string | null }) => user.role === 'OWNER' || user.role === 'ADMIN';

/** Courses with their chapters, for course/chapter pickers. No student or payment data. */
export async function managedCoursesWithChapters(user: { id: string; role?: string | null }) {
  const courses = await prisma.course.findMany({
    where: managedCourseWhere(user),
    orderBy: { createdAt: 'desc' },
    take: 500,
    select: {
      id: true, title: true, status: true, instructorId: true,
      chapters: { orderBy: { order: 'asc' }, select: { id: true, title: true } },
    },
  });
  return courses.map(({ instructorId, ...course }) => ({ ...course, ownCourse: instructorId === user.id }));
}

export type ManagedCourse = Awaited<ReturnType<typeof managedCoursesWithChapters>>[number];
