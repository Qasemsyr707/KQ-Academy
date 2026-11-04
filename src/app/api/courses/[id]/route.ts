import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireRoleApi } from '@/lib/rbac';
import { assertBunnyVideoReady, BunnyServerError } from '@/lib/bunny-upload-server';

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

    if (course.instructorId !== (session.user as any).id && (session.user as any).role !== 'ADMIN') {
      return NextResponse.json({ error: 'غير مصرح لك بتعديل هذا الكورس' }, { status: 403 });
    }

    if (body.previewVideoUrl) await assertBunnyVideoReady(body.previewVideoUrl);

    // Update the course
    const updatedCourse = await prisma.course.update({
      where: { id: id },
      data: body
    });

    return NextResponse.json(updatedCourse);
  } catch (error) {
    if (error instanceof BunnyServerError) {
      return NextResponse.json({ error: error.message }, { status: error.status, headers: { 'Cache-Control': 'private, no-store' } });
    }
    console.error('Update Course API Error:', error);
    return NextResponse.json({ error: 'حدث خطأ في الخادم' }, { status: 500 });
  }
}
