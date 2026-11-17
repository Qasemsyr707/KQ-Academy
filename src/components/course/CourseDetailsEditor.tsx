'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { FilePenLine, X } from 'lucide-react';
import CoverPicker from './CoverPicker';

interface Props {
  course: { id: string; title: string; description?: string | null; thumbnail?: string | null; durationHours?: number | null };
}

const field: React.CSSProperties = { width: '100%', padding: '0.8rem', borderRadius: 8, background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff' };
const label: React.CSSProperties = { display: 'block', marginBottom: '0.5rem', color: 'rgba(255,255,255,0.85)', fontWeight: 600 };

/**
 * "Course details" button + dialog on the course management page: title,
 * description, duration and cover, for the course's instructor and administrators.
 * Price, status, featuring and ownership are not here (administration only).
 */
export default function CourseDetailsEditor({ course }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState(course.title);
  const [description, setDescription] = useState(course.description ?? '');
  const [duration, setDuration] = useState(course.durationHours ? String(course.durationHours) : '');
  const [thumbnail, setThumbnail] = useState<string | null>(course.thumbnail ?? null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const dialog = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    dialog.current?.querySelector<HTMLElement>('input, textarea, button')?.focus();
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') setOpen(false); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open]);

  const openEditor = () => {
    setTitle(course.title); setDescription(course.description ?? ''); setDuration(course.durationHours ? String(course.durationHours) : '');
    setThumbnail(course.thumbnail ?? null); setError(''); setOpen(true);
  };

  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!title.trim()) { setError('عنوان الكورس مطلوب'); return; }
    setSaving(true); setError('');
    try {
      const body: Record<string, unknown> = { title: title.trim(), description: description.trim() || null, durationHours: duration === '' ? null : Number(duration) };
      // An unchanged cover is not sent: old covers stay exactly as they are.
      if (thumbnail !== (course.thumbnail ?? null)) body.thumbnail = thumbnail;
      const res = await fetch(`/api/courses/${course.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || 'تعذّر حفظ بيانات الكورس');
      } else {
        setOpen(false);
        router.refresh();
      }
    } catch { setError('خطأ في الاتصال بالخادم'); }
    setSaving(false);
  };

  return (
    <>
      <button type="button" onClick={openEditor} className="btn" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(255,255,255,0.05)' }}>
        <FilePenLine size={20} aria-hidden="true" /> بيانات الكورس والغلاف
      </button>
      {open ? (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: '1rem' }}
          onMouseDown={event => { if (event.target === event.currentTarget && !saving) setOpen(false); }}>
          <div ref={dialog} className="glass-card" role="dialog" aria-modal="true" aria-labelledby="details-dialog-title"
            style={{ width: '100%', maxWidth: '720px', maxHeight: 'calc(100vh - 2rem)', overflowY: 'auto', padding: 'clamp(1.1rem, 3vw, 2rem)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', marginBottom: '1.25rem' }}>
              <h2 id="details-dialog-title" style={{ fontSize: '1.4rem', fontWeight: 'bold' }}>بيانات الكورس والغلاف</h2>
              <button type="button" onClick={() => setOpen(false)} className="btn" style={{ padding: '0.5rem' }} aria-label="إغلاق" disabled={saving}>
                <X size={20} aria-hidden="true" />
              </button>
            </div>
            <form onSubmit={save} style={{ display: 'grid', gap: '1.25rem' }}>
              <div>
                <label htmlFor="course-title" style={label}>عنوان الكورس</label>
                <input id="course-title" required maxLength={200} value={title} onChange={e => setTitle(e.target.value)} style={field} />
              </div>
              <div>
                <label htmlFor="course-description" style={label}>وصف الكورس</label>
                <textarea id="course-description" rows={5} maxLength={20000} value={description} onChange={e => setDescription(e.target.value)} style={{ ...field, resize: 'vertical' }} />
              </div>
              <div>
                <label htmlFor="course-duration" style={label}>مدة الكورس بالساعات <span style={{ opacity: 0.6, fontWeight: 400 }}>(اختياري)</span></label>
                <input id="course-duration" type="number" min={0.5} max={2000} step={0.5} value={duration} onChange={e => setDuration(e.target.value)} style={field} />
              </div>
              <div>
                <span style={label}>صورة الغلاف</span>
                <CoverPicker value={thumbnail} onChange={setThumbnail} disabled={saving} />
              </div>
              <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-3)' }}>
                السعر وحالة النشر والتمييز تُدار من الإدارة. ميزات الكورس والتصنيف لهما زرّان مستقلان في هذه الصفحة.
              </p>
              {error ? <p role="alert" style={{ color: 'var(--danger)', margin: 0 }}>{error}</p> : null}
              <div style={{ display: 'flex', gap: '1rem' }}>
                <button type="submit" disabled={saving} className="btn btn-solid" style={{ flex: 1 }}>{saving ? 'جاري الحفظ...' : 'حفظ البيانات'}</button>
                <button type="button" onClick={() => setOpen(false)} disabled={saving} className="btn" style={{ flex: 1, background: 'rgba(255,255,255,0.1)' }}>إلغاء</button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </>
  );
}
