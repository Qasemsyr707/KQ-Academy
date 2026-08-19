import { prisma } from '@/lib/db';
import CoursesClient from './CoursesClient';

export const dynamic = 'force-dynamic';

export default async function CoursesPage() {
  const courses = await prisma.course.findMany({
    where: { status: 'PUBLISHED', type: 'SKILL' },
    include: {
      instructor: {
        select: { name: true, image: true }
      },
      _count: {
        select: { enrollments: true, reviews: true }
      }
    },
    orderBy: { createdAt: 'desc' }
  });

  return <CoursesClient initialCourses={courses} />;
}
