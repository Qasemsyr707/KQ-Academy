import { prisma } from '@/lib/db';
import { requireRolePage } from '@/lib/rbac';
import Link from 'next/link';
import { ArrowRight, Layers } from 'lucide-react';
import CoursesClient from './CoursesClient';

export const dynamic = 'force-dynamic';

export default async function AdminCoursesPage() {
  await requireRolePage(['ADMIN'], '/dashboard', 'COURSES');

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

  const instructors = await prisma.user.findMany({
    where: { role: { in: ['INSTRUCTOR', 'ADMIN'] } },
    select: { id: true, name: true, email: true }
  });

  return (
    <div style={{ padding: '2rem 5%', minHeight: '100vh', background: 'var(--background)', color: '#fff' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '2.5rem', fontWeight: 'bold' }}>إدارة الكورسات والمحتوى</h1>
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          <Link href="/admin/categories" style={{ color: 'var(--text-on-gold)', textDecoration: 'none', fontWeight: 'bold', padding: '0.5rem 1rem', background: 'var(--gold-gradient)', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Layers size={18} aria-hidden="true" /> إدارة التصنيفات
          </Link>
          <Link href="/admin" style={{ color: '#fff', textDecoration: 'none', fontWeight: 'bold', padding: '0.5rem 1rem', background: 'rgba(255,255,255,0.1)', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            العودة للوحة الإدارة <ArrowRight size={18} />
          </Link>
        </div>
      </div>

      <CoursesClient initialCourses={courses} instructors={instructors} />
    </div>
  );
}
