'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { ImageUp, Maximize2, Minimize2 } from 'lucide-react';
import CourseCover from '@/components/ui/CourseCover';
import styles from './CoverPicker.module.css';

export const COVER = { width: 1280, height: 720, maxSourceBytes: 10 * 1024 * 1024, types: ['image/jpeg', 'image/png', 'image/webp'] } as const;
const RATIO = COVER.width / COVER.height;

interface Source { url: string; width: number; height: number; name: string }

/**
 * The 16:9 crop the frame shows, in source pixels. `x`/`y` (0-100) choose which
 * part of the over-long side is kept, exactly like CSS object-position.
 */
export function coverCrop(width: number, height: number, x: number, y: number) {
  if (width / height > RATIO) {
    const w = height * RATIO;
    return { sx: (width - w) * (x / 100), sy: 0, sw: w, sh: height };
  }
  const h = width / RATIO;
  return { sx: 0, sy: (height - h) * (y / 100), sw: width, sh: h };
}

async function render(source: Source, mode: 'fill' | 'whole', x: number, y: number): Promise<Blob> {
  const img = new Image();
  img.src = source.url;
  await img.decode();
  const canvas = document.createElement('canvas');
  const crop = coverCrop(source.width, source.height, x, y);
  // Never upscale a fill crop: a small source stays sharp at its own size.
  const outW = mode === 'fill' ? Math.max(320, Math.min(COVER.width, Math.round(crop.sw))) : COVER.width;
  canvas.width = outW;
  canvas.height = Math.round(outW / RATIO);
  const ctx = canvas.getContext('2d')!;
  ctx.imageSmoothingQuality = 'high';
  if (mode === 'fill') {
    ctx.drawImage(img, crop.sx, crop.sy, crop.sw, crop.sh, 0, 0, canvas.width, canvas.height);
  } else {
    // Whole image over a blurred, dimmed copy that fills the frame (same look as the cards).
    const full = coverCrop(source.width, source.height, 50, 50);
    ctx.filter = 'blur(24px) brightness(0.55)';
    ctx.drawImage(img, full.sx, full.sy, full.sw, full.sh, -40, -24, canvas.width + 80, canvas.height + 48);
    ctx.filter = 'none';
    const scale = Math.min(canvas.width / source.width, canvas.height / source.height);
    const w = source.width * scale, h = source.height * scale;
    ctx.drawImage(img, (canvas.width - w) / 2, (canvas.height - h) / 2, w, h);
  }
  return new Promise((resolve, reject) => canvas.toBlob(blob => (blob ? resolve(blob) : reject(new Error('render'))), 'image/jpeg', 0.88));
}

/**
 * Course cover chooser: pick an image, see the real 16:9 result (cards use the
 * same frame), adjust the framing, then the prepared 1280x720 image is uploaded.
 * Existing covers are only shown, never altered.
 */
export default function CoverPicker({ value, onChange, disabled = false }: {
  value: string | null;
  onChange: (url: string | null) => void;
  disabled?: boolean;
}) {
  const id = useId().replace(/:/g, '');
  const input = useRef<HTMLInputElement>(null);
  const [source, setSource] = useState<Source | null>(null);
  const [mode, setMode] = useState<'fill' | 'whole'>('fill');
  const [x, setX] = useState(50);
  const [y, setY] = useState(40);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  // Release the local preview URL when it is replaced or the picker closes.
  useEffect(() => () => { if (source) URL.revokeObjectURL(source.url); }, [source]);

  const choose = async (file: File | undefined) => {
    setError('');
    if (!file) return;
    if (!(COVER.types as readonly string[]).includes(file.type)) { setError('اختر صورة JPG أو PNG أو WEBP'); return; }
    if (file.size > COVER.maxSourceBytes) { setError('حجم الصورة يجب أن يكون أقل من 10 ميغابايت'); return; }
    const url = URL.createObjectURL(file);
    try {
      const img = new Image();
      img.src = url;
      await img.decode();
      const ratio = img.naturalWidth / img.naturalHeight;
      setSource({ url, width: img.naturalWidth, height: img.naturalHeight, name: file.name });
      // Far from 16:9 (portrait, square, logo): showing it whole is the safer default.
      setMode(ratio < 1.3 || ratio > 2.4 ? 'whole' : 'fill');
      setX(50);
      setY(ratio < 1 ? 25 : 40);
    } catch {
      URL.revokeObjectURL(url);
      setError('تعذّر قراءة الصورة');
    }
  };

  const apply = async () => {
    if (!source) return;
    setBusy(true); setError('');
    try {
      const blob = await render(source, mode, x, y);
      const form = new FormData();
      form.append('file', new File([blob], 'course-cover.jpg', { type: 'image/jpeg' }));
      const res = await fetch('/api/upload', { method: 'POST', body: form });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || typeof data.url !== 'string') throw new Error(data.error || 'upload');
      onChange(data.url);
      setSource(null);
      if (input.current) input.current.value = '';
    } catch (e) {
      setError(e instanceof Error && e.message !== 'upload' && e.message !== 'render' ? e.message : 'تعذّر رفع الغلاف؛ حاول مجدداً');
    } finally { setBusy(false); }
  };

  const crop = source ? coverCrop(source.width, source.height, x, y) : null;
  const lowResolution = source && (mode === 'fill' ? crop!.sw < COVER.width : Math.max(source.width / RATIO, source.height) < COVER.height);
  const wide = source ? source.width / source.height > RATIO : false;

  return (
    <div className={styles.root}>
      <div className={styles.frame} aria-live="polite">
        {source ? (
          mode === 'fill' ? (
            // eslint-disable-next-line @next/next/no-img-element -- local preview of an unsaved file
            <img src={source.url} alt="معاينة الغلاف" className={styles.preview} style={{ objectPosition: `${x}% ${y}%` }} />
          ) : (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element -- local preview of an unsaved file */}
              <img src={source.url} alt="" aria-hidden="true" className={styles.backdrop} />
              {/* eslint-disable-next-line @next/next/no-img-element -- local preview of an unsaved file */}
              <img src={source.url} alt="معاينة الغلاف" className={styles.whole} />
            </>
          )
        ) : (
          <CourseCover src={value} alt={value ? 'الغلاف الحالي' : ''} sizes="(max-width: 640px) 100vw, 560px" />
        )}
      </div>

      <p className={styles.hint}>
        المقاس الموصى به 1280×720 أو أعلى (نسبة 16:9). ما تراه في الإطار هو ما سيظهر في البطاقات وصفحة الكورس.
      </p>

      {source ? (
        <div className={styles.controls}>
          <div className={styles.modes} role="radiogroup" aria-label="طريقة عرض الصورة">
            <label className={styles.mode} data-checked={mode === 'fill' ? '' : undefined}>
              <input type="radio" name={`${id}-mode`} checked={mode === 'fill'} onChange={() => setMode('fill')} />
              <Maximize2 size={15} aria-hidden="true" /> ملء الإطار
            </label>
            <label className={styles.mode} data-checked={mode === 'whole' ? '' : undefined}>
              <input type="radio" name={`${id}-mode`} checked={mode === 'whole'} onChange={() => setMode('whole')} />
              <Minimize2 size={15} aria-hidden="true" /> الصورة كاملة
            </label>
          </div>
          {mode === 'fill' && Math.abs(source.width / source.height - RATIO) > 0.01 ? (
            <label className={styles.slider}>
              {wide ? 'الموضع الأفقي' : 'الموضع العمودي'}
              <input type="range" min={0} max={100} value={wide ? x : y}
                onChange={e => (wide ? setX : setY)(Number(e.target.value))} aria-valuetext={`${wide ? x : y}%`} />
            </label>
          ) : null}
          <p className={styles.meta} dir="auto">
            {source.name} · <span dir="ltr">{source.width}×{source.height}</span>
            {lowResolution ? <span className={styles.warn}> · دقة أقل من الموصى به؛ قد تظهر الصورة غير حادة</span> : null}
          </p>
          <div className={styles.actions}>
            <button type="button" className="btn btn-solid" onClick={apply} disabled={busy || disabled}>
              {busy ? 'جارٍ تجهيز الغلاف ورفعه…' : 'اعتماد هذا الغلاف'}
            </button>
            <button type="button" className="btn" onClick={() => { setSource(null); if (input.current) input.current.value = ''; }} disabled={busy}>
              تراجع
            </button>
          </div>
        </div>
      ) : (
        <div className={styles.actions}>
          <label className={`btn ${styles.pick}`} aria-disabled={disabled || undefined}>
            <ImageUp size={17} aria-hidden="true" /> {value ? 'تغيير الغلاف' : 'اختيار صورة الغلاف'}
            <input ref={input} type="file" accept={COVER.types.join(',')} hidden disabled={disabled}
              onChange={e => { void choose(e.target.files?.[0]); }} />
          </label>
          {value ? <button type="button" className="btn" onClick={() => onChange(null)} disabled={disabled}>إزالة الغلاف</button> : null}
        </div>
      )}
      {error ? <p role="alert" className={styles.error}>{error}</p> : null}
    </div>
  );
}
