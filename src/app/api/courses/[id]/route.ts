import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireRoleApi } from '@/lib/rbac';
import { assertBunnyVideoReady, BunnyServerError } from '@/lib/bunny-upload-server';
import { resolveCourseTaxonomy, TAXONOMY_FIELDS, TaxonomyError } from '@/lib/course-taxonomy';
import { invalidateCatalogueSearch } from '@/lib/course-search';

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { authorized, errorResponse, session } = await requireRoleApi(['ADMIN', 'INSTRUCTOR']);
    if (!authorized) return errorResponse;

    const body = await req.json();
    // Documents must be linked through their ownership-checked endpoints. Raw
    // nested Prisma writes would otherwise bypass attachment/lesson guards.
    const relations = ['instructor', 'enrollments', 'chapters', 'payments', 'reviews', 'certificates', 'shorts',
      'coupons', 'questions', 'careerPaths', 'bundles', 'attachments', 'liveClasses', 'taxonomy'];
    if (!body || typeof body !== 'object' || Array.isArray(body) || relations.some(key => Object.hasOwn(body, key))) {
      return NextResponse.json({ error: 'أضف الدروس والمرفقات عبر واجهاتها المخصصة للتحقق من ملكية الملفات' }, { status: 400 });
    }
    const resolvedParams = await params;
    const { id } = resolvedParams;

    // Verify ownership
    const course = await prisma.course.findUnique({
      where: { id: id },
      select: { instructorId: true, type: true }
    });

    if (!course) {
      return NextResponse.json({ error: 'الكورس غير موجود' }, { status: 404 });
    }

    if (course.instructorId !== (session.user as any).id && (session.user as any).role !== 'ADMIN') {
      return NextResponse.json({ error: 'غير مصرح لك بتعديل هذا الكورس' }, { status: 403 });
    }

    if (body.previewVideoUrl) await assertBunnyVideoReady(body.previewVideoUrl);

    // Classification fields are validated (active category, tags, training type);
    // they never reach the database as sent.
    const touchesTaxonomy = TAXONOMY_FIELDS.some(field => Object.hasOwn(body, field));
    const taxonomy = touchesTaxonomy
      ? await resolveCourseTaxonomy(prisma, body, { courseType: typeof body.type === 'string' ? body.type : course.type, requireCategory: false })
      : {};
    const data = { ...body };
    for (const field of TAXONOMY_FIELDS) delete data[field];

    // Update the course
    const updatedCourse = await prisma.course.update({
      where: { id: id },
      data: { ...data, ...taxonomy }
    });
    // Title, image or classification may have changed: search shows the new values at once.
    invalidateCatalogueSearch();

    return NextResponse.json(updatedCourse);
  } catch (error) {
    if (error instanceof TaxonomyError) {
      return NextResponse.json({ error: error.message }, { status: error.status, headers: { 'Cache-Control': 'private, no-store' } });
    }
    if (error instanceof BunnyServerError) {
      return NextResponse.json({ error: error.message }, { status: error.status, headers: { 'Cache-Control': 'private, no-store' } });
    }
    console.error('Update Course API Error:', error);
    return NextResponse.json({ error: 'حدث خطأ في الخادم' }, { status: 500 });
  }
}
