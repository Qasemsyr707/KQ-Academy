import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireRoleApi } from '@/lib/rbac';
import { isCourseStaff, SUBMITTABLE_STATUSES } from '@/lib/course-review';

const HEADERS = { 'Cache-Control': 'private, no-store' };

/**
 * Send a course to the administration for review: DRAFT or REJECTED -> PENDING.
 * The course's instructor (or staff) may do this; only an administrator then publishes it.
 * A PENDING course stays PENDING (repeat is harmless); a PUBLISHED one is not sent back.
 * The course stays hidden from students throughout (it is not PUBLISHED).
 */
export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { authorized, errorResponse, session } = await requireRoleApi(['ADMIN', 'INSTRUCTOR']);
    if (!authorized) return errorResponse;
    const courseId = (await params).id;
    const user = session.user as { id?: string; role?: string };
    const course = await prisma.course.findUnique({ where: { id: courseId }, select: { instructorId: true, status: true } });
    if (!course) return NextResponse.json({ error: 'الكورس غير موجود' }, { status: 404, headers: HEADERS });
    if (course.instructorId !== user.id && !isCourseStaff(user.role)) {
      return NextResponse.json({ error: 'غير مصرح لك بهذا الكورس' }, { status: 403, headers: HEADERS });
    }
    if (course.status === 'PENDING') {
      return NextResponse.json({ success: true, course: { id: courseId, status: 'PENDING' } }, { headers: HEADERS });
    }
    if (!SUBMITTABLE_STATUSES.includes(course.status)) {
      return NextResponse.json({ error: 'يمكن إرسال المسودات والكورسات المرفوضة فقط للمراجعة' }, { status: 409, headers: HEADERS });
    }
    // Conditional on the status read above: a concurrent moderation decision wins.
    const updated = await prisma.course.updateMany({ where: { id: courseId, status: course.status }, data: { status: 'PENDING' } });
    if (updated.count !== 1) return NextResponse.json({ error: 'تغيّرت حالة الكورس للتو؛ حدّث الصفحة' }, { status: 409, headers: HEADERS });
    return NextResponse.json({ success: true, course: { id: courseId, status: 'PENDING' } }, { headers: HEADERS });
  } catch (error) {
    console.error('Submit Course Error:', error);
    return NextResponse.json({ error: 'حدث خطأ أثناء إرسال الكورس للمراجعة' }, { status: 500, headers: HEADERS });
  }
}
