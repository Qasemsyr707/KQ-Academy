'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

const STATES: Record<string, { label: string; tone: 'info' | 'warn' | 'danger'; action?: string }> = {
  DRAFT: { label: 'مسودة — غير ظاهرة للطلاب. أكمل المحتوى ثم أرسلها للمراجعة', tone: 'info', action: 'إرسال للمراجعة' },
  PENDING: { label: 'قيد مراجعة الإدارة — غير ظاهر للطلاب حتى الموافقة', tone: 'warn' },
  REJECTED: { label: 'رفضت الإدارة نشر الكورس. عدّل المحتوى ثم أعد تقديمه', tone: 'danger', action: 'إعادة التقديم للمراجعة' },
};
const TONES = {
  info: { background: 'rgba(148, 163, 184, 0.14)', color: 'var(--text-ivory)' },
  warn: { background: 'rgba(251, 191, 36, 0.12)', color: '#fbbf24' },
  danger: { background: 'rgba(239, 83, 80, 0.12)', color: 'var(--danger)' },
};

/**
 * The course's place in the review cycle, shown to its instructor (see lib/course-review.ts):
 * DRAFT and REJECTED can be sent for review; PENDING waits for the administration.
 * Only administrators publish. Published courses show nothing. Content can be edited in every state.
 */
export default function CourseReviewStatus({ courseId, status }: { courseId: string; status: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const state = STATES[status];
  if (!state) return null;

  const submit = async () => {
    setBusy(true); setMessage('');
    try {
      const res = await fetch(`/api/courses/${courseId}/submit`, { method: 'POST' });
      const data = await res.json().catch(() => ({}));
      if (res.ok) router.refresh();
      else setMessage(data.error || 'تعذّر الإرسال للمراجعة');
    } catch { setMessage('خطأ في الاتصال بالخادم'); }
    setBusy(false);
  };

  return (
    <div role="status" style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '0.6rem', marginTop: '0.6rem' }}>
      <span style={{ padding: '0.3rem 0.8rem', borderRadius: 999, fontWeight: 700, fontSize: '0.85rem', ...TONES[state.tone] }}>
        {state.label}
      </span>
      {state.action ? (
        <button type="button" className="btn" onClick={submit} disabled={busy} style={{ padding: '0.35rem 0.9rem', fontSize: '0.85rem' }}>
          {busy ? 'جارٍ الإرسال…' : state.action}
        </button>
      ) : null}
      {message ? <span role="alert" style={{ color: 'var(--danger)', fontSize: '0.85rem' }}>{message}</span> : null}
    </div>
  );
}
