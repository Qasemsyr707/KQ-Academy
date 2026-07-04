import { prisma } from '@/lib/db';
import { requireRolePage } from '@/lib/rbac';
import Link from 'next/link';
import { PlusCircle, Edit3, Eye, Video } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function InstructorCoursesPage() {
  const { session } = await requireRolePage(['ADMIN', 'INSTRUCTOR']);

  const courses = await prisma.course.findMany({
    where: {
      instructorId: (session.user as any).id
    },
    orderBy: {
      createdAt: 'desc'
    },
    include: {
      chapters: true,
      enrollments: true
    }
  });

  return (
    <div style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto', color: '#fff' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ fontSize: '2rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>إدارة الكورسات 📚</h1>
          <p style={{ opacity: 0.7 }}>هنا يمكنك إضافة كورسات جديدة وتعديل محتواها بكل سهولة.</p>
        </div>
        <Link href="/instructor/courses/create" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'var(--primary)', color: '#000', padding: '0.8rem 1.5rem', borderRadius: '12px', fontWeight: 'bold', textDecoration: 'none' }}>
          <PlusCircle size={20} /> كورس جديد
        </Link>
      </div>

      <div style={{ background: '#111', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.05)', overflow: 'hidden' }}>
        <table style={{ width: '100%', textAlign: 'right', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: 'rgba(255,255,255,0.02)', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
              <th style={{ padding: '1.5rem 1rem', fontWeight: 600, opacity: 0.8 }}>اسم الكورس</th>
              <th style={{ padding: '1.5rem 1rem', fontWeight: 600, opacity: 0.8 }}>السعر</th>
              <th style={{ padding: '1.5rem 1rem', fontWeight: 600, opacity: 0.8 }}>الطلاب المسجلين</th>
              <th style={{ padding: '1.5rem 1rem', fontWeight: 600, opacity: 0.8 }}>الفصول والدروس</th>
              <th style={{ padding: '1.5rem 1rem', fontWeight: 600, opacity: 0.8 }}>الإجراءات</th>
            </tr>
          </thead>
          <tbody>
            {courses.length === 0 ? (
              <tr>
                <td colSpan={5} style={{ padding: '3rem', textAlign: 'center', opacity: 0.5 }}>
                  لم تقم بإنشاء أي كورس بعد. ابدأ الآن!
                </td>
              </tr>
            ) : (
              courses.map((course) => (
                <tr key={course.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                  <td style={{ padding: '1.5rem 1rem', fontWeight: 'bold' }}>{course.title}</td>
                  <td style={{ padding: '1.5rem 1rem', color: 'var(--primary)', fontWeight: 'bold' }}>{course.price.toLocaleString()} ل.س</td>
                  <td style={{ padding: '1.5rem 1rem' }}>{course.enrollments.length} طالب</td>
                  <td style={{ padding: '1.5rem 1rem' }}>{course.chapters.length} فصل</td>
                  <td style={{ padding: '1.5rem 1rem' }}>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <Link href={`/instructor/courses/${course.id}/chapters`} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', background: 'rgba(255,255,255,0.1)', color: '#fff', padding: '0.5rem 1rem', borderRadius: '8px', textDecoration: 'none', fontSize: '0.9rem' }}>
                        <Video size={16} /> إدارة المحتوى
                      </Link>
                      <Link href={`/courses/${course.id}`} target="_blank" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', background: 'rgba(255,255,255,0.05)', color: '#fff', padding: '0.5rem 1rem', borderRadius: '8px', textDecoration: 'none', fontSize: '0.9rem' }}>
                        <Eye size={16} /> معاينة
                      </Link>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
