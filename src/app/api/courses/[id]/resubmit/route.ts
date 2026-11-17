import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireRoleApi } from '@/lib/rbac';
import { invalidateCatalogueSearch } from '@/lib/course-search';

const HEADERS = { 'Cache-Control': 'private, no-store' };

/**
 * Send a REJECTED course back for review (status PENDING). The course's instructor
 * (or staff) may do this after editing it; only an administrator can then publish it.
 */
export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { authorized, errorResponse, session } = await requireRoleApi(['ADMIN', 'INSTRUCTOR']);
    if (!authorized) return errorResponse;
    const courseId = (await params).id;
    const user = session.user as { id?: string; role?: string };
    const course = await prisma.course.findUnique({ where: { id: courseId }, select: { instructorId: true, status: true } });
    if (!course) return NextResponse.json({ error: 'الكورس غير موجود' }, { status: 404, headers: HEADERS });
    if (course.instructorId !== user.id && !['ADMIN', 'OWNER'].includes(user.role ?? '')) {
      return NextResponse.json({ error: 'غير مصرح لك بهذا الكورس' }, { status: 403, headers: HEADERS });
    }
    if (course.status === 'PENDING') {
      return NextResponse.json({ success: true, course: { id: courseId, status: 'PENDING' } }, { headers: HEADERS });
    }
    if (course.status !== 'REJECTED') {
      return NextResponse.json({ error: 'إعادة التقديم متاحة للكورسات المرفوضة فقط' }, { status: 409, headers: HEADERS });
    }
    const updated = await prisma.course.updateMany({ where: { id: courseId, status: 'REJECTED' }, data: { status: 'PENDING' } });
    if (updated.count !== 1) return NextResponse.json({ error: 'تغيّرت حالة الكورس للتو؛ حدّث الصفحة' }, { status: 409, headers: HEADERS });
    invalidateCatalogueSearch();
    return NextResponse.json({ success: true, course: { id: courseId, status: 'PENDING' } }, { headers: HEADERS });
  } catch (error) {
    console.error('Resubmit Course Error:', error);
    return NextResponse.json({ error: 'حدث خطأ أثناء إعادة التقديم' }, { status: 500, headers: HEADERS });
  }
}
