import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireRoleApi } from '@/lib/rbac';
import { invalidateCatalogueSearch } from '@/lib/course-search';

const HEADERS = { 'Cache-Control': 'private, no-store' };

/**
 * Publish a course.
 * - Administrators and the owner may publish any course (moderation decision).
 * - The course's instructor may not override moderation: a course an administrator
 *   REJECTED or put under review (PENDING) stays as decided. A rejected course is
 *   sent back for review with POST /api/courses/[id]/resubmit instead.
 * Saving content is never blocked by the course status.
 */
export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { authorized, errorResponse, session } = await requireRoleApi(['ADMIN', 'INSTRUCTOR']);
    if (!authorized) return errorResponse;

    const courseId = (await params).id;
    const user = session.user as { id?: string; role?: string };
    const staff = ['ADMIN', 'OWNER'].includes(user.role ?? '');

    const course = await prisma.course.findUnique({ where: { id: courseId }, select: { instructorId: true, status: true } });
    if (!course) {
      return NextResponse.json({ error: 'الكورس غير موجود' }, { status: 404, headers: HEADERS });
    }
    if (course.instructorId !== user.id && !staff) {
      return NextResponse.json({ error: 'غير مصرح لك بنشر هذا الكورس' }, { status: 403, headers: HEADERS });
    }
    if (!staff && course.status === 'REJECTED') {
      return NextResponse.json({ error: 'رفضت الإدارة نشر هذا الكورس. عدّل المحتوى ثم أعد تقديمه للمراجعة.' }, { status: 409, headers: HEADERS });
    }
    if (!staff && course.status === 'PENDING') {
      return NextResponse.json({ error: 'الكورس قيد مراجعة الإدارة؛ سيُنشر بعد الموافقة.' }, { status: 409, headers: HEADERS });
    }
    if (course.status === 'PUBLISHED') {
      return NextResponse.json({ success: true, course: { id: courseId, status: 'PUBLISHED' } }, { headers: HEADERS });
    }

    // The status condition makes a concurrent moderation change win over this request.
    const updated = await prisma.course.updateMany({ where: { id: courseId, status: course.status }, data: { status: 'PUBLISHED' } });
    if (updated.count !== 1) {
      return NextResponse.json({ error: 'تغيّرت حالة الكورس للتو؛ حدّث الصفحة' }, { status: 409, headers: HEADERS });
    }
    invalidateCatalogueSearch();
    return NextResponse.json({ success: true, course: { id: courseId, status: 'PUBLISHED' } }, { headers: HEADERS });
  } catch (error) {
    console.error('Publish Course Error:', error);
    return NextResponse.json({ error: 'حدث خطأ أثناء نشر الكورس' }, { status: 500, headers: HEADERS });
  }
}
