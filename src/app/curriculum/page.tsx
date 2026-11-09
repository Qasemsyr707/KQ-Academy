import { prisma } from '@/lib/db';
import CoursesClient from '../courses/CoursesClient';
import { Suspense } from 'react';
import { connection } from 'next/server';
import { unstable_cache } from 'next/cache';

// Cache public catalogue data; defer the first query until a request arrives.
const getCurriculumCourses = unstable_cache(() => prisma.course.findMany({
    where: { status: 'PUBLISHED', type: 'CURRICULUM' },
    include: {
      instructor: {
        select: { name: true, image: true }
      },
      _count: {
        select: { enrollments: true, reviews: true }
      }
    },
    orderBy: { createdAt: 'desc' }
  }), ['public-curriculum-courses-v1'], { revalidate: 300 });

export default async function CurriculumPage() {
  await connection();
  const courses = await getCurriculumCourses();

  return (
    <div style={{ paddingTop: '80px' }}>
      <div style={{ textAlign: 'center', marginBottom: '2rem', padding: '2rem 0' }}>
        <h1 style={{ fontSize: '2.5rem', fontWeight: 'bold' }}>المنهاج الدراسي</h1>
        <p style={{ opacity: 0.7, maxWidth: '600px', margin: '1rem auto' }}>
          تصفح المناهج الدراسية المتاحة (بكالوريا، تاسع، وغيرها) والمقدمة من نخبة من المدرسين
        </p>
      </div>
<Suspense fallback={<div>جارٍ تحميل الكورسات...</div>}>
  <CoursesClient initialCourses={courses} />
</Suspense>    </div>
  );
}
