'use client';

import { useState } from 'react';
import type { BunnyUploadProgress, BunnyUploadState } from '@/lib/bunny-upload';

const descriptions: Record<BunnyUploadState, string> = {
  Uploading: 'جاري رفع الفيديو...',
  Paused: 'تم إيقاف الرفع مؤقتاً، يمكنك استكماله عند الاستعداد',
  Retrying: 'انقطع الاتصال؛ جاري استعادته لاستكمال الرفع من حيث توقف...',
  Processing: 'اكتمل النقل؛ جاري تجهيز الفيديو للمشاهدة...',
  Ready: 'الفيديو جاهز للمشاهدة',
  Failed: 'تعذّر رفع الفيديو، يرجى المحاولة مجدداً',
};

const units = ['B', 'KB', 'MB', 'GB', 'TB'];
/** 1536 -> "1.5 KB" (Latin digits, like the rest of the dashboard). */
export function formatBytes(bytes: number): string {
  let value = Math.max(0, bytes);
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) { value /= 1024; unit++; }
  return `${value >= 100 || unit === 0 ? Math.round(value) : value.toFixed(1)} ${units[unit]}`;
}

/** Remaining time from the smoothed speed, or null while it cannot be estimated. */
export function remainingLabel(detail: BunnyUploadProgress): string | null {
  if (!detail.bytesPerSecond || detail.sent >= detail.total) return null;
  const seconds = Math.ceil((detail.total - detail.sent) / detail.bytesPerSecond);
  if (seconds < 60) return `${seconds} ث`;
  if (seconds < 3600) return `${Math.ceil(seconds / 60)} د`;
  return `${Math.floor(seconds / 3600)} س ${Math.ceil((seconds % 3600) / 60)} د`;
}

export function BunnyUploadStatus({ state, progress, detail, onPause, onResume, onCancel, busy = false }: {
  state: BunnyUploadState | null;
  progress: number;
  detail?: BunnyUploadProgress | null;
  onPause: () => void;
  onResume?: () => void;
  /** Stop and forget the upload; asks for confirmation first (its progress is lost). */
  onCancel?: () => void | Promise<void>;
  busy?: boolean;
}) {
  const [confirming, setConfirming] = useState(false);
  if (!state) return null;
  const transferring = state === 'Uploading' || state === 'Retrying' || state === 'Paused';
  const remaining = detail ? remainingLabel(detail) : null;
  return (
    <div style={{ marginTop: '1rem' }}>
      <div role="status" aria-live="polite">
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem' }}>
          <span>{descriptions[state]}</span>
          <span dir="ltr">{Math.round(progress * 100) / 100}%</span>
        </div>
        <progress max={100} value={progress} aria-label="تقدم نقل الفيديو" style={{ width: '100%', accentColor: 'var(--primary)' }} />
        {detail && transferring ? (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.25rem 1rem', fontSize: '0.85rem', color: 'var(--text-3)' }}>
            <span dir="ltr">{formatBytes(detail.sent)} / {formatBytes(detail.total)}</span>
            {state === 'Uploading' && detail.bytesPerSecond > 0 ? <span dir="ltr">{formatBytes(detail.bytesPerSecond)}/s</span> : null}
            {state === 'Uploading' && remaining ? <span>متبقٍّ تقريباً: {remaining}</span> : null}
          </div>
        ) : null}
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginTop: '0.5rem' }}>
        {(state === 'Uploading' || state === 'Retrying') && (
          <button type="button" className="btn" onClick={onPause}>إيقاف مؤقت</button>
        )}
        {(state === 'Paused' || state === 'Failed') && (
          <button type={onResume ? 'button' : 'submit'} className="btn" disabled={busy} onClick={onResume}>
            {state === 'Paused' ? 'استكمال الرفع' : 'إعادة المحاولة'}
          </button>
        )}
        {onCancel && state !== 'Ready' && !confirming && (
          <button type="button" className="btn" onClick={() => setConfirming(true)} style={{ background: 'rgba(239,83,80,0.12)', color: 'var(--danger)' }}>
            إلغاء الرفع
          </button>
        )}
      </div>
      {onCancel && confirming && state !== 'Ready' ? (
        <div role="alertdialog" aria-labelledby="bunny-cancel-title" style={{ marginTop: '0.75rem', padding: '0.75rem 1rem', borderRadius: 10,
          border: '1px solid rgba(239,83,80,0.4)', background: 'rgba(239,83,80,0.08)' }}>
          <p id="bunny-cancel-title" style={{ margin: '0 0 0.6rem' }}>
            {state === 'Processing'
              ? 'اكتمل نقل الفيديو وهو قيد التجهيز. إلغاء الآن يعني عدم ربطه بالدرس، ولن يُحذف من مكتبة الفيديو.'
              : 'سيتوقف الرفع ولن يمكن استكماله من النقطة الحالية؛ رفع الملف لاحقاً يبدأ من الصفر.'}
          </p>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button type="button" className="btn" style={{ background: 'var(--danger)', color: '#fff' }}
              onClick={async () => { setConfirming(false); await onCancel(); }}>تأكيد الإلغاء</button>
            <button type="button" className="btn" onClick={() => setConfirming(false)}>متابعة الرفع</button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
