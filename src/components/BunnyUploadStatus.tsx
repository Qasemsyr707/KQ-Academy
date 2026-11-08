'use client';

import type { BunnyUploadState } from '@/lib/bunny-upload';

const descriptions: Record<BunnyUploadState, string> = {
  Uploading: 'جاري رفع الفيديو...',
  Paused: 'تم إيقاف الرفع مؤقتاً، يمكنك استكماله عند الاستعداد',
  Retrying: 'جاري استعادة الاتصال لاستكمال رفع الفيديو...',
  Processing: 'جاري تجهيز الفيديو للمشاهدة...',
  Ready: 'الفيديو جاهز للمشاهدة',
  Failed: 'تعذّر رفع الفيديو، يرجى المحاولة مجدداً',
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
        <span>{descriptions[state]}</span>
        <span>{Math.round(progress * 100) / 100}%</span>
      </div>
      <progress max={100} value={progress} aria-label="تقدم نقل الفيديو" style={{ width: '100%', accentColor: 'var(--primary)' }} />
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
