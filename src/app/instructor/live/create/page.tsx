'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Video, Calendar, Clock, BookOpen, Radio, ChevronLeft, Loader2 } from 'lucide-react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';

export default function CreateLivePage() {
  const router = useRouter();
  const [mode, setMode] = useState<'choose' | 'immediate' | 'scheduled'>('choose');
  const [isLoading, setIsLoading] = useState(false);
  const [courses, setCourses] = useState<any[]>([]);
  const [form, setForm] = useState({
    title: '',
    description: '',
    courseId: '',
    scheduledAt: '',
  });

  useEffect(() => {
    fetch('/api/instructor/courses').then(r => r.json()).then(d => setCourses(d.courses || [])).catch(() => {});
  }, []);

  const handleCreate = async () => {
    if (!form.title || !form.courseId) return alert('يرجى ملء العنوان واختيار الدورة');
    if (mode === 'scheduled' && !form.scheduledAt) return alert('يرجى تحديد التاريخ والوقت');
    setIsLoading(true);
    try {
      const res = await fetch('/api/live/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: form.title,
          description: form.description,
          courseId: form.courseId,
          isImmediate: mode === 'immediate',
          scheduledAt: mode === 'scheduled' ? form.scheduledAt : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) return alert(data.error || 'حدث خطأ');
      if (mode === 'immediate') {
        router.push(`/live/studio/${data.liveClass.id}`);
      } else {
        router.push('/dashboard/instructor/live');
      }
    } catch {
      alert('حدث خطأ، يرجى المحاولة مرة أخرى');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: '#050505', color: '#fff', direction: 'rtl', fontFamily: "'Cairo', sans-serif" }}>
      <Navbar />
      <style>{`
        .live-container { max-width: 900px; margin: 0 auto; padding: 120px 24px 80px; }
        .mode-cards { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin-top: 40px; }
        @media (max-width: 600px) { .mode-cards { grid-template-columns: 1fr; } }
        .mode-card { background: #0a0a0a; border: 1px solid rgba(255,255,255,0.07); border-radius: 24px; padding: 40px 32px; cursor: pointer; transition: all 0.3s; text-align: center; }
        .mode-card:hover { border-color: rgba(203,161,83,0.4); transform: translateY(-4px); box-shadow: 0 20px 60px rgba(0,0,0,0.5); }
        .mode-card.selected { border-color: var(--primary); background: rgba(203,161,83,0.05); }
        .form-group { display: flex; flex-direction: column; gap: 8px; margin-bottom: 20px; }
        .form-group label { color: rgba(255,255,255,0.7); font-size: 0.9rem; font-weight: 600; }
        .form-input { width: 100%; padding: 14px 16px; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); border-radius: 12px; color: #fff; font-family: inherit; font-size: 1rem; outline: none; transition: border-color 0.3s; box-sizing: border-box; }
        .form-input:focus { border-color: var(--primary); }
        .form-input option { background: #111; }
        .btn-primary { width: 100%; padding: 16px; background: linear-gradient(135deg, var(--primary), #f0c060); color: #000; font-weight: bold; font-size: 1.1rem; border: none; border-radius: 16px; cursor: pointer; font-family: inherit; transition: all 0.3s; display: flex; align-items: center; justify-content: center; gap: 12px; }
        .btn-primary:hover { transform: translateY(-2px); box-shadow: 0 10px 40px rgba(203,161,83,0.4); }
        .btn-primary:disabled { opacity: 0.6; cursor: not-allowed; transform: none; }
        .btn-back { background: none; border: 1px solid rgba(255,255,255,0.1); color: rgba(255,255,255,0.6); padding: 10px 20px; border-radius: 10px; cursor: pointer; font-family: inherit; display: flex; align-items: center; gap: 8px; margin-bottom: 32px; transition: all 0.3s; }
        .btn-back:hover { border-color: rgba(255,255,255,0.3); color: #fff; }
        .icon-circle { width: 80px; height: 80px; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 24px; }
      `}</style>

      <div className="live-container">
        <div style={{ marginBottom: '32px' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '999px', padding: '6px 16px', marginBottom: '20px' }}>
            <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#ef4444', animation: 'pulse 1.5s infinite' }} />
            <span style={{ color: '#ef4444', fontWeight: 'bold', fontSize: '0.9rem' }}>إنشاء بث مباشر</span>
          </div>
          <h1 style={{ fontSize: 'clamp(1.8rem, 4vw, 2.8rem)', fontWeight: 900, marginBottom: '12px' }}>ابدأ بثك <span style={{ color: 'var(--primary)' }}>الآن</span></h1>
          <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '1.1rem' }}>اختر إما بدء بث فوري أو جدولة بث لوقت لاحق</p>
        </div>

        {mode === 'choose' && (
          <div className="mode-cards">
            <div className="mode-card" onClick={() => setMode('immediate')}>
              <div className="icon-circle" style={{ background: 'rgba(239,68,68,0.15)' }}>
                <Radio size={36} color="#ef4444" />
              </div>
              <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '12px' }}>بث الآن</h2>
              <p style={{ color: 'rgba(255,255,255,0.6)', lineHeight: 1.7 }}>ابدأ بثاً مباشراً فورياً، سيكون الطلاب المشتركون قادرين على الانضمام فوراً</p>
              <div style={{ marginTop: '24px', background: 'rgba(239,68,68,0.1)', color: '#ef4444', padding: '8px 20px', borderRadius: '999px', display: 'inline-block', fontWeight: 'bold', fontSize: '0.9rem' }}>
                🔴 مباشر الآن
              </div>
            </div>

            <div className="mode-card" onClick={() => setMode('scheduled')}>
              <div className="icon-circle" style={{ background: 'rgba(203,161,83,0.15)' }}>
                <Calendar size={36} color="var(--primary)" />
              </div>
              <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '12px' }}>جدولة بث</h2>
              <p style={{ color: 'rgba(255,255,255,0.6)', lineHeight: 1.7 }}>حدد تاريخاً ووقتاً للبث وسيظهر للطلاب مسبقاً مع عداد تنازلي</p>
              <div style={{ marginTop: '24px', background: 'rgba(203,161,83,0.1)', color: 'var(--primary)', padding: '8px 20px', borderRadius: '999px', display: 'inline-block', fontWeight: 'bold', fontSize: '0.9rem' }}>
                📅 مجدول
              </div>
            </div>
          </div>
        )}

        {(mode === 'immediate' || mode === 'scheduled') && (
          <div>
            <button className="btn-back" onClick={() => setMode('choose')}>
              <ChevronLeft size={18} />
              العودة للاختيار
            </button>

            <div style={{ background: '#0a0a0a', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '24px', padding: '40px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '32px', padding: '16px 20px', borderRadius: '12px', background: mode === 'immediate' ? 'rgba(239,68,68,0.08)' : 'rgba(203,161,83,0.08)', border: `1px solid ${mode === 'immediate' ? 'rgba(239,68,68,0.2)' : 'rgba(203,161,83,0.2)'}` }}>
                {mode === 'immediate' ? <Radio size={24} color="#ef4444" /> : <Calendar size={24} color="var(--primary)" />}
                <div>
                  <div style={{ fontWeight: 'bold', color: mode === 'immediate' ? '#ef4444' : 'var(--primary)' }}>{mode === 'immediate' ? '🔴 بث فوري' : '📅 بث مجدول'}</div>
                  <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.85rem' }}>{mode === 'immediate' ? 'سيبدأ البث فور الضغط على الزر' : 'سيُعلَم الطلاب بوقت البث مسبقاً'}</div>
                </div>
              </div>

              <div className="form-group">
                <label>عنوان البث *</label>
                <input className="form-input" placeholder="مثال: محاضرة الجلسة العاشرة - HTML المتقدم" value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} />
              </div>

              <div className="form-group">
                <label>وصف البث (اختياري)</label>
                <textarea className="form-input" rows={3} placeholder="اكتب وصفاً موجزاً لما ستتناوله في هذه الجلسة..." value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} style={{ resize: 'vertical' }} />
              </div>

              <div className="form-group">
                <label><BookOpen size={14} style={{ display: 'inline', marginLeft: '4px' }} />الدورة المرتبطة *</label>
                <select className="form-input" value={form.courseId} onChange={e => setForm(p => ({ ...p, courseId: e.target.value }))}>
                  <option value="">-- اختر الدورة --</option>
                  {courses.map((c: any) => <option key={c.id} value={c.id}>{c.title}</option>)}
                </select>
              </div>

              {mode === 'scheduled' && (
                <div className="form-group">
                  <label><Clock size={14} style={{ display: 'inline', marginLeft: '4px' }} />تاريخ ووقت البث *</label>
                  <input className="form-input" type="datetime-local" value={form.scheduledAt} onChange={e => setForm(p => ({ ...p, scheduledAt: e.target.value }))} />
                </div>
              )}

              <button className="btn-primary" onClick={handleCreate} disabled={isLoading}>
                {isLoading ? <><Loader2 size={20} style={{ animation: 'spin 1s linear infinite' }} /> جاري الإنشاء...</> : mode === 'immediate' ? <><Radio size={20} />ابدأ البث الآن</> : <><Calendar size={20} />جدولة البث</>}
              </button>
            </div>
          </div>
        )}
      </div>
      <Footer />
      <style>{`@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.5} } @keyframes spin { to{transform:rotate(360deg)} }`}</style>
    </div>
  );
}
