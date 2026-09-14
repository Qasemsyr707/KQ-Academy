import { prisma } from '@/lib/db';
import CoursesClient from './CoursesClient';

export const dynamic = 'force-dynamic';

export default async function CoursesPage({ searchParams }: { searchParams: Promise<{ [key: string]: string | string[] | undefined }> }) {
  const resolvedParams = await searchParams;
  
  // Extract all available filters for the UI
  const allCourses = await prisma.course.findMany({
    where: { status: 'PUBLISHED' },
    select: { category: true, type: true, instructor: { select: { name: true } } }
  });

  const categories = Array.from(new Set(allCourses.map(c => c.category))).filter(Boolean);
  const instructors = Array.from(new Set(allCourses.map(c => c.instructor?.name))).filter(Boolean);

  // We could fetch the initial courses here, but to keep the UI snappy with client-side 
  // navigation and avoid duplicating the complex search logic, we'll let the client fetch 
  // its initial state based on the URL parameters on mount.
  // Or we can just pass an empty array initially and let the client fetch.
  // Actually, for SEO, it's better to render something. Let's do a basic fetch for the initial load.
  const initialCourses = await prisma.course.findMany({
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

  return <CoursesClient initialCourses={initialCourses} categories={categories} instructors={instructors} />;
}
