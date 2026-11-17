import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireRoleApi } from '@/lib/rbac';
import { resolveCourseTaxonomy, TaxonomyError } from '@/lib/course-taxonomy';
import { invalidateCatalogueSearch } from '@/lib/course-search';

export async function POST(req: Request) {
  try {
    const { authorized, errorResponse, session } = await requireRoleApi(['ADMIN', 'INSTRUCTOR']);
    if (!authorized) return errorResponse;

    const body = await req.json();
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      return NextResponse.json({ error: 'بيانات غير صالحة' }, { status: 400 });
    }
    const { title, description, type, price, priceSYP, thumbnail, includes, durationHours } = body;
    const hours = Number(durationHours);

    if (!title) {
      return NextResponse.json({ error: 'عنوان الكورس مطلوب' }, { status: 400 });
    }
    const courseType = type === 'CURRICULUM' ? 'CURRICULUM' : 'SKILL';
    // Category (required), tags and training type come only from active, valid choices.
    const taxonomy = await resolveCourseTaxonomy(prisma, body, { courseType, requireCategory: true });

    const userId = (session.user as any).id;

    const course = await prisma.course.create({
      data: {
        title,
        description,
        type: courseType,
        price: Number(price) || 0,
        priceSYP: Number(priceSYP) || 0,
        category: taxonomy.category!,
        categoryId: taxonomy.categoryId,
        tags: taxonomy.tags ?? [],
        trainingType: taxonomy.trainingType ?? null,
        instructorId: userId,
        status: 'PUBLISHED', // Default to published so it shows up immediately
        thumbnail: thumbnail || `linear-gradient(135deg, #${Math.floor(Math.random()*16777215).toString(16)} 0%, #0f172a 100%)`,
        includes: includes || null,
        // Optional; unknown stays null so certificates never print an invented duration.
        durationHours: Number.isFinite(hours) && hours > 0 && hours <= 2000 ? hours : null
      }
    });
    invalidateCatalogueSearch();

    return NextResponse.json({ course, message: 'تم إنشاء الكورس بنجاح' }, { status: 201 });

  } catch (error) {
    if (error instanceof TaxonomyError) return NextResponse.json({ error: error.message }, { status: error.status });
    console.error('Create Course API Error:', error);
    return NextResponse.json({ error: 'حدث خطأ في الخادم' }, { status: 500 });
  }
}
