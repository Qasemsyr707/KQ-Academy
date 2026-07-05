import { prisma } from '@/lib/db';
import Link from 'next/link';
import { BookOpen, Star, User, ShieldCheck } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function CoursesPage() {
  const courses = await prisma.course.findMany({
    include: {
      instructor: {
        select: { name: true }
      },
      _count: {
        select: { enrollments: true, reviews: true }
      }
    },
    orderBy: { createdAt: 'desc' }
  });

  return (
    <div style={{ minHeight: '100vh', background: '#050505', color: '#fff', padding: '4rem 5%' }}>
      <div style={{ textAlign: 'center', marginBottom: '4rem' }}>
        <h1 style={{ fontSize: '3rem', fontWeight: 'bold', marginBottom: '1rem' }}>
          تصفح <span style={{ color: 'var(--primary)' }}>الكورسات</span> المتاحة
        </h1>
        <p style={{ fontSize: '1.2rem', color: 'rgba(255,255,255,0.7)', maxWidth: '600px', margin: '0 auto' }}>
          اكتشف مجموعة واسعة من الكورسات الاحترافية وابدأ رحلة التعلم اليوم.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '2rem' }}>
        {courses.length === 0 ? (
          <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '4rem', background: 'rgba(255,255,255,0.02)', borderRadius: '16px' }}>
            <BookOpen size={48} color="var(--primary)" style={{ margin: '0 auto 1rem auto', opacity: 0.5 }} />
            <h3 style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>لا يوجد كورسات حالياً</h3>
            <p style={{ color: 'rgba(255,255,255,0.5)' }}>يرجى العودة لاحقاً لاكتشاف الكورسات الجديدة.</p>
          </div>
        ) : (
          courses.map(course => (
            <div key={course.id} className="glass-card" style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden', padding: 0 }}>
              <div style={{ width: '100%', paddingTop: '56.25%', background: 'linear-gradient(45deg, #1e3a8a, #0f172a)', position: 'relative' }}>
                <div style={{ position: 'absolute', top: '1rem', right: '1rem', background: 'rgba(0,0,0,0.6)', padding: '0.3rem 0.8rem', borderRadius: '20px', fontSize: '0.8rem', fontWeight: 'bold', backdropFilter: 'blur(4px)' }}>
                  {course.category}
                </div>
              </div>
              <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', flex: 1 }}>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '0.5rem', lineHeight: 1.4 }}>
                  {course.title}
                </h3>
                <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.9rem', marginBottom: '1.5rem', flex: 1, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                  {course.description || 'لا يوجد وصف متاح.'}
                </p>
                
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', fontSize: '0.9rem', color: 'rgba(255,255,255,0.8)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <User size={16} color="var(--primary)" /> {course.instructor.name}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <Star size={16} color="var(--warning)" fill="var(--warning)" /> {course.rating.toFixed(1)} ({course._count.reviews})
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '1rem', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
                  <span style={{ fontSize: '1.25rem', fontWeight: 'bold', color: 'var(--primary)' }}>
                    {course.priceSYP > 0 ? `${course.priceSYP.toLocaleString()} ل.س` : (course.price > 0 ? `$${course.price}` : 'مجاني')}
                  </span>
                  <Link href={`/courses/${course.id}`} className="btn btn-solid" style={{ padding: '0.5rem 1.5rem', fontSize: '0.9rem' }}>
                    التفاصيل
                  </Link>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
