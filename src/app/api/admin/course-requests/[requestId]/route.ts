import { NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/db';
import { requireRequestUser, RequestUserError } from '@/lib/request-user';
import { assertBunnyVideoReady, BunnyServerError } from '@/lib/bunny-upload-server';
import { resolveCourseTaxonomy, TaxonomyError } from '@/lib/course-taxonomy';
import { invalidateCatalogueSearch } from '@/lib/course-search';
import { FIELD_LABELS, LIVE_SELECT, stillMatches, type ChangeField, type CourseChanges } from '@/lib/course-change-request';

const headers = { 'Cache-Control': 'private, no-store', Vary: 'Cookie, Authorization' };

/**
 * Approve or reject an instructor's course change request.
 * Approval applies exactly the requested fields in one transaction; rejection leaves the course untouched.
 * The request row is locked and must still be PENDING, so a repeated or concurrent decision cannot apply twice.
 */
export async function POST(req: Request, { params }: { params: Promise<{ requestId: string }> }) {
  try {
    const reviewer = await requireRequestUser(req, ['ADMIN', 'OWNER'], 'COURSE_PUBLISHING');
    const { requestId } = await params;
    const body: unknown = await req.json();
    if (!body || typeof body !== 'object' || Array.isArray(body)) throw new RequestUserError(400, 'بيانات غير صالحة');
    const { decision, reason } = body as Record<string, unknown>;
    if (decision !== 'APPROVE' && decision !== 'REJECT') throw new RequestUserError(400, 'القرار غير صالح');
    if (reason !== undefined && reason !== null && (typeof reason !== 'string' || reason.length > 1000)) throw new RequestUserError(400, 'السبب غير صالح');
    const why = typeof reason === 'string' && reason.trim() ? reason.trim() : null;
    if (decision === 'REJECT' && !why) throw new RequestUserError(400, 'اكتب سبب الرفض ليظهر للمدرب');

    const pending = await prisma.courseChangeRequest.findUnique({ where: { id: requestId }, select: { changes: true } });
    if (!pending) throw new RequestUserError(404, 'الطلب غير موجود');
    const proposed = pending.changes as CourseChanges;
    // Bunny is checked before the transaction: a network call must not hold row locks.
    if (decision === 'APPROVE' && proposed.previewVideoUrl) await assertBunnyVideoReady(proposed.previewVideoUrl);

    const result = await prisma.$transaction(async tx => {
      const locked = await tx.$queryRaw<{ id: string }[]>`SELECT id FROM "CourseChangeRequest" WHERE id = ${requestId} FOR UPDATE`;
      if (!locked.length) throw new RequestUserError(404, 'الطلب غير موجود');
      const request = await tx.courseChangeRequest.findUniqueOrThrow({ where: { id: requestId } });
      if (request.status !== 'PENDING') throw new RequestUserError(409, 'تمت مراجعة هذا الطلب مسبقاً');
      if (request.instructorId === reviewer.id) throw new RequestUserError(403, 'لا يمكنك مراجعة طلبك الخاص');
      await tx.$queryRaw`SELECT id FROM "Course" WHERE id = ${request.courseId} FOR UPDATE`;
      const course = await tx.course.findUnique({ where: { id: request.courseId }, select: { id: true, type: true, ...LIVE_SELECT } });
      if (!course) throw new RequestUserError(404, 'الكورس غير موجود');
      const changes = request.changes as CourseChanges;
      if (decision === 'APPROVE') {
        if (!stillMatches(request.previous as CourseChanges, course)) {
          throw new RequestUserError(409, 'تغيّرت قيم الكورس منذ إرسال الطلب. ارفض الطلب واطلب من المدرب إرساله من جديد');
        }
        const data: Prisma.CourseUpdateInput = {};
        for (const [key, value] of Object.entries(changes) as [ChangeField, unknown][]) {
          if (key === 'category') Object.assign(data, await resolveCourseTaxonomy(tx, { category: value }, { courseType: course.type, requireCategory: true }));
          else if (key === 'includes') data.includes = value === null ? Prisma.DbNull : value as Prisma.InputJsonValue;
          else (data as Record<string, unknown>)[key] = value;
        }
        await tx.course.update({ where: { id: course.id }, data });
      }
      await tx.courseChangeRequest.update({ where: { id: requestId }, data: {
        status: decision === 'APPROVE' ? 'APPROVED' : 'REJECTED', reason: why, reviewerId: reviewer.id, reviewedAt: new Date(),
      } });
      const fields = Object.keys(changes).map(key => FIELD_LABELS[key as ChangeField] ?? key).join('، ');
      await tx.notification.create({ data: {
        userId: request.instructorId,
        title: decision === 'APPROVE' ? 'تمت الموافقة على تعديل الكورس' : 'رُفض طلب تعديل الكورس',
        message: decision === 'APPROVE' ? `طُبّقت تعديلاتك على «${course.title}»: ${fields}` : `لم تُطبَّق تعديلاتك على «${course.title}». السبب: ${why}`,
        link: `/instructor/courses/${course.id}/edit`,
      } });
      return { courseId: course.id };
    });
    if (decision === 'APPROVE') invalidateCatalogueSearch();
    console.info('[course-requests] decision', { requestId, decision, by: reviewer.id });
    return NextResponse.json({ success: true, ...result }, { headers });
  } catch (error) {
    if (error instanceof RequestUserError || error instanceof BunnyServerError || error instanceof TaxonomyError) return NextResponse.json({ error: error.message }, { status: error.status, headers });
    if (error instanceof SyntaxError) return NextResponse.json({ error: 'بيانات غير صالحة' }, { status: 400, headers });
    console.error('[course-requests]', error);
    return NextResponse.json({ error: 'حدث خطأ في الخادم' }, { status: 500, headers });
  }
}
