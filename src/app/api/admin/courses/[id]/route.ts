import { NextResponse } from 'next/server';
import { requireRoleApi } from '@/lib/rbac';
import { prisma } from '@/lib/db';
import { assertTypeFitsCategory, TaxonomyError } from '@/lib/course-taxonomy';
import { invalidateCatalogueSearch } from '@/lib/course-search';

export async function PUT(req: Request, props: { params: Promise<{ id: string }> }) {
  try {
    const { authorized, errorResponse } = await requireRoleApi(['ADMIN']);
    if (!authorized) return errorResponse;

    const params = await props.params;
    const { status, title, price, priceSYP, instructorId, type, isFeatured, durationHours } = await req.json();
    const hours = Number(durationHours);
    if (type) await assertTypeFitsCategory(prisma, params.id, type);

    const course = await prisma.course.update({
      where: { id: params.id },
      data: { 
        status,
        ...(title && { title }),
        ...(price !== undefined && { price: parseFloat(price) || 0 }),
        ...(priceSYP !== undefined && { priceSYP: parseFloat(priceSYP) || 0 }),
        ...(instructorId && { instructorId }),
        ...(type && { type }),
        ...(isFeatured !== undefined && { isFeatured }),
        // '' or 0 clears the value; certificates then print no duration.
        ...(durationHours !== undefined && { durationHours: Number.isFinite(hours) && hours > 0 && hours <= 2000 ? hours : null })
      },
      include: {
        instructor: { select: { id: true, name: true, email: true } },
        _count: { select: { enrollments: true, chapters: true } }
      }
    });

    invalidateCatalogueSearch();
    return NextResponse.json({ message: 'تم تحديث الكورس بنجاح', course }, { status: 200 });
  } catch (error) {
    if (error instanceof TaxonomyError) return NextResponse.json({ error: error.message }, { status: error.status });
    console.error('Update Admin Course API Error:', error);
    return NextResponse.json({ error: 'حدث خطأ في الخادم' }, { status: 500 });
  }
}

export async function DELETE(req: Request, props: { params: Promise<{ id: string }> }) {
  try {
    const { authorized, errorResponse } = await requireRoleApi(['ADMIN']);
    if (!authorized) return errorResponse;

    const params = await props.params;

    // Delete all child records first to prevent foreign key constraint errors
    await prisma.$transaction([
      prisma.enrollment.deleteMany({ where: { courseId: params.id } }),
      prisma.payment.deleteMany({ where: { courseId: params.id } }),
      prisma.review.deleteMany({ where: { courseId: params.id } }),
      prisma.certificate.deleteMany({ where: { courseId: params.id } }),
      prisma.coupon.deleteMany({ where: { courseId: params.id } }),
      prisma.courseQuestion.deleteMany({ where: { courseId: params.id } }),
      prisma.careerPathCourse.deleteMany({ where: { courseId: params.id } }),
      prisma.bundleCourse.deleteMany({ where: { courseId: params.id } }),
      prisma.attachment.deleteMany({ where: { courseId: params.id } }),
      prisma.shortComment.deleteMany({ where: { short: { courseId: params.id } } }),
      prisma.short.deleteMany({ where: { courseId: params.id } }),
    ]);

    // Delete chapters and their nested relationships
    const chapters = await prisma.chapter.findMany({ where: { courseId: params.id }, select: { id: true } });
    const chapterIds = chapters.map((c: any) => c.id);

    if (chapterIds.length > 0) {
      await prisma.$transaction([
        prisma.attachment.deleteMany({ where: { chapterId: { in: chapterIds } } }),
        prisma.lesson.deleteMany({ where: { chapterId: { in: chapterIds } } }),
        prisma.question.deleteMany({ where: { quiz: { chapterId: { in: chapterIds } } } }),
        prisma.quizAttempt.deleteMany({ where: { quiz: { chapterId: { in: chapterIds } } } }),
        prisma.quiz.deleteMany({ where: { chapterId: { in: chapterIds } } }),
        prisma.chapter.deleteMany({ where: { courseId: params.id } }),
      ]);
    }

    // Finally delete the course
    await prisma.course.delete({
      where: { id: params.id }
    });
    // A deleted course must disappear from search and suggestions immediately.
    invalidateCatalogueSearch();

    return NextResponse.json({ message: 'تم حذف الكورس نهائياً' }, { status: 200 });
  } catch (error) {
    console.error('Delete Admin Course API Error:', error);
    return NextResponse.json({ error: 'حدث خطأ في الخادم' }, { status: 500 });
  }
}
