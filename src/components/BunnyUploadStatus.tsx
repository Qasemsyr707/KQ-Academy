'use client';

import type { BunnyUploadState } from '@/lib/bunny-upload';

const descriptions: Record<BunnyUploadState, string> = {
  Uploading: 'جاري رفع الفيديو مباشرة إلى Bunny',
  Paused: 'الرفع متوقف مؤقتاً؛ يمكنك استكمال الجلسة المتاحة',
  Retrying: 'جاري استعادة الاتصال؛ قد تبدأ جلسة جديدة من الصفر إذا انتهت الجلسة السابقة',
  Processing: 'اكتمل نقل الملف؛ ننتظر انتهاء معالجة الفيديو قبل حفظه',
  Ready: 'الفيديو جاهز للعرض؛ الحفظ لا يتطلب إعادة رفع الملف',
  Failed: 'تعذر إكمال العملية؛ أعد المحاولة بنفس الملف لاستعادة الرفع المتاح',
};

export function BunnyUploadStatus({ state, progress, onPause, onResume, busy = false }: {
  state: BunnyUploadState | null;
  progress: number;
  onPause: () => void;
  onResume?: () => void;
  busy?: boolean;
}) {
  if (!state) return null;
  return (
    <div role="status" aria-live="polite" style={{ marginTop: '1rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem' }}>
        <span lang="en" dir="ltr">{state}</span>
        <span>{Math.round(progress * 100) / 100}%</span>
      </div>
      <progress max={100} value={progress} aria-label="تقدم نقل الفيديو" style={{ width: '100%', accentColor: 'var(--primary)' }} />
      <p style={{ fontSize: '0.85rem', margin: '0.5rem 0' }}>{descriptions[state]}</p>
      {(state === 'Uploading' || state === 'Retrying') && (
        <button type="button" className="btn" onClick={onPause}>إيقاف مؤقت</button>
      )}
      {(state === 'Paused' || state === 'Failed') && (
        <button type={onResume ? 'button' : 'submit'} className="btn" disabled={busy} onClick={onResume}>
          {state === 'Paused' ? 'استكمال الرفع' : 'إعادة المحاولة'}
        </button>
      )}
    </div>
  );
}
