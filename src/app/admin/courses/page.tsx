import { prisma } from '@/lib/db';
import { requireRolePage } from '@/lib/rbac';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import CoursesClient from './CoursesClient';

export const dynamic = 'force-dynamic';

export default async function AdminCoursesPage() {
  await requireRolePage(['ADMIN']);

  const courses = await prisma.course.findMany({
    include: {
      instructor: {
        select: { id: true, name: true, email: true }
      },
      _count: {
        select: { enrollments: true, chapters: true }
      }
    },
    orderBy: { createdAt: 'desc' }
  });

  return (
    <div style={{ padding: '2rem 5%', minHeight: '100vh', background: '#050505', color: '#fff' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '2.5rem', fontWeight: 'bold' }}>إدارة الكورسات والمحتوى</h1>
        <Link href="/admin" style={{ color: '#fff', textDecoration: 'none', fontWeight: 'bold', padding: '0.5rem 1rem', background: 'rgba(255,255,255,0.1)', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          العودة للوحة الإدارة <ArrowRight size={18} />
        </Link>
      </div>

      <CoursesClient initialCourses={courses} />
    </div>
  );
}
