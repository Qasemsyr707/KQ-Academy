import { notFound } from 'next/navigation';
import Link from 'next/link';
import { prisma } from '@/lib/db';
import { requireRolePage } from '@/lib/rbac';
import EditCourseClient from './EditCourseClient';

export const dynamic = 'force-dynamic';

export default async function EditCoursePage({ params }: { params: Promise<{ courseId: string }> }) {
  const { session } = await requireRolePage(['INSTRUCTOR', 'ADMIN'], '/dashboard', 'COURSES');
  const { courseId } = await params;
  const course = await prisma.course.findUnique({
    where: { id: courseId },
    select: { id: true, instructorId: true, status: true, title: true, description: true, thumbnail: true, previewVideoUrl: true, includes: true, category: true, price: true, priceSYP: true },
  });
  // Only the course's own instructor proposes edits; staff edit from the admin pages.
  if (!course || course.instructorId !== session.user.id) return notFound();
  const requests = await prisma.courseChangeRequest.findMany({
    where: { courseId }, orderBy: { createdAt: 'desc' }, take: 10,
    select: { id: true, status: true, changes: true, reason: true, createdAt: true, reviewedAt: true },
  });
  const { instructorId: _owner, includes, ...live } = course;
  return <main dir="rtl" style={{ maxWidth: 900, margin: 'auto', padding: '2rem 1rem' }}>
    <Link href="/instructor/courses">العودة إلى كورساتي</Link>
    <h1 style={{ margin: '1rem 0 0.5rem' }}>تعديل الكورس</h1>
    <p style={{ opacity: 0.8 }}>تُرسل التعديلات إلى الإدارة للمراجعة. يبقى الكورس الحالي متاحاً للطلاب بقيمه الحالية حتى الموافقة.</p>
    <EditCourseClient
      course={{ ...live, includes: Array.isArray(includes) ? includes.filter((i): i is string => typeof i === 'string') : [] }}
      requests={requests.map(r => ({ ...r, changes: r.changes as Record<string, unknown>, createdAt: r.createdAt.toISOString(), reviewedAt: r.reviewedAt?.toISOString() ?? null }))}
    />
  </main>;
}
