import { NextResponse } from 'next/server';
import { requireRoleApi } from '@/lib/rbac';
import { prisma } from '@/lib/db';
import { assertTypeFitsCategory, TaxonomyError } from '@/lib/course-taxonomy';
import { invalidateCatalogueSearch } from '@/lib/course-search';
import { CoursePolicyError, isCourseStatus, parseCoursePrice, publishPrices } from '@/lib/course-review';

export async function PUT(req: Request, props: { params: Promise<{ id: string }> }) {
  try {
    const { authorized, errorResponse } = await requireRoleApi(['ADMIN'], 'COURSES');
    if (!authorized) return errorResponse;

    const params = await props.params;
    const body = await req.json();
    if (!body || typeof body !== 'object' || Array.isArray(body)) throw new CoursePolicyError(400, 'بيانات غير صالحة');
    const { status, title, instructorId, type, isFeatured, durationHours, reason } = body;
    if (status !== undefined && !isCourseStatus(status)) throw new CoursePolicyError(400, 'حالة الكورس غير صالحة');
    const current = await prisma.course.findUnique({ where: { id: params.id }, select: { status: true } });
    if (!current) return NextResponse.json({ error: 'الكورس غير موجود' }, { status: 404 });
    // Publishing is an approval of the price too: both prices must be stated in this request
    // (the admin form sends them). An empty or invalid price is never turned into "free".
    const prices = status === 'PUBLISHED' && current.status !== 'PUBLISHED'
      ? publishPrices(body)
      : { price: parseCoursePrice(body.price, 'السعر بالدولار'), priceSYP: parseCoursePrice(body.priceSYP, 'السعر بالليرة السورية') };
    const hours = Number(durationHours);
    if (type) await assertTypeFitsCategory(prisma, params.id, type);

    if (status !== undefined) {
      const publishing = await requireRoleApi(['ADMIN'], 'COURSE_PUBLISHING');
      if (!publishing.authorized) return publishing.errorResponse;
    }
    const course = await prisma.course.update({
      where: { id: params.id },
      data: {
        status,
        ...(title && { title }),
        ...(prices.price !== undefined && { price: prices.price }),
        ...(prices.priceSYP !== undefined && { priceSYP: prices.priceSYP }),
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
    const notifyId = course.instructor?.id ?? course.instructorId;
    if (notifyId && status !== undefined && status !== current.status && status !== 'PENDING') {
      const why = typeof reason === 'string' && reason.trim() ? ` السبب: ${reason.trim().slice(0, 500)}` : '';
      await prisma.notification.create({ data: {
        userId: notifyId,
        title: status === 'PUBLISHED' ? 'تمت الموافقة على نشر كورسك' : 'لم تتم الموافقة على نشر كورسك',
        message: status === 'PUBLISHED' ? `أصبح «${course.title}» متاحاً للطلاب.` : `«${course.title}» غير منشور حالياً.${why}`,
        link: '/instructor/courses',
      } }).catch(error => console.error('[admin-courses] notify instructor', error));
    }
    return NextResponse.json({ message: 'تم تحديث الكورس بنجاح', course }, { status: 200 });
  } catch (error) {
    if (error instanceof TaxonomyError || error instanceof CoursePolicyError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    if (error instanceof SyntaxError) return NextResponse.json({ error: 'بيانات غير صالحة' }, { status: 400 });
    console.error('Update Admin Course API Error:', error);
    return NextResponse.json({ error: 'حدث خطأ في الخادم' }, { status: 500 });
  }
}

export async function DELETE(req: Request, props: { params: Promise<{ id: string }> }) {
  try {
    const { authorized, errorResponse } = await requireRoleApi(['ADMIN'], 'COURSES');
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
