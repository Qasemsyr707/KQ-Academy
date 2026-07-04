'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Video, Calendar, Clock, ArrowRight, Save } from 'lucide-react';
import Link from 'next/link';

export default function LiveScheduleClient({ courses }: { courses: any[] }) {
  const [courseId, setCourseId] = useState(courses[0]?.id || '');
  const [chapterId, setChapterId] = useState('');
  const [title, setTitle] = useState('');
  const [liveDate, setLiveDate] = useState('');
  const [liveTime, setLiveTime] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const selectedCourse = courses.find(c => c.id === courseId);
  const chapters = selectedCourse?.chapters || [];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!courseId || !chapterId || !title || !liveDate || !liveTime) {
      alert('يرجى تعبئة جميع الحقول');
      return;
    }

    setIsLoading(true);

    const liveStartTime = new Date(`${liveDate}T${liveTime}:00`);

    try {
      const res = await fetch('/api/lessons/live', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          chapterId,
          liveStartTime: liveStartTime.toISOString(),
          courseId,
        })
      });

      if (res.ok) {
        const data = await res.json();
        alert('تمت جدولة البث بنجاح!');
        router.push(`/instructor/courses/${courseId}/chapters`);
      } else {
        const data = await res.json();
        alert(data.error || 'حدث خطأ أثناء الجدولة');
      }
    } catch (error) {
      alert('خطأ في الاتصال بالخادم');
    }
    setIsLoading(false);
  };

  return (
    <div style={{ padding: '2rem', maxWidth: '800px', margin: '0 auto', color: '#fff' }}>
      <Link href="/instructor" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', color: 'rgba(255,255,255,0.6)', textDecoration: 'none', marginBottom: '2rem' }}>
        <ArrowRight size={20} /> العودة للوحة التحكم
      </Link>

      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '2rem' }}>
        <div style={{ background: 'rgba(239, 68, 68, 0.2)', padding: '1rem', borderRadius: '12px' }}>
          <Video size={30} color="#ef4444" />
        </div>
        <h1 style={{ fontSize: '2rem', fontWeight: 'bold' }}>جدولة بث مباشر 🔴</h1>
      </div>

      {courses.length === 0 ? (
        <div style={{ padding: '3rem', textAlign: 'center', background: 'rgba(255,255,255,0.05)', borderRadius: '16px' }}>
          <h3 style={{ fontSize: '1.2rem', marginBottom: '1rem' }}>ليس لديك أي كورسات حالياً</h3>
          <Link href="/instructor/courses/create" className="btn btn-solid" style={{ textDecoration: 'none', display: 'inline-block' }}>أنشئ كورسك الأول الآن</Link>
        </div>
      ) : (
        <form onSubmit={handleSubmit} style={{ background: '#111', padding: '2rem', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.05)' }}>
          
          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>اختيار الكورس</label>
            <select 
              value={courseId} 
              onChange={(e) => {
                setCourseId(e.target.value);
                setChapterId(''); // Reset chapter when course changes
              }}
              style={{ width: '100%', padding: '1rem', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', borderRadius: '8px', fontSize: '1.05rem' }}
            >
              {courses.map(c => (
                <option key={c.id} value={c.id} style={{ background: '#111' }}>{c.title}</option>
              ))}
            </select>
          </div>

          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>الفصل المرتبط بالبث</label>
            {chapters.length === 0 ? (
              <div style={{ padding: '1rem', background: 'rgba(255,255,255,0.02)', border: '1px dashed rgba(255,255,255,0.2)', borderRadius: '8px', color: 'rgba(255,255,255,0.5)', fontSize: '0.9rem' }}>
                هذا الكورس لا يحتوي على فصول. يرجى إضافة فصل واحد على الأقل أولاً.
              </div>
            ) : (
              <select 
                value={chapterId} 
                onChange={(e) => setChapterId(e.target.value)}
                style={{ width: '100%', padding: '1rem', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', borderRadius: '8px', fontSize: '1.05rem' }}
                required
              >
                <option value="" disabled style={{ background: '#111' }}>-- اختر الفصل --</option>
                {chapters.map((ch: any) => (
                  <option key={ch.id} value={ch.id} style={{ background: '#111' }}>{ch.title}</option>
                ))}
              </select>
            )}
          </div>

          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>عنوان جلسة البث</label>
            <input 
              required
              type="text" 
              placeholder="مثال: جلسة مراجعة شاملة لأساسيات React"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              style={{ width: '100%', padding: '1rem', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', borderRadius: '8px', fontSize: '1.05rem' }}
            />
          </div>

          <div style={{ display: 'flex', gap: '1.5rem', marginBottom: '2.5rem' }}>
            <div style={{ flex: 1 }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>تاريخ البث</label>
              <div style={{ position: 'relative' }}>
                <Calendar size={18} style={{ position: 'absolute', top: '50%', right: '1rem', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.5)' }} />
                <input 
                  required
                  type="date"
                  value={liveDate}
                  onChange={(e) => setLiveDate(e.target.value)}
                  style={{ width: '100%', padding: '1rem 3rem 1rem 1rem', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', borderRadius: '8px', fontSize: '1.05rem' }}
                />
              </div>
            </div>
            <div style={{ flex: 1 }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>وقت البث</label>
              <div style={{ position: 'relative' }}>
                <Clock size={18} style={{ position: 'absolute', top: '50%', right: '1rem', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.5)' }} />
                <input 
                  required
                  type="time"
                  value={liveTime}
                  onChange={(e) => setLiveTime(e.target.value)}
                  style={{ width: '100%', padding: '1rem 3rem 1rem 1rem', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', borderRadius: '8px', fontSize: '1.05rem' }}
                />
              </div>
            </div>
          </div>

          <button 
            type="submit" 
            disabled={isLoading || chapters.length === 0}
            style={{ width: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem', padding: '1.2rem', background: 'var(--primary)', color: '#000', borderRadius: '8px', fontWeight: 'bold', border: 'none', cursor: (isLoading || chapters.length === 0) ? 'not-allowed' : 'pointer', fontSize: '1.1rem', opacity: (isLoading || chapters.length === 0) ? 0.7 : 1 }}
          >
            {isLoading ? 'جاري الحفظ...' : <><Save size={20} /> حفظ وجدولة البث المباشر</>}
          </button>
        </form>
      )}
    </div>
  );
}
