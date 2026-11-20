import { prisma } from '@/lib/db';
import { requireRolePage } from '@/lib/rbac';
import { notFound } from 'next/navigation';

import ChaptersClient from './ChaptersClient';

export const dynamic = 'force-dynamic';

export default async function ChaptersManagementPage({ params }: { params: Promise<{ courseId: string }> }) {
  const { session } = await requireRolePage(['ADMIN', 'INSTRUCTOR'], '/dashboard', 'COURSES');
  const resolvedParams = await params;

  const course = await prisma.course.findUnique({
    where: { id: resolvedParams.courseId },
    include: {
      attachments: true,
      chapters: {
        include: { 
          lessons: {
            include: { attachments: true }
          },
          attachments: true
        },
        orderBy: { order: 'asc' }
      }
    }
  });

  if (!course) {
    return notFound();
  }

  // Ensure this instructor owns the course
  if (course.instructorId !== (session.user as any).id && (session.user as any).role !== 'ADMIN' && (session.user as any).role !== 'OWNER') {
    return notFound();
  }

  return <ChaptersClient course={course} />;
}
