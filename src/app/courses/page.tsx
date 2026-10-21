import { prisma } from '@/lib/db';
import CoursesClient from './CoursesClient';

// يُحدَّث كل 5 دقائق بدلاً من force-dynamic الذي يستهلك bandwidth لكل زيارة
export const revalidate = 300;

export default async function CoursesPage({ searchParams }: { searchParams: Promise<{ [key: string]: string | string[] | undefined }> }) {
  const resolvedParams = await searchParams;

  let categories: string[] = [];
  let instructors: (string | undefined)[] = [];
  let initialCourses: any[] = [];
  let featuredCourses: any[] = [];

  try {
    // Extract all available filters for the UI
    const allCourses = await prisma.course.findMany({
      where: { status: 'PUBLISHED' },
      select: { category: true, type: true, instructor: { select: { name: true } } }
    });

    categories = Array.from(new Set(allCourses.map(c => c.category))).filter(Boolean) as string[];
    instructors = Array.from(new Set(allCourses.map(c => c.instructor?.name))).filter(Boolean);

    initialCourses = await prisma.course.findMany({
      where: { status: 'PUBLISHED' },
      include: {
        instructor: {
          select: { name: true, image: true }
        },
        _count: {
          select: { enrollments: true, reviews: true }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: 20
    });

    featuredCourses = await prisma.course.findMany({
      where: { status: 'PUBLISHED', isFeatured: true },
      include: {
        instructor: { select: { name: true, image: true } },
        _count: { select: { enrollments: true, reviews: true } }
      },
      orderBy: { createdAt: 'desc' }
    });
  } catch (error) {
    // إذا كانت قاعدة البيانات غير متاحة (quota exceeded أو خطأ شبكة)
    // نعرض الصفحة فارغة بدلاً من إرجاع 500
    console.error('[CoursesPage] DB error:', error);
  }

  return <CoursesClient initialCourses={initialCourses} featuredCourses={featuredCourses} categories={categories} instructors={instructors} />;
}
