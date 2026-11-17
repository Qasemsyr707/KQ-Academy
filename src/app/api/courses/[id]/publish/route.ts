import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireRoleApi } from '@/lib/rbac';
import { invalidateCatalogueSearch } from '@/lib/course-search';
import { CoursePolicyError, isCourseStaff, publishPrices } from '@/lib/course-review';

const HEADERS = { 'Cache-Control': 'private, no-store' };

/**
 * Publish a course: an administration decision (see course-review.ts).
 * - ADMIN / OWNER only. An instructor sends the course for review instead
 *   (POST /api/courses/[id]/submit); they cannot publish any course, theirs included.
 * - The request must state the approved prices: { price, priceSYP } (0 = free, explicitly).
 *   The instructor's proposed price is never published implicitly.
 */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { authorized, errorResponse, session } = await requireRoleApi(['ADMIN', 'INSTRUCTOR']);
    if (!authorized) return errorResponse;

    const courseId = (await params).id;
    const user = session.user as { id?: string; role?: string };

    const course = await prisma.course.findUnique({ where: { id: courseId }, select: { instructorId: true, status: true } });
    if (!course) {
      return NextResponse.json({ error: 'الكورس غير موجود' }, { status: 404, headers: HEADERS });
    }
    if (!isCourseStaff(user.role)) {
      const own = course.instructorId === user.id;
      return NextResponse.json({
        error: own ? 'النشر من صلاحيات الإدارة. أرسل الكورس للمراجعة ليُنشر بعد الموافقة.' : 'غير مصرح لك بنشر هذا الكورس',
      }, { status: 403, headers: HEADERS });
    }
    if (course.status === 'PUBLISHED') {
      return NextResponse.json({ success: true, course: { id: courseId, status: 'PUBLISHED' } }, { headers: HEADERS });
    }

    const body = await req.json().catch(() => null);
    if (!body || typeof body !== 'object' || Array.isArray(body)) throw new CoursePolicyError(400, 'حدّد السعر المعتمد قبل النشر');
    const prices = publishPrices(body as Record<string, unknown>);

    // The status condition makes a concurrent moderation change win over this request.
    const updated = await prisma.course.updateMany({
      where: { id: courseId, status: course.status },
      data: { status: 'PUBLISHED', price: prices.price, priceSYP: prices.priceSYP },
    });
    if (updated.count !== 1) {
      return NextResponse.json({ error: 'تغيّرت حالة الكورس للتو؛ حدّث الصفحة' }, { status: 409, headers: HEADERS });
    }
    invalidateCatalogueSearch();
    return NextResponse.json({ success: true, course: { id: courseId, status: 'PUBLISHED', ...prices } }, { headers: HEADERS });
  } catch (error) {
    if (error instanceof CoursePolicyError) return NextResponse.json({ error: error.message }, { status: error.status, headers: HEADERS });
    console.error('Publish Course Error:', error);
    return NextResponse.json({ error: 'حدث خطأ أثناء نشر الكورس' }, { status: 500, headers: HEADERS });
  }
}
