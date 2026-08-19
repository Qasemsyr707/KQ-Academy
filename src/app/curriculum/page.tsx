import { prisma } from '@/lib/db';
import CoursesClient from '../courses/CoursesClient';

export const dynamic = 'force-dynamic';

export default async function CurriculumPage() {
  const courses = await prisma.course.findMany({
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
  });

  return (
    <div style={{ paddingTop: '80px' }}>
      <div style={{ textAlign: 'center', marginBottom: '2rem', padding: '2rem 0' }}>
        <h1 style={{ fontSize: '2.5rem', fontWeight: 'bold' }}>المنهاج الدراسي</h1>
        <p style={{ opacity: 0.7, maxWidth: '600px', margin: '1rem auto' }}>
          تصفح المناهج الدراسية المتاحة (بكالوريا، تاسع، وغيرها) والمقدمة من نخبة من المدرسين
        </p>
      </div>
      <CoursesClient initialCourses={courses} />
    </div>
  );
}
