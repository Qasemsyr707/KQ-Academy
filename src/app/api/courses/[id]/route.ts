import { NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/db';
import { requireRoleApi } from '@/lib/rbac';
import { assertBunnyVideoReady, BunnyServerError } from '@/lib/bunny-upload-server';
import { resolveCourseTaxonomy, TAXONOMY_FIELDS, TaxonomyError } from '@/lib/course-taxonomy';
import { courseContentUpdate, CourseUpdateError } from '@/lib/course-update';
import { invalidateCatalogueSearch } from '@/lib/course-search';

const PRIVATE = { 'Cache-Control': 'private, no-store' };

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

    // The course's instructor, or an administrator/owner of the platform.
    const user = session.user as { id?: string; role?: string };
    if (course.instructorId !== user.id && !['ADMIN', 'OWNER'].includes(user.role ?? '')) {
      return NextResponse.json({ error: 'غير مصرح لك بتعديل هذا الكورس' }, { status: 403 });
    }

    // Everything is validated before anything is written: one refused field refuses the whole request.
    // - classification (category, tags, training type): active categories only, checked against the course's own type;
    // - content (title, description, cover, features, intro video, duration): allow-list in course-update.ts;
    // - anything else (price, status, featuring, ownership, rating, ...) is refused here.
    const contentBody: Record<string, unknown> = { ...body };
    for (const field of TAXONOMY_FIELDS) delete contentBody[field];
    const { includes, ...content } = courseContentUpdate(contentBody);
    const touchesTaxonomy = TAXONOMY_FIELDS.some(field => Object.hasOwn(body, field));
    const taxonomy = touchesTaxonomy
      ? await resolveCourseTaxonomy(prisma, body, { courseType: course.type, requireCategory: false })
      : {};
    if (content.previewVideoUrl) await assertBunnyVideoReady(content.previewVideoUrl);

    // Update the course
    const updatedCourse = await prisma.course.update({
      where: { id: id },
      data: {
        ...content, ...taxonomy,
        // A JSON column is cleared with DbNull, not null.
        ...(includes !== undefined && { includes: includes ?? Prisma.DbNull }),
      }
    });
    // Title, image or classification may have changed: search shows the new values at once.
    invalidateCatalogueSearch();

    return NextResponse.json(updatedCourse);
  } catch (error) {
    if (error instanceof CourseUpdateError || error instanceof TaxonomyError) {
      return NextResponse.json({ error: error.message }, { status: error.status, headers: PRIVATE });
    }
    if (error instanceof BunnyServerError) {
      return NextResponse.json({ error: error.message }, { status: error.status, headers: PRIVATE });
    }
    console.error('Update Course API Error:', error);
    return NextResponse.json({ error: 'حدث خطأ في الخادم' }, { status: 500 });
  }
}
