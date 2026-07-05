import { prisma } from '@/lib/db';
import { requireRolePage } from '@/lib/rbac';
import Link from 'next/link';
import { Video, PlusCircle, ArrowRight, Settings, Trash2 } from 'lucide-react';
import { notFound } from 'next/navigation';

export const dynamic = 'force-dynamic';

export default async function ChaptersManagementPage({ params }: { params: { courseId: string } }) {
  const { session } = await requireRolePage(['ADMIN', 'INSTRUCTOR']);

  const course = await prisma.course.findUnique({
    where: { id: params.courseId },
    include: {
      chapters: {
        include: { lessons: true },
        orderBy: { order: 'asc' }
      }
    }
  });

  if (!course) {
    return notFound();
  }

  // Ensure this instructor owns the course
  if (course.instructorId !== (session.user as any).id && (session.user as any).role !== 'ADMIN') {
    return notFound();
  }

  return (
    <div style={{ padding: '2rem 5%', minHeight: '100vh', background: '#050505', color: '#fff' }}>
      <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
        
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
          <div>
            <Link href="/instructor/courses" style={{ color: 'rgba(255,255,255,0.5)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
              <ArrowRight size={16} /> العودة للكورسات
            </Link>
            <h1 style={{ fontSize: '2rem', fontWeight: 'bold' }}>إدارة محتوى الكورس</h1>
            <p style={{ color: 'var(--primary)', fontWeight: 'bold' }}>{course.title}</p>
          </div>
          <button className="btn btn-solid" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <PlusCircle size={20} /> فصل جديد
          </button>
        </div>

        {course.chapters.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '4rem', background: 'rgba(255,255,255,0.02)', borderRadius: '16px', border: '1px dashed rgba(255,255,255,0.1)' }}>
            <Video size={48} color="rgba(255,255,255,0.2)" style={{ margin: '0 auto 1rem auto' }} />
            <h3 style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>لا يوجد فصول حتى الآن</h3>
            <p style={{ color: 'rgba(255,255,255,0.5)', marginBottom: '1.5rem' }}>ابدأ بإضافة الفصل الأول لتتمكن من إضافة الدروس إليه.</p>
            <button className="btn btn-solid">إضافة الفصل الأول</button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            {course.chapters.map((chapter, index) => (
              <div key={chapter.id} className="glass-card" style={{ padding: '1.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '1rem' }}>
                  <h3 style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>{index + 1}. {chapter.title}</h3>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button className="btn" style={{ padding: '0.4rem', color: '#3b82f6' }}><Settings size={18} /></button>
                    <button className="btn" style={{ padding: '0.4rem', color: '#ef4444' }}><Trash2 size={18} /></button>
                  </div>
                </div>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', paddingRight: '1rem', borderRight: '2px solid rgba(255,255,255,0.1)' }}>
                  {chapter.lessons.length === 0 ? (
                    <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.9rem' }}>لا يوجد دروس في هذا الفصل.</p>
                  ) : (
                    chapter.lessons.map((lesson, idx) => (
                      <div key={lesson.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(0,0,0,0.3)', padding: '0.8rem 1rem', borderRadius: '8px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <Video size={16} color="var(--primary)" />
                          <span>الدرس {idx + 1}: {lesson.title}</span>
                        </div>
                        <span style={{ fontSize: '0.8rem', background: lesson.isLive ? 'rgba(244,63,94,0.1)' : 'rgba(255,255,255,0.1)', color: lesson.isLive ? '#f43f5e' : '#fff', padding: '0.2rem 0.5rem', borderRadius: '12px' }}>
                          {lesson.isLive ? 'بث مباشر' : 'فيديو مسجل'}
                        </span>
                      </div>
                    ))
                  )}
                  <button style={{ marginTop: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--primary)', background: 'transparent', border: '1px dashed var(--primary)', padding: '0.5rem', borderRadius: '8px', cursor: 'pointer', alignSelf: 'flex-start' }}>
                    <PlusCircle size={16} /> إضافة درس جديد
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
