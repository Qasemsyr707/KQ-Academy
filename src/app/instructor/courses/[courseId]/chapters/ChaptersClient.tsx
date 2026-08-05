'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Video, PlusCircle, ArrowRight, Settings, Trash2, X, LockOpen, Lock } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function ChaptersClient({ course }: { course: any }) {
  const router = useRouter();
  const [isAdding, setIsAdding] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [isFree, setIsFree] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleAddChapter = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    setLoading(true);
    try {
      const res = await fetch('/api/chapters', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: newTitle,
          courseId: course.id,
          isFree: isFree
        })
      });

      if (res.ok) {
        setNewTitle('');
        setIsFree(false);
        setIsAdding(false);
        router.refresh(); // Reload to show new chapter
      } else {
        alert('حدث خطأ أثناء إضافة الفصل');
      }
    } catch (error) {
      console.error(error);
      alert('خطأ في الاتصال بالخادم');
    }
    setLoading(false);
  };

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
          <button onClick={() => setIsAdding(true)} className="btn btn-solid" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <PlusCircle size={20} /> فصل جديد
          </button>
        </div>

        {course.chapters.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '4rem', background: 'rgba(255,255,255,0.02)', borderRadius: '16px', border: '1px dashed rgba(255,255,255,0.1)' }}>
            <Video size={48} color="rgba(255,255,255,0.2)" style={{ margin: '0 auto 1rem auto' }} />
            <h3 style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>لا يوجد فصول حتى الآن</h3>
            <p style={{ color: 'rgba(255,255,255,0.5)', marginBottom: '1.5rem' }}>ابدأ بإضافة الفصل الأول لتتمكن من إضافة الدروس إليه.</p>
            <button onClick={() => setIsAdding(true)} className="btn btn-solid">إضافة الفصل الأول</button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            {course.chapters.map((chapter: any, index: number) => (
              <div key={chapter.id} className="glass-card" style={{ padding: '1.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '1rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <h3 style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>{index + 1}. {chapter.title}</h3>
                    {chapter.isFree ? (
                      <span style={{ fontSize: '0.8rem', background: 'rgba(34,197,94,0.1)', color: '#22c55e', padding: '0.2rem 0.6rem', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                        <LockOpen size={14} /> مجاني للعامة
                      </span>
                    ) : (
                      <span style={{ fontSize: '0.8rem', background: 'rgba(234,179,8,0.1)', color: '#eab308', padding: '0.2rem 0.6rem', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                        <Lock size={14} /> مدفوع (للمشتركين)
                      </span>
                    )}
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button className="btn" style={{ padding: '0.4rem', color: '#3b82f6' }}><Settings size={18} /></button>
                    <button className="btn" style={{ padding: '0.4rem', color: '#ef4444' }}><Trash2 size={18} /></button>
                  </div>
                </div>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', paddingRight: '1rem', borderRight: '2px solid rgba(255,255,255,0.1)' }}>
                  {chapter.lessons.length === 0 ? (
                    <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.9rem' }}>لا يوجد دروس في هذا الفصل.</p>
                  ) : (
                    chapter.lessons.map((lesson: any, idx: number) => (
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
                  <button onClick={() => alert('ميزة إضافة الدروس ستتوفر قريباً')} style={{ marginTop: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--primary)', background: 'transparent', border: '1px dashed var(--primary)', padding: '0.5rem', borderRadius: '8px', cursor: 'pointer', alignSelf: 'flex-start' }}>
                    <PlusCircle size={16} /> إضافة درس جديد
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Add Chapter Modal */}
        {isAdding && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
            <div className="glass-card" style={{ width: '100%', maxWidth: '500px', padding: '2rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>إضافة فصل جديد</h2>
                <button onClick={() => setIsAdding(false)} className="btn" style={{ padding: '0.5rem' }}><X size={20} /></button>
              </div>
              
              <form onSubmit={handleAddChapter} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem' }}>اسم الفصل</label>
                  <input
                    type="text"
                    required
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    className="input-field"
                    placeholder="مثال: مقدمة في التسويق"
                  />
                </div>
                
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', background: 'rgba(255,255,255,0.02)', padding: '1rem', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)' }}>
                  <input
                    type="checkbox"
                    id="isFree"
                    checked={isFree}
                    onChange={(e) => setIsFree(e.target.checked)}
                    style={{ width: '20px', height: '20px', cursor: 'pointer' }}
                  />
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <label htmlFor="isFree" style={{ fontWeight: 'bold', cursor: 'pointer' }}>فصل مجاني (متاح للجميع)</label>
                    <span style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.5)' }}>إذا قمت بتفعيل هذا الخيار، سيتمكن أي زائر من مشاهدة الفيديوهات داخل هذا الفصل بدون الحاجة لدفع قيمة الكورس (مثالي كعينة ترويجية).</span>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                  <button type="submit" disabled={loading} className="btn btn-solid" style={{ flex: 1 }}>
                    {loading ? 'جاري الإضافة...' : 'حفظ الفصل'}
                  </button>
                  <button type="button" onClick={() => setIsAdding(false)} className="btn" style={{ flex: 1, background: 'rgba(255,255,255,0.1)' }}>
                    إلغاء
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
