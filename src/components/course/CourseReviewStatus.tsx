'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

/**
 * The administration's decision about a course, shown to its instructor:
 * - PENDING: waiting for review (nothing to do);
 * - REJECTED: edit the content, then send it back for review (it is never published directly).
 * Published courses show nothing. Content can be edited in every state.
 */
export default function CourseReviewStatus({ courseId, status }: { courseId: string; status: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  if (status !== 'PENDING' && status !== 'REJECTED') return null;

  const resubmit = async () => {
    setBusy(true); setMessage('');
    try {
      const res = await fetch(`/api/courses/${courseId}/resubmit`, { method: 'POST' });
      const data = await res.json().catch(() => ({}));
      if (res.ok) router.refresh();
      else setMessage(data.error || 'تعذّرت إعادة التقديم');
    } catch { setMessage('خطأ في الاتصال بالخادم'); }
    setBusy(false);
  };

  const pending = status === 'PENDING';
  return (
    <div role="status" style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '0.6rem', marginTop: '0.6rem' }}>
      <span style={{ padding: '0.3rem 0.8rem', borderRadius: 999, fontWeight: 700, fontSize: '0.85rem',
        background: pending ? 'rgba(251, 191, 36, 0.12)' : 'rgba(239, 83, 80, 0.12)', color: pending ? '#fbbf24' : 'var(--danger)' }}>
        {pending ? 'قيد مراجعة الإدارة — غير ظاهر للطلاب' : 'رفضت الإدارة نشر الكورس'}
      </span>
      {!pending ? (
        <button type="button" className="btn" onClick={resubmit} disabled={busy} style={{ padding: '0.35rem 0.9rem', fontSize: '0.85rem' }}>
          {busy ? 'جارٍ الإرسال…' : 'إعادة التقديم للمراجعة'}
        </button>
      ) : null}
      {message ? <span role="alert" style={{ color: 'var(--danger)', fontSize: '0.85rem' }}>{message}</span> : null}
    </div>
  );
}
