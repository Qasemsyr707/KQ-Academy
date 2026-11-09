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
    <Suspense fallback={<div className="kq-container" style={{ padding: '4rem 0', textAlign: 'center', color: 'var(--text-3)' }}>جارٍ تحميل الكورسات...</div>}>
      <CoursesClient
        initialCourses={courses}
        eyebrow="بكالوريا · تاسع · وغيرها"
        heading={<>المنهاج <span className="text-gold">الدراسي</span></>}
        description="تصفح المناهج الدراسية المتاحة (بكالوريا، تاسع، وغيرها) والمقدمة من نخبة من المدرسين"
      />
    </Suspense>
  );
}
