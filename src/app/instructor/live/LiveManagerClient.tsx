'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowRight, Calendar, Loader2, Radio, Video, XCircle, StopCircle, AlertTriangle, ExternalLink } from 'lucide-react';

type Course = { id: string; title: string; status: string; ownCourse: boolean; chapters: { id: string; title: string }[] };
type Session = {
  id: string; title: string; description: string | null; status: string; scheduledAt: string; startedAt: string | null; endedAt: string | null;
  courseId: string; courseTitle: string; chapterTitle: string | null; isOwn: boolean;
};
type Legacy = { id: string; title: string; liveStartTime: string | null; chapterTitle: string; courseId: string; courseTitle: string };
type Props = {
  courses: Course[]; sessions: Session[]; legacy: Legacy[]; staff: boolean; initialMode: 'now' | 'schedule' | null;
  livekit: { ready: boolean; missing: string[]; invalidUrl: boolean };
};

const STATUS: Record<string, { label: string; color: string }> = {
  upcoming: { label: 'قادمة', color: '#c9a45c' },
  live: { label: 'مباشر الآن', color: '#ef4444' },
  ended: { label: 'انتهت', color: 'rgba(255,255,255,0.55)' },
  cancelled: { label: 'ملغاة', color: 'rgba(255,255,255,0.45)' },
  expired: { label: 'انتهت مهلتها دون بدء', color: 'rgba(255,255,255,0.45)' },
};
const fmt = (iso: string) => new Date(iso).toLocaleString('ar', { dateStyle: 'medium', timeStyle: 'short' });
const field = { display: 'grid', gap: 6, marginBottom: '1rem' } as const;

export default function LiveManagerClient({ courses, sessions, legacy, staff, initialMode, livekit }: Props) {
  const router = useRouter();
  const [mode, setMode] = useState<'now' | 'schedule' | null>(initialMode);
  const [courseId, setCourseId] = useState(courses[0]?.id ?? '');
  const [chapterId, setChapterId] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [when, setWhen] = useState('');
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const chapters = useMemo(() => courses.find(c => c.id === courseId)?.chapters ?? [], [courses, courseId]);

  const open = sessions.filter(s => s.status === 'upcoming' || s.status === 'live');
  const past = sessions.filter(s => s.status !== 'upcoming' && s.status !== 'live');

  async function create() {
    setError(''); setNotice('');
    if (!title.trim()) return setError('اكتب عنوان البث');
    if (!courseId) return setError('اختر الكورس');
    if (mode === 'schedule' && !when) return setError('حدد تاريخ ووقت البث');
    setBusy('create');
    try {
      const res = await fetch('/api/live/create', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title, description, courseId, chapterId: chapterId || undefined, isImmediate: mode === 'now',
          scheduledAt: mode === 'schedule' ? new Date(when).toISOString() : undefined,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'تعذّر إنشاء البث');
      if (mode === 'now') { router.push(`/live/studio/${data.liveClass.id}`); return; }
      setNotice('تمت جدولة البث. سيظهر للطلاب المسجلين في الكورس.');
      setTitle(''); setDescription(''); setWhen(''); setMode(null);
      router.refresh();
    } catch (e) { setError(e instanceof Error ? e.message : 'تعذّر الاتصال بالخادم'); }
    finally { setBusy(null); }
  }

  async function act(id: string, action: 'cancel' | 'end') {
    if (!confirm(action === 'cancel' ? 'إلغاء هذه الجلسة؟ سيراها الطلاب ملغاة.' : 'إنهاء هذا البث للجميع؟')) return;
    setBusy(id); setError(''); setNotice('');
    try {
      const res = await fetch(`/api/live/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action }) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'تعذّر تحديث الجلسة');
      setNotice(action === 'cancel' ? 'أُلغيت الجلسة' : 'انتهى البث');
      router.refresh();
    } catch (e) { setError(e instanceof Error ? e.message : 'تعذّر الاتصال بالخادم'); }
    finally { setBusy(null); }
  }

  const row = (s: Session) => {
    const st = STATUS[s.status] ?? { label: s.status, color: '#fff' };
    const active = s.status === 'upcoming' || s.status === 'live';
    return (
      <div key={s.id} style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', justifyContent: 'space-between', alignItems: 'center', padding: '0.9rem 1rem', borderRadius: 14, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
        <div style={{ display: 'grid', gap: 4, minWidth: 0 }}>
          <strong>{s.title}</strong>
          <span style={{ fontSize: '0.85rem', opacity: 0.75 }}>{s.courseTitle}{s.chapterTitle ? ` • ${s.chapterTitle}` : ''} • {fmt(s.scheduledAt)}{!s.isOwn ? ' • مدرّب آخر' : ''}</span>
          <span style={{ fontSize: '0.8rem', color: st.color, fontWeight: 'bold' }}>{st.label}{s.startedAt ? ` • بدأ ${fmt(s.startedAt)}` : ''}{s.endedAt ? ` • انتهى ${fmt(s.endedAt)}` : ''}</span>
        </div>
        {active && (
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <Link href={`/live/studio/${s.id}`} className="btn btn-solid" style={{ display: 'inline-flex', gap: 6, alignItems: 'center' }}><Video size={16} /> {s.status === 'live' ? 'العودة للاستوديو' : 'دخول الاستوديو وبدء البث'}</Link>
            {s.status === 'upcoming' && <button type="button" className="btn" disabled={busy === s.id} onClick={() => act(s.id, 'cancel')}><XCircle size={16} /> إلغاء</button>}
            {s.status === 'live' && <button type="button" className="btn" disabled={busy === s.id} onClick={() => act(s.id, 'end')}><StopCircle size={16} /> إنهاء</button>}
          </div>
        )}
      </div>
    );
  };

  return (
    <div dir="rtl" style={{ padding: 'clamp(1rem, 3vw, 2rem)', maxWidth: 1000, margin: '0 auto', color: '#fff', fontFamily: "'Cairo', sans-serif" }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.25rem', flexWrap: 'wrap' }}>
        <Link href="/instructor" aria-label="العودة للوحة المدرّب" style={{ display: 'inline-flex', background: 'rgba(255,255,255,0.05)', padding: '0.5rem', borderRadius: '50%', color: '#fff' }}><ArrowRight size={20} /></Link>
        <h1 style={{ fontSize: 'clamp(1.4rem, 4vw, 2rem)', fontWeight: 'bold' }}>بثوثي المباشرة</h1>
      </div>

      {!livekit.ready && (
        <div role="alert" style={{ display: 'flex', gap: 10, alignItems: 'flex-start', padding: '1rem', borderRadius: 14, background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.35)', marginBottom: '1.25rem', lineHeight: 1.8 }}>
          <AlertTriangle size={20} color="#f87171" style={{ flexShrink: 0, marginTop: 4 }} />
          <div>
            <strong>خدمة البث غير مهيأة على الخادم.</strong> يمكنك جدولة الجلسات، لكن الاستوديو لن يتصل حتى يضبط المالك إعدادات LiveKit في Coolify.
            {livekit.missing.length > 0 && <div style={{ fontSize: '0.85rem', opacity: 0.85 }} dir="ltr">Missing: {livekit.missing.join(', ')}</div>}
            {livekit.invalidUrl && <div style={{ fontSize: '0.85rem', opacity: 0.85 }}>NEXT_PUBLIC_LIVEKIT_URL يجب أن يبدأ بـ wss://</div>}
          </div>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
        {([['now', 'إنشاء بث مباشر', 'ابدأ الآن: ينتقل بك إلى الاستوديو، ويصبح البث «مباشراً» فور اتصالك.', Radio, '#ef4444'],
           ['schedule', 'جدولة بث مباشر', 'حدد موعداً؛ يظهر للطلاب المسجلين كجلسة قادمة، وتبدأ من هنا في موعدها.', Calendar, 'var(--primary)']] as const)
          .map(([key, label, hint, Icon, color]) => (
            <button key={key} type="button" onClick={() => { setMode(key); setError(''); setNotice(''); }} aria-pressed={mode === key}
              style={{ textAlign: 'right', padding: '1.25rem', borderRadius: 18, cursor: 'pointer', color: '#fff', fontFamily: 'inherit',
                background: mode === key ? 'rgba(203,161,83,0.08)' : 'var(--ink-3)', border: `1px solid ${mode === key ? 'var(--primary)' : 'rgba(255,255,255,0.07)'}` }}>
              <Icon size={26} color={color} />
              <div style={{ fontWeight: 'bold', fontSize: '1.1rem', margin: '0.5rem 0 0.25rem' }}>{label}</div>
              <div style={{ fontSize: '0.88rem', opacity: 0.75, lineHeight: 1.7 }}>{hint}</div>
            </button>
          ))}
      </div>

      {mode && (
        <section style={{ background: 'var(--ink-3)', borderRadius: 18, padding: 'clamp(1rem, 3vw, 1.5rem)', border: '1px solid rgba(255,255,255,0.07)', marginBottom: '1.5rem' }}>
          <h2 style={{ fontSize: '1.15rem', marginBottom: '1rem' }}>{mode === 'now' ? 'بث فوري' : 'جلسة مجدولة'}</h2>
          {courses.length === 0 ? (
            <p style={{ opacity: 0.8 }}>{staff ? 'لا توجد كورسات على المنصة بعد.' : 'لا تملك كورسات بعد.'} <Link href="/instructor/courses/create" style={{ color: 'var(--primary)' }}>أنشئ كورساً</Link></p>
          ) : <>
            <label style={field}>عنوان البث *<input className="input-field" value={title} maxLength={200} onChange={e => setTitle(e.target.value)} placeholder="مثال: جلسة مراجعة الفصل الثالث" /></label>
            <label style={field}>وصف (اختياري)<textarea className="input-field" rows={2} value={description} maxLength={5000} onChange={e => setDescription(e.target.value)} /></label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
              <label style={field}>الكورس *
                <select className="input-field" value={courseId} onChange={e => { setCourseId(e.target.value); setChapterId(''); }}>
                  {courses.map(c => <option key={c.id} value={c.id}>{c.title}{staff && !c.ownCourse ? ' (مدرّب آخر)' : ''}</option>)}
                </select>
              </label>
              <label style={field}>إضافته كدرس في فصل (اختياري)
                <select className="input-field" value={chapterId} onChange={e => setChapterId(e.target.value)}>
                  <option value="">— بدون درس، يظهر في صفحة البثوث فقط —</option>
                  {chapters.map(ch => <option key={ch.id} value={ch.id}>{ch.title}</option>)}
                </select>
              </label>
              {mode === 'schedule' && <label style={field}>التاريخ والوقت *<input className="input-field" type="datetime-local" value={when} onChange={e => setWhen(e.target.value)} dir="ltr" /></label>}
            </div>
            <button type="button" className="btn btn-solid" disabled={busy === 'create'} onClick={create} style={{ display: 'inline-flex', gap: 8, alignItems: 'center' }}>
              {busy === 'create' ? <><Loader2 size={18} className="kq-spin" /> جاري الإنشاء…</> : mode === 'now' ? <><Radio size={18} /> ابدأ البث الآن</> : <><Calendar size={18} /> حفظ الموعد</>}
            </button>
          </>}
        </section>
      )}

      <p role="status" aria-live="polite" style={{ minHeight: '1.4em', color: 'var(--gold-300)' }}>{notice}</p>
      {error && <p role="alert" style={{ color: '#f87171', marginBottom: '1rem' }}>{error}</p>}

      <h2 style={{ fontSize: '1.2rem', margin: '0.5rem 0 0.75rem' }}>الجلسات القادمة والمباشرة ({open.length})</h2>
      <div style={{ display: 'grid', gap: 10, marginBottom: '1.5rem' }}>{open.length ? open.map(row) : <p style={{ opacity: 0.65 }}>لا توجد جلسات قادمة.</p>}</div>

      {legacy.length > 0 && <>
        <h2 style={{ fontSize: '1.1rem', margin: '0.5rem 0 0.75rem' }}>دروس بث مُجدولة سابقاً</h2>
        <div style={{ display: 'grid', gap: 10, marginBottom: '1.5rem' }}>
          {legacy.map(l => (
            <div key={l.id} style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', gap: 8, padding: '0.8rem 1rem', borderRadius: 14, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
              <span><strong>{l.title}</strong> <span style={{ opacity: 0.7, fontSize: '0.85rem' }}>• {l.courseTitle} • {l.chapterTitle}{l.liveStartTime ? ` • ${fmt(l.liveStartTime)}` : ''}</span></span>
              <Link href={`/instructor/courses/${l.courseId}/live/${l.id}`} className="btn" style={{ display: 'inline-flex', gap: 6, alignItems: 'center' }}><ExternalLink size={15} /> فتح استوديو الدرس</Link>
            </div>
          ))}
        </div>
      </>}

      {past.length > 0 && <>
        <h2 style={{ fontSize: '1.1rem', margin: '0.5rem 0 0.75rem', opacity: 0.85 }}>السجل</h2>
        <div style={{ display: 'grid', gap: 10 }}>{past.slice(0, 50).map(row)}</div>
      </>}
      <style>{`.kq-spin{animation:kqspin 1s linear infinite}@keyframes kqspin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}
