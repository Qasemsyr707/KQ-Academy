import { hasPermission } from '@/lib/permission-check';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { readAuthorization, requireRequestUser, RequestUserError } from '@/lib/request-user';
import { isPubliclyOffered } from '@/lib/catalogue-visibility';

export interface CourseViewer { id: string; role: string }
interface CourseAccessRecord { id: string; instructorId: string; status: string; type?: string | null; category?: string | null }

/** Session/JWT role claims are not an authorization source. */
export async function getCourseViewer(req?: Request): Promise<CourseViewer | null> {
  // Only an application credential (mobile Bearer) replaces the session cookie.
  if (req && readAuthorization(req.headers).kind !== 'none') {
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

export async function managesCourse(course: Pick<CourseAccessRecord, 'instructorId'>, viewer?: CourseViewer | null): Promise<boolean> {
  return !!viewer && ((['ADMIN', 'OWNER'].includes(viewer.role ?? '') && await hasPermission(viewer.id, 'COURSES'))
    || (viewer.role === 'INSTRUCTOR' && course.instructorId === viewer.id));
}

/** Publication and the curriculum switch control discovery; an existing enrollment still grants access. */
export async function getCourseAccess(course: CourseAccessRecord, viewer?: CourseViewer | null) {
  const isEnrolled = !!viewer && !!await prisma.enrollment.findUnique({
    where: { userId_courseId: { userId: viewer.id, courseId: course.id } },
    select: { id: true },
  });
  return { isEnrolled, canView: isPubliclyOffered(course) || await managesCourse(course, viewer) || isEnrolled };
}
