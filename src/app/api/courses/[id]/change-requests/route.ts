import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireRequestUser, RequestUserError } from '@/lib/request-user';
import { assertBunnyVideoReady, BunnyServerError } from '@/lib/bunny-upload-server';
import { CourseUpdateError } from '@/lib/course-update';
import { LIVE_SELECT, notifyCourseReviewers, parseChangeRequest, type ChangeField } from '@/lib/course-change-request';
import { hasPermission } from '@/lib/permission-check';

const headers = { 'Cache-Control': 'private, no-store', Vary: 'Cookie, Authorization' };
const REQUEST_SELECT = { id: true, status: true, changes: true, previous: true, reason: true, reviewedAt: true, createdAt: true, updatedAt: true } as const;

function fail(error: unknown) {
  if (error instanceof RequestUserError || error instanceof CourseUpdateError || error instanceof BunnyServerError) {
    return NextResponse.json({ error: error.message }, { status: error.status, headers });
  }
  if (error instanceof SyntaxError) return NextResponse.json({ error: 'بيانات غير صالحة' }, { status: 400, headers });
  console.error('[course-change-requests]', error);
  return NextResponse.json({ error: 'حدث خطأ في الخادم' }, { status: 500, headers });
}

async function loadCourse(id: string) {
  const course = await prisma.course.findUnique({ where: { id }, select: { id: true, instructorId: true, status: true, ...LIVE_SELECT } });
  if (!course) throw new RequestUserError(404, 'الكورس غير موجود');
  return course;
}

/** The course's instructor, or a reviewer, sees the request history of a course. */
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireRequestUser(req, ['INSTRUCTOR', 'ADMIN', 'OWNER']);
    const course = await loadCourse((await params).id);
    const reviewer = user.role === 'OWNER' || (user.role === 'ADMIN' && await hasPermission(user.id, 'COURSE_PUBLISHING'));
    if (course.instructorId !== user.id && !reviewer) throw new RequestUserError(404, 'الكورس غير موجود');
    const requests = await prisma.courseChangeRequest.findMany({ where: { courseId: course.id }, orderBy: { createdAt: 'desc' }, take: 20, select: REQUEST_SELECT });
    return NextResponse.json({ requests }, { headers });
  } catch (error) { return fail(error); }
}

/** Submit (or replace the open) change request. Live course values are never written here. */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireRequestUser(req, ['INSTRUCTOR', 'ADMIN', 'OWNER']);
    const course = await loadCourse((await params).id);
    if (course.instructorId !== user.id) throw new RequestUserError(403, 'يمكن لمدرب الكورس فقط طلب تعديله');
    const body: unknown = await req.json();
    if (!body || typeof body !== 'object' || Array.isArray(body)) throw new RequestUserError(400, 'بيانات غير صالحة');
    const { changes, previous } = parseChangeRequest(body as Record<string, unknown>, course as unknown as Record<ChangeField, unknown>);
    if (changes.previewVideoUrl) await assertBunnyVideoReady(changes.previewVideoUrl);
    const saved = await prisma.$transaction(async tx => {
      const open = await tx.courseChangeRequest.findFirst({ where: { courseId: course.id, status: 'PENDING' }, select: { id: true } });
      if (open) {
        // Replacing is conditional on the request still being open, so a concurrent decision is never overwritten.
        const updated = await tx.courseChangeRequest.updateMany({ where: { id: open.id, status: 'PENDING' }, data: { changes: changes as object, previous: previous as object } });
        if (updated.count !== 1) throw new RequestUserError(409, 'تمت مراجعة الطلب السابق للتو، أعد تحميل الصفحة');
        return tx.courseChangeRequest.findUniqueOrThrow({ where: { id: open.id }, select: REQUEST_SELECT });
      }
      return tx.courseChangeRequest.create({ data: { courseId: course.id, instructorId: user.id, changes: changes as object, previous: previous as object }, select: REQUEST_SELECT });
    });
    await notifyCourseReviewers('طلب تعديل كورس', `أرسل ${user.name} طلب تعديل على «${course.title}»`, '/admin/course-requests').catch(e => console.error('[course-change-requests] notify', e));
    return NextResponse.json({ request: saved, message: 'أُرسل الطلب إلى الإدارة، وسيبقى الكورس كما هو حتى الموافقة' }, { status: 201, headers });
  } catch (error) {
    if ((error as { code?: string })?.code === 'P2002') return NextResponse.json({ error: 'يوجد طلب مفتوح لهذا الكورس، أعد المحاولة' }, { status: 409, headers });
    return fail(error);
  }
}

/** The instructor withdraws the open request. */
export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireRequestUser(req, ['INSTRUCTOR', 'ADMIN', 'OWNER']);
    const course = await loadCourse((await params).id);
    if (course.instructorId !== user.id) throw new RequestUserError(403, 'غير مصرح');
    const updated = await prisma.courseChangeRequest.updateMany({ where: { courseId: course.id, status: 'PENDING' }, data: { status: 'CANCELLED' } });
    if (updated.count === 0) throw new RequestUserError(404, 'لا يوجد طلب مفتوح');
    return NextResponse.json({ success: true }, { headers });
  } catch (error) { return fail(error); }
}
