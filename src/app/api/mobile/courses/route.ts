import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { protectCoursePlaybackLinks } from '@/lib/course-playback-links';
import { requireRequestUser, RequestUserError } from '@/lib/request-user';
import { safeMediaUrl } from '@/lib/media-url';
import { mobileCourseSelect } from '@/lib/public-course';
import { publicCourseWhere } from '@/lib/catalogue-visibility';
import { resolveCourseTaxonomy } from '@/lib/course-taxonomy';
import { invalidateCatalogueSearch } from '@/lib/course-search';

const privateHeaders = { 'Cache-Control': 'private, no-store', Vary: 'Cookie, Authorization' };

export async function GET() {
  try {
    const courses = await prisma.course.findMany({
      where: publicCourseWhere(),
      select: mobileCourseSelect,
      orderBy: { createdAt: 'desc' }
    });

    return NextResponse.json({ courses: courses.map(protectCoursePlaybackLinks) }, { status: 200, headers: privateHeaders });
  } catch (error) {
    console.error('Mobile Courses API Error:', error);
    return NextResponse.json({ error: 'حدث خطأ في الخادم' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const user = await requireRequestUser(req, ['INSTRUCTOR', 'ADMIN', 'OWNER']);
    const body: unknown = await req.json();
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      return NextResponse.json({ error: 'بيانات الكورس غير صالحة' }, { status: 400, headers: privateHeaders });
    }
    const { title, category, type, price, image } = body as Record<string, unknown>;
    const amount = price === undefined || price === '' ? 0
      : typeof price === 'number' ? price : typeof price === 'string' && price.trim() ? Number(price) : NaN;
    const thumbnail = image === undefined || image === null || image === '' ? null : safeMediaUrl(image);
    if (typeof title !== 'string' || !title.trim() || title.length > 1000
      || (category !== undefined && (typeof category !== 'string' || category.length > 100))
      || (type !== undefined && type !== 'SKILL' && type !== 'CURRICULUM')
      || !Number.isFinite(amount) || amount < 0 || amount > Number.MAX_SAFE_INTEGER
      || (image !== undefined && image !== null && image !== ''
        && (typeof image !== 'string' || image.length > 2048 || !thumbnail))) {
      return NextResponse.json({ error: 'يرجى إدخال عنوان ونوع وسعر وصورة صالحين للكورس' }, { status: 400, headers: privateHeaders });
    }

    // The mobile app sends a category name. It is linked to the taxonomy when it names
    // exactly one active category; otherwise the text is kept as before (no app break).
    const courseType = type === 'CURRICULUM' ? 'CURRICULUM' : 'SKILL';
    const categoryText = typeof category === 'string' && category.trim() ? category.trim() : 'عام';
    const taxonomy = await resolveCourseTaxonomy(prisma, { category: categoryText }, { courseType, requireCategory: true }).catch(() => null);

    const course = await prisma.course.create({
      data: {
        title: title.trim(),
        description: '',
        type: type ?? 'SKILL',
        price: amount,
        // Ownership comes from the current authenticated account, never a body ID.
        instructorId: user.id,
        category: taxonomy?.category ?? categoryText,
        ...(taxonomy?.categoryId ? { categoryId: taxonomy.categoryId } : {}),
        thumbnail,
      }
    });

    invalidateCatalogueSearch();
    return NextResponse.json(course, { status: 201, headers: privateHeaders });
  } catch (error) {
    if (error instanceof RequestUserError) {
      return NextResponse.json({ error: error.message }, { status: error.status, headers: privateHeaders });
    }
    if (error instanceof SyntaxError) {
      return NextResponse.json({ error: 'بيانات الكورس غير صالحة' }, { status: 400, headers: privateHeaders });
    }
    console.error('Mobile course creation failed');
    return NextResponse.json({ error: 'تعذّر إنشاء الكورس، يرجى المحاولة مجدداً' }, { status: 500, headers: privateHeaders });
  }
}
