import { prisma } from '@/lib/db';
import { requireRolePage } from '@/lib/rbac';
import CurriculumClient from './CurriculumClient';

export const dynamic = 'force-dynamic';

export default async function CourseChaptersPage({ params }: { params: Promise<{ courseId: string }> }) {
  const { session } = await requireRolePage(['ADMIN', 'INSTRUCTOR']);
  const resolvedParams = await params;

  const course = await prisma.course.findUnique({
    where: { id: resolvedParams.courseId },
    include: {
      chapters: {
        include: { lessons: true },
        orderBy: { order: 'asc' }
      }
    }
  });

  if (!course) {
    return <div style={{ padding: '2rem', color: '#fff', textAlign: 'center' }}>الكورس غير موجود</div>;
  }

  // Ensure user owns this course
  if (course.instructorId !== (session.user as any).id) {
    return <div style={{ padding: '2rem', color: 'red', textAlign: 'center' }}>غير مصرح لك بتعديل هذا الكورس</div>;
  }

  return <CurriculumClient course={course} />;
}
