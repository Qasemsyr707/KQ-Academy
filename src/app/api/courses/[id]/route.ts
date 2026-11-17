import { NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/db';
import { requireRoleApi } from '@/lib/rbac';
import { assertBunnyVideoReady, BunnyServerError } from '@/lib/bunny-upload-server';
import { courseContentUpdate, CourseUpdateError } from '@/lib/course-update';

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { authorized, errorResponse, session } = await requireRoleApi(['ADMIN', 'INSTRUCTOR']);
    if (!authorized) return errorResponse;

    const body = await req.json();
    // Documents must be linked through their ownership-checked endpoints. Raw
    // nested Prisma writes would otherwise bypass attachment/lesson guards.
    const relations = ['instructor', 'enrollments', 'chapters', 'payments', 'reviews', 'certificates', 'shorts',
      'coupons', 'questions', 'careerPaths', 'bundles', 'attachments', 'liveClasses'];
    if (!body || typeof body !== 'object' || Array.isArray(body) || relations.some(key => Object.hasOwn(body, key))) {
      return NextResponse.json({ error: 'أضف الدروس والمرفقات عبر واجهاتها المخصصة للتحقق من ملكية الملفات' }, { status: 400 });
    }
    const resolvedParams = await params;
    const { id } = resolvedParams;

    // Verify ownership
    const course = await prisma.course.findUnique({
      where: { id: id },
      select: { instructorId: true }
    });

    if (!course) {
      return NextResponse.json({ error: 'الكورس غير موجود' }, { status: 404 });
    }

    // The course's instructor, or an administrator/owner of the platform.
    const user = session.user as { id?: string; role?: string };
    if (course.instructorId !== user.id && !['ADMIN', 'OWNER'].includes(user.role ?? '')) {
      return NextResponse.json({ error: 'غير مصرح لك بتعديل هذا الكورس' }, { status: 403 });
    }

    // Content fields only, validated; price, status, type, featuring and ownership
    // are changed through their own endpoints (see course-update.ts).
    const { includes, ...data } = courseContentUpdate(body);
    if (data.previewVideoUrl) await assertBunnyVideoReady(data.previewVideoUrl);

    // Update the course
    const updatedCourse = await prisma.course.update({
      where: { id: id },
      // A JSON column is cleared with DbNull, not null.
      data: { ...data, ...(includes !== undefined && { includes: includes ?? Prisma.DbNull }) }
    });

    return NextResponse.json(updatedCourse);
  } catch (error) {
    if (error instanceof CourseUpdateError) {
      return NextResponse.json({ error: error.message }, { status: error.status, headers: { 'Cache-Control': 'private, no-store' } });
    }
    if (error instanceof BunnyServerError) {
      return NextResponse.json({ error: error.message }, { status: error.status, headers: { 'Cache-Control': 'private, no-store' } });
    }
    console.error('Update Course API Error:', error);
    return NextResponse.json({ error: 'حدث خطأ في الخادم' }, { status: 500 });
  }
}
