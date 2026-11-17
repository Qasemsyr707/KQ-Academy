'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Layers, X } from 'lucide-react';
import CourseTaxonomyFields, { type TaxonomyValue } from './CourseTaxonomyFields';

interface Props {
  course: { id: string; type: string; category: string; categoryId?: string | null; tags?: string[] | null; trainingType?: string | null };
}

/**
 * "Category and tags" button + dialog on the course management page, for the
 * course's instructor and administrators (the API checks ownership again).
 */
export default function CourseTaxonomyEditor({ course }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const initial = (): TaxonomyValue => ({ categoryId: course.categoryId ?? '', tags: course.tags ?? [], trainingType: course.trainingType ?? '' });
  const [value, setValue] = useState<TaxonomyValue>(initial);
  const dialogRef = useRef<HTMLDivElement>(null);

  // Escape closes the dialog; focus moves into it when it opens.
  useEffect(() => {
    if (!open) return;
    dialogRef.current?.querySelector<HTMLElement>('input, select, button')?.focus();
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') setOpen(false); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open]);

  const save = async () => {
    if (!value.categoryId) { setError('يرجى اختيار تصنيف الكورس'); return; }
    setSaving(true); setError('');
    try {
      const res = await fetch(`/api/courses/${course.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ categoryId: value.categoryId, tags: value.tags, trainingType: value.trainingType || null }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || 'تعذّر حفظ التصنيف');
      } else {
        setOpen(false);
        router.refresh();
      }
    } catch {
      setError('خطأ في الاتصال بالخادم');
    }
    setSaving(false);
  };

  return (
    <>
      <button type="button" onClick={() => { setValue(initial()); setError(''); setOpen(true); }} className="btn"
        style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(255,255,255,0.05)' }}>
        <Layers size={20} aria-hidden="true" /> التصنيف والوسوم
      </button>

      {open ? (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: '1rem' }}
          onMouseDown={event => { if (event.target === event.currentTarget) setOpen(false); }}>
          <div ref={dialogRef} className="glass-card" role="dialog" aria-modal="true" aria-labelledby="taxonomy-dialog-title"
            style={{ width: '100%', maxWidth: '760px', maxHeight: 'calc(100vh - 2rem)', overflowY: 'auto', padding: 'clamp(1.1rem, 3vw, 2rem)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', marginBottom: '1.25rem' }}>
              <h2 id="taxonomy-dialog-title" style={{ fontSize: '1.4rem', fontWeight: 'bold' }}>تصنيف الكورس والوسوم</h2>
              <button type="button" onClick={() => setOpen(false)} className="btn" style={{ padding: '0.5rem' }} aria-label="إغلاق">
                <X size={20} aria-hidden="true" />
              </button>
            </div>

            <CourseTaxonomyFields value={value} onChange={setValue} courseType={course.type}
              legacyCategory={course.categoryId ? null : course.category} />

            {error ? <p role="alert" style={{ color: 'var(--danger)', marginTop: '1rem' }}>{error}</p> : null}
            <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem' }}>
              <button type="button" onClick={save} disabled={saving} className="btn btn-solid" style={{ flex: 1 }}>
                {saving ? 'جاري الحفظ...' : 'حفظ التصنيف'}
              </button>
              <button type="button" onClick={() => setOpen(false)} className="btn" style={{ flex: 1, background: 'rgba(255,255,255,0.1)' }}>
                إلغاء
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
