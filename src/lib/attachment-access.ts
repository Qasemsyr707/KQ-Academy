import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

export interface AttachmentUser { id: string; role?: string }
export interface AttachmentTarget { lessonId?: string | null; chapterId?: string | null; courseId?: string | null }
export interface AttachmentCourseAccess {
  courseId: string;
  instructorId: string;
  status: string;
  chapterId?: string;
  isFree: boolean;
}

export class AttachmentAccessError extends Error {
  constructor(public readonly status: number, message: string) { super(message); }
}

export async function attachmentSessionUser(): Promise<AttachmentUser> {
  const session = await getServerSession(authOptions);
  const user = session?.user as Partial<AttachmentUser> | undefined;
  if (typeof user?.id !== 'string' || !user.id) throw new AttachmentAccessError(401, 'سجّل الدخول لفتح هذا المرفق');
  return { id: user.id, role: typeof user.role === 'string' ? user.role : undefined };
}

export function isAttachmentId(value: unknown): value is string {
  return typeof value === 'string' && /^c[a-z0-9]{24}$/i.test(value);
}

const courseSelect = { id: true, instructorId: true, status: true } as const;
const chapterSelect = { id: true, courseId: true, isFree: true, course: { select: courseSelect } } as const;

/** Resolve the actual relations, including historical rows with multiple target
 * columns. A supplied courseId can never override a lesson's real course. */
export async function resolveAttachmentTarget(target: AttachmentTarget): Promise<AttachmentCourseAccess> {
  const ids = [target.lessonId, target.chapterId, target.courseId].filter(Boolean);
  if (!ids.length || ids.some(value => typeof value !== 'string' || !isAttachmentId(value))) {
    throw new AttachmentAccessError(400, 'المرفق غير مرتبط بدرس أو فصل أو كورس صالح');
  }
  const [lesson, chapter, course] = await Promise.all([
    target.lessonId ? prisma.lesson.findUnique({ where: { id: target.lessonId }, select: { chapter: { select: chapterSelect } } }) : null,
    target.chapterId ? prisma.chapter.findUnique({ where: { id: target.chapterId }, select: chapterSelect }) : null,
    target.courseId ? prisma.course.findUnique({ where: { id: target.courseId }, select: courseSelect }) : null,
  ]);
  if ((target.lessonId && !lesson) || (target.chapterId && !chapter) || (target.courseId && !course)) {
    throw new AttachmentAccessError(404, 'الدرس أو الفصل أو الكورس المرتبط بالمرفق غير موجود');
  }
  const lessonChapter = lesson?.chapter;
  const courses = [lessonChapter?.course, chapter?.course, course].filter(value => value !== undefined && value !== null);
  const resolvedCourse = courses[0];
  if (!resolvedCourse || courses.some(value => value.id !== resolvedCourse.id)
    || (lessonChapter && chapter && lessonChapter.id !== chapter.id)) {
    throw new AttachmentAccessError(409, 'ارتباطات المرفق غير متطابقة؛ يرجى مراجعتها من لوحة المدرّب');
  }
  const resolvedChapter = lessonChapter ?? chapter;
  return { courseId: resolvedCourse.id, instructorId: resolvedCourse.instructorId, status: resolvedCourse.status,
    chapterId: resolvedChapter?.id,
    // A course-level association remains course-level even if an old row also
    // mentions a free chapter. It must not bypass course enrollment.
    isFree: !target.courseId && resolvedChapter?.isFree === true };
}

export async function assertAttachmentReadAccess(user: AttachmentUser, target: AttachmentCourseAccess): Promise<void> {
  if (target.instructorId === user.id || ['ADMIN', 'OWNER'].includes(user.role ?? '')) return;
  const enrollment = await prisma.enrollment.findUnique({
    where: { userId_courseId: { userId: user.id, courseId: target.courseId } }, select: { id: true },
  });
  if (enrollment || (target.isFree && target.status === 'PUBLISHED')) return;
  throw new AttachmentAccessError(403, 'هذا المرفق متاح للمشتركين في الكورس فقط');
}

export async function resolveAttachmentAccess(user: AttachmentUser, target: AttachmentTarget): Promise<AttachmentCourseAccess> {
  const resolved = await resolveAttachmentTarget(target);
  await assertAttachmentReadAccess(user, resolved);
  return resolved;
}

/** Creation requires exactly one target and current permission to edit it. */
export async function assertAttachmentTarget(user: AttachmentUser, target: AttachmentTarget): Promise<AttachmentCourseAccess> {
  if ([target.lessonId, target.chapterId, target.courseId].filter(Boolean).length !== 1) {
    throw new AttachmentAccessError(400, 'يجب تحديد ارتباط واحد للمرفق');
  }
  if (!['INSTRUCTOR', 'ADMIN', 'OWNER'].includes(user.role ?? '')) throw new AttachmentAccessError(403, 'إضافة المرفقات متاحة للمدرّب المخوّل فقط');
  const resolved = await resolveAttachmentTarget(target);
  if (resolved.instructorId !== user.id && !['ADMIN', 'OWNER'].includes(user.role ?? '')) {
    throw new AttachmentAccessError(403, 'لا تملك صلاحية تعديل هذا الكورس');
  }
  return resolved;
}
