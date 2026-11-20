import { hasPermission } from '@/lib/permission-check';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireRoleApi } from '@/lib/rbac';
import { resolveCourseTaxonomy, TAXONOMY_FIELDS, TaxonomyError } from '@/lib/course-taxonomy';
import { invalidateCatalogueSearch } from '@/lib/course-search';
import { validThumbnail } from '@/lib/course-update';
import { CoursePolicyError, newCourseState, parseCoursePrice } from '@/lib/course-review';

/**
 * Fields a course can be created with. Anything else (status, instructorId, isFeatured,
 * rating, ids, dates...) rejects the whole request: nothing is created.
 */
const CREATE_FIELDS = new Set<string>([
  'title', 'description', 'type', 'price', 'priceSYP', 'thumbnail', 'includes', 'durationHours', ...TAXONOMY_FIELDS,
]);

export async function POST(req: Request) {
  try {
    const { authorized, errorResponse, session } = await requireRoleApi(['ADMIN', 'INSTRUCTOR'], 'COURSES');
    if (!authorized) return errorResponse;

    const body = await req.json();
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      return NextResponse.json({ error: 'بيانات غير صالحة' }, { status: 400 });
    }
    const refused = Object.keys(body).filter(key => !CREATE_FIELDS.has(key));
    if (refused.length) {
      return NextResponse.json({ error: `لا يمكن تعيين هذه الحقول عند إنشاء الكورس: ${refused.slice(0, 10).join(', ')}` }, { status: 403 });
    }
    const user = session.user as { id: string; role?: string };
    const { title, description, type, thumbnail, includes, durationHours } = body;
    const hours = Number(durationHours);
    // Instructor: a DRAFT with a proposed price. Staff: published only with both prices stated.
    const canPublish = user.role === 'OWNER' || (user.role === 'ADMIN' && await hasPermission(user.id, 'COURSE_PUBLISHING'));
    const state = newCourseState(user.role,
      parseCoursePrice(body.price, 'السعر بالدولار'), parseCoursePrice(body.priceSYP, 'السعر بالليرة السورية'), canPublish);

    if (!title) {
      return NextResponse.json({ error: 'عنوان الكورس مطلوب' }, { status: 400 });
    }
    // The cover must be an image the site can show (https, same-site path, raster data URL).
    if (thumbnail !== undefined && thumbnail !== null && thumbnail !== '' && (typeof thumbnail !== 'string' || !validThumbnail(thumbnail))) {
      return NextResponse.json({ error: 'صورة الغلاف غير صالحة' }, { status: 400 });
    }
    const courseType = type === 'CURRICULUM' ? 'CURRICULUM' : 'SKILL';
    // Category (required), tags and training type come only from active, valid choices.
    const taxonomy = await resolveCourseTaxonomy(prisma, body, { courseType, requireCategory: true });

    // Ownership is the authenticated account, never a body field.
    const userId = user.id;

    const course = await prisma.course.create({
      data: {
        title,
        description,
        type: courseType,
        price: state.price,
        priceSYP: state.priceSYP,
        category: taxonomy.category!,
        categoryId: taxonomy.categoryId,
        tags: taxonomy.tags ?? [],
        trainingType: taxonomy.trainingType ?? null,
        instructorId: userId,
        // Explicit on purpose: the schema default is PUBLISHED (historic), see course-review.ts.
        status: state.status,
        thumbnail: thumbnail || `linear-gradient(135deg, #${Math.floor(Math.random()*16777215).toString(16)} 0%, #0f172a 100%)`,
        includes: includes || null,
        // Optional; unknown stays null so certificates never print an invented duration.
        durationHours: Number.isFinite(hours) && hours > 0 && hours <= 2000 ? hours : null
      }
    });
    if (course.status === 'PUBLISHED') invalidateCatalogueSearch();

    return NextResponse.json({
      course,
      message: course.status === 'PUBLISHED' ? 'تم إنشاء الكورس ونشره' : 'حُفظ الكورس كمسودة. أضف المحتوى ثم أرسله لمراجعة الإدارة.',
    }, { status: 201 });

  } catch (error) {
    if (error instanceof TaxonomyError || error instanceof CoursePolicyError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    if (error instanceof SyntaxError) return NextResponse.json({ error: 'بيانات غير صالحة' }, { status: 400 });
    console.error('Create Course API Error:', error);
    return NextResponse.json({ error: 'حدث خطأ في الخادم' }, { status: 500 });
  }
}
