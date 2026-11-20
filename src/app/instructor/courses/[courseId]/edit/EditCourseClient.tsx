'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { BunnyUploadStatus } from '@/components/BunnyUploadStatus';
import { useBunnyUpload } from '@/hooks/use-bunny-upload';
import { FIELD_LABELS, type ChangeField } from '@/lib/course-change-request-labels';

type Course = { id: string; status: string; title: string; description: string | null; thumbnail: string | null; previewVideoUrl: string | null; includes: string[]; durationHours: number | null; category: string; price: number; priceSYP: number };
type ChangeRequest = { id: string; status: string; changes: Record<string, unknown>; reason: string | null; createdAt: string; reviewedAt: string | null };

const STATUS: Record<string, string> = { PENDING: 'قيد المراجعة', APPROVED: 'تمت الموافقة', REJECTED: 'مرفوض', CANCELLED: 'مسحوب' };

/** Resize an image to a JPEG data URL, the same way course creation stores covers. */
function compressImage(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('فشل قراءة الصورة'));
    reader.onload = event => {
      const img = new window.Image();
      img.onerror = () => reject(new Error('فشل قراءة الصورة'));
      img.onload = () => {
        const scale = Math.min(1, 800 / img.width, 600 / img.height);
        const canvas = document.createElement('canvas');
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        canvas.getContext('2d')?.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/jpeg', 0.75));
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  });
}

export default function EditCourseClient({ course, requests, categories }: { course: Course; requests: ChangeRequest[]; categories: string[] }) {
  const router = useRouter();
  const pending = requests.find(r => r.status === 'PENDING');
  const proposed = (pending?.changes ?? {}) as Partial<Record<ChangeField, unknown>>;
  const initial = <T,>(field: ChangeField, live: T): T => (Object.hasOwn(proposed, field) ? proposed[field] as T : live);

  const [title, setTitle] = useState(initial('title', course.title));
  const [description, setDescription] = useState(initial('description', course.description) ?? '');
  const [category, setCategory] = useState(initial('category', course.category));
  const [durationHours, setDurationHours] = useState(String(initial('durationHours', course.durationHours) ?? ''));
  const [price, setPrice] = useState(String(initial('price', course.price)));
  const [priceSYP, setPriceSYP] = useState(String(initial('priceSYP', course.priceSYP)));
  const [thumbnail, setThumbnail] = useState(initial('thumbnail', course.thumbnail));
  const [previewVideoUrl, setPreviewVideoUrl] = useState(initial('previewVideoUrl', course.previewVideoUrl) ?? '');
  const [includes, setIncludes] = useState<string[]>(initial('includes', course.includes) ?? []);
  const [feature, setFeature] = useState('');
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const upload = useBunnyUpload({ courseId: course.id, purpose: 'preview' });

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true); setError(''); setMessage('');
    try {
      let video = previewVideoUrl.trim();
      if (videoFile) {
        const result = await upload.upload(videoFile, `${title.trim()} - مقدمة`);
        video = result.embedUrl;
      }
      const response = await fetch(`/api/courses/${course.id}/change-requests`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, description, category, price, priceSYP, durationHours: durationHours.trim() ? durationHours : null, thumbnail, previewVideoUrl: video, includes }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || 'تعذّر إرسال الطلب');
      if (videoFile) { upload.complete(); setVideoFile(null); setPreviewVideoUrl(video); }
      setMessage(result.message || 'أُرسل الطلب إلى الإدارة');
      router.refresh();
    } catch (err) {
      if ((err as Error)?.name !== 'BunnyUploadPaused') setError(err instanceof Error ? err.message : 'تعذّر الاتصال');
    } finally { setBusy(false); }
  }

  async function withdraw() {
    if (!confirm('سحب طلب التعديل المفتوح؟')) return;
    setBusy(true); setError('');
    try {
      const response = await fetch(`/api/courses/${course.id}/change-requests`, { method: 'DELETE', headers: { 'Content-Type': 'application/json' } });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || 'تعذّر سحب الطلب');
      setMessage('تم سحب الطلب'); router.refresh();
    } catch (err) { setError(err instanceof Error ? err.message : 'تعذّر الاتصال'); }
    finally { setBusy(false); }
  }

  const field = { display: 'grid', gap: 6, marginBottom: '1rem' } as const;
  const input = { width: '100%', padding: '0.7rem', borderRadius: 8 } as const;
  return <>
    {course.status !== 'PUBLISHED' && <p style={{ padding: '0.75rem', borderRadius: 8, background: 'rgba(251,191,36,0.12)' }}>
      {course.status === 'PENDING' ? 'هذا الكورس بانتظار موافقة الإدارة على نشره.' : 'هذا الكورس غير منشور بقرار من الإدارة.'}
    </p>}
    {pending && <p style={{ padding: '0.75rem', borderRadius: 8, background: 'rgba(14,165,233,0.12)' }}>
      لديك طلب تعديل قيد المراجعة. إرسال النموذج يستبدل الطلب المفتوح. <button type="button" onClick={withdraw} disabled={busy}>سحب الطلب</button>
    </p>}
    <form onSubmit={submit}>
      <label style={field}>{FIELD_LABELS.title}<input style={input} required maxLength={200} value={title} onChange={e => setTitle(e.target.value)} /></label>
      <label style={field}>{FIELD_LABELS.description}<textarea style={{ ...input, minHeight: 160 }} maxLength={20000} value={description} onChange={e => setDescription(e.target.value)} /></label>
      <label style={field}>{FIELD_LABELS.category}
        <select style={input} required value={category} onChange={e => setCategory(e.target.value)}>
          {!categories.includes(category) && <option value={category}>{category}</option>}
          {categories.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
      </label>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
        <label style={field}>{FIELD_LABELS.price}<input style={input} type="number" min={0} step="0.01" required value={price} onChange={e => setPrice(e.target.value)} dir="ltr" /></label>
        <label style={field}>{FIELD_LABELS.durationHours}<input style={input} type="number" min={0.5} max={2000} step="0.5" value={durationHours} onChange={e => setDurationHours(e.target.value)} dir="ltr" /></label>
        <label style={field}>{FIELD_LABELS.priceSYP}<input style={input} type="number" min={0} step="1" required value={priceSYP} onChange={e => setPriceSYP(e.target.value)} dir="ltr" /></label>
      </div>
      <div style={field}>{FIELD_LABELS.thumbnail}
        {thumbnail && !thumbnail.startsWith('linear-gradient')
          // eslint-disable-next-line @next/next/no-img-element
          ? <img src={thumbnail} alt="صورة الغلاف" style={{ maxWidth: 320, borderRadius: 10 }} />
          : <span style={{ opacity: 0.7 }}>لا توجد صورة غلاف</span>}
        <input type="file" accept="image/jpeg,image/png,image/webp" disabled={busy} onChange={async e => {
          const file = e.target.files?.[0];
          if (!file) return;
          try { setThumbnail(await compressImage(file)); } catch (err) { setError((err as Error).message); }
        }} />
      </div>
      <div style={field}>{FIELD_LABELS.previewVideoUrl}
        <input style={input} dir="ltr" placeholder="https://player.mediadelivery.net/embed/…" value={previewVideoUrl} disabled={!!videoFile} onChange={e => setPreviewVideoUrl(e.target.value)} />
        <span>أو ارفع فيديو جديداً إلى Bunny Stream:</span>
        <input type="file" accept="video/*" disabled={busy || upload.locked} onChange={e => setVideoFile(e.target.files?.[0] ?? null)} />
        {videoFile && <BunnyUploadStatus state={upload.state} progress={upload.progress} onPause={upload.pause} busy={busy} />}
      </div>
      <div style={field}>{FIELD_LABELS.includes}
        <ul style={{ margin: 0 }}>{includes.map((item, i) => <li key={i}>{item} <button type="button" onClick={() => setIncludes(includes.filter((_, j) => j !== i))} aria-label={`حذف ${item}`}>×</button></li>)}</ul>
        <div style={{ display: 'flex', gap: 8 }}>
          <input style={input} maxLength={300} value={feature} onChange={e => setFeature(e.target.value)} placeholder="مثال: ملفات PDF قابلة للتحميل" />
          <button type="button" onClick={() => { if (feature.trim() && includes.length < 50) { setIncludes([...includes, feature.trim()]); setFeature(''); } }}>إضافة</button>
        </div>
      </div>
      {error && <p role="alert" style={{ color: '#ef4444' }}>{error}</p>}
      <p role="status" aria-live="polite">{message}</p>
      <button type="submit" disabled={busy} style={{ padding: '0.8rem 1.5rem', borderRadius: 10, fontWeight: 700 }}>
        {busy ? (videoFile ? 'جاري رفع الفيديو…' : 'جاري الإرسال…') : 'إرسال التعديلات للمراجعة'}
      </button>
    </form>

    <h2 style={{ marginTop: '2rem' }}>سجل طلبات التعديل</h2>
    {!requests.length && <p>لا توجد طلبات سابقة.</p>}
    <ul>{requests.map(r => <li key={r.id} style={{ marginBottom: 8 }}>
      <strong>{STATUS[r.status] ?? r.status}</strong> — {new Date(r.createdAt).toLocaleString('ar-JO', { timeZone: 'Asia/Amman' })}
      {' — '}{Object.keys(r.changes).map(k => FIELD_LABELS[k as ChangeField] ?? k).join('، ')}
      {r.reason && <div>السبب: {r.reason}</div>}
    </li>)}</ul>
  </>;
}
