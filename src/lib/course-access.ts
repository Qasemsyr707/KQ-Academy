import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { requireRequestUser, RequestUserError } from '@/lib/request-user';

export interface CourseViewer { id: string; role: string }
interface CourseAccessRecord { id: string; instructorId: string; status: string }

/** Session/JWT role claims are not an authorization source. */
export async function getCourseViewer(req?: Request): Promise<CourseViewer | null> {
  if (req?.headers.has('authorization')) {
    try {
      const user = await requireRequestUser(req);
      return { id: user.id, role: user.role };
    } catch (error) {
      if (error instanceof RequestUserError && error.status === 401) return null;
      throw error;
    }
  }
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return null;
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, role: true, isBanned: true },
  });
  return user && !user.isBanned ? { id: user.id, role: user.role } : null;
}

export function managesCourse(course: Pick<CourseAccessRecord, 'instructorId'>, viewer?: CourseViewer | null): boolean {
  return !!viewer && (['ADMIN', 'OWNER'].includes(viewer.role)
    || (viewer.role === 'INSTRUCTOR' && course.instructorId === viewer.id));
}

/** Publication controls discovery; existing enrollment still grants course access. */
export async function getCourseAccess(course: CourseAccessRecord, viewer?: CourseViewer | null) {
  const isEnrolled = !!viewer && !!await prisma.enrollment.findUnique({
    where: { userId_courseId: { userId: viewer.id, courseId: course.id } },
    select: { id: true },
  });
  return { isEnrolled, canView: course.status === 'PUBLISHED' || managesCourse(course, viewer) || isEnrolled };
}
