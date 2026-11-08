'use client';

import { useEffect, useId, useRef, useState, type FormEvent } from 'react';
import { FileVideo, Link2, X } from 'lucide-react';
import { BunnyUploadPaused, useBunnyUpload } from '@/hooks/use-bunny-upload';
import { parseBunnyEmbed } from '@/lib/bunny-embed';
import { BunnyUploadStatus } from '@/components/BunnyUploadStatus';
import styles from './LessonVideoEditor.module.css';

interface EditableLesson {
  id: string;
  title: string;
  videoUrl?: string | null;
}

export function LessonVideoEditor({ courseId, chapterId, lesson, onClose, onSaved }: {
  courseId: string;
  chapterId: string;
  lesson?: EditableLesson;
  onClose: () => void;
  onSaved: (message: string) => void;
}) {
  const id = useId();
  const dialog = useRef<HTMLDivElement>(null);
  const [title, setTitle] = useState(lesson?.title ?? '');
  const [replaceVideo, setReplaceVideo] = useState(!lesson);
  const [source, setSource] = useState<'file' | 'url'>('file');
  const [file, setFile] = useState<File | null>(null);
  const [link, setLink] = useState('');
  const [error, setError] = useState('');
  const [phase, setPhase] = useState<'uploading' | 'saving' | 'linking' | null>(null);
  const saving = useRef(false);
  const operationId = useRef<string | null>(null);
  const upload = useBunnyUpload({ courseId, purpose: 'lesson' });
  const busy = phase !== null;

  useEffect(() => {
    const previousFocus = document.activeElement as HTMLElement | null;
    const panel = dialog.current;
    panel?.querySelector<HTMLInputElement>('input')?.focus();
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !saving.current) {
        event.preventDefault();
        onClose();
      }
      if (event.key !== 'Tab' || !panel) return;
      const items = Array.from(panel.querySelectorAll<HTMLElement>('button:not(:disabled), input:not(:disabled), textarea:not(:disabled), [tabindex="0"]'));
      const first = items[0];
      const last = items[items.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last?.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first?.focus();
      }
    };
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('keydown', handleKey);
      previousFocus?.focus();
    };
  }, [onClose]);

  const switchSource = (next: 'file' | 'url') => {
    if (saving.current) return;
    if (next === 'url') upload.pause();
    setSource(next);
    setError('');
  };

  const save = async (event: FormEvent) => {
    event.preventDefault();
    if (saving.current) return;
    setError('');
    if (!title.trim()) {
      setError('يرجى إدخال عنوان الدرس');
      return;
    }
    const parsedLink = replaceVideo && source === 'url' ? parseBunnyEmbed(link) : null;
    if (replaceVideo && source === 'url' && !parsedLink) {
      setError('يرجى إدخال رابط فيديو صالح');
      return;
    }
    if (replaceVideo && source === 'file' && !file) {
      setError('يرجى اختيار ملف الفيديو');
      return;
    }

    saving.current = true;
    let uploading = replaceVideo && source === 'file';
    setPhase(uploading ? 'uploading' : replaceVideo && source === 'url' ? 'linking' : 'saving');
    try {
      const payload: { title: string; videoUrl?: string; videoSource?: 'file' | 'url'; chapterId?: string; isLive?: boolean; operationId?: string } = { title: title.trim() };
      if (replaceVideo) {
        // Linking never enters the upload controller or creates a remote video.
        payload.videoUrl = source === 'url' ? parsedLink!.url : (await upload.upload(file!, title.trim())).embedUrl;
        payload.videoSource = source;
      }
      uploading = false;
      setPhase(replaceVideo && source === 'url' ? 'linking' : 'saving');
      if (!lesson) {
        operationId.current ??= crypto.randomUUID();
        payload.operationId = operationId.current;
        payload.chapterId = chapterId;
        payload.isLive = false;
      }
      const response = await fetch(lesson ? `/api/lessons/${lesson.id}` : '/api/lessons', {
        method: lesson ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await response.json().catch(() => null);
      if (!response.ok || !data?.lesson?.id) {
        setError(typeof data?.error === 'string' ? data.error : 'تعذّر حفظ الدرس، يرجى المحاولة مجدداً');
        return;
      }
      if (replaceVideo && source === 'file') upload.complete();
      onSaved(replaceVideo && source === 'url' ? 'تم ربط الفيديو بالدرس بنجاح' : 'تم حفظ الدرس بنجاح');
    } catch (cause) {
      if (!(cause instanceof BunnyUploadPaused)) {
        setError(uploading ? 'تعذّر رفع الفيديو، يرجى المحاولة مجدداً' : 'تعذّر تأكيد حفظ الدرس، يرجى التحقق من الاتصال والمحاولة مجدداً');
      }
    } finally {
      saving.current = false;
      setPhase(null);
    }
  };

  return (
    <div className={styles.backdrop}>
      <div ref={dialog} className={styles.dialog} role="dialog" aria-modal="true" aria-labelledby={`${id}-heading`} dir="rtl">
        <div className={styles.heading}>
          <h2 id={`${id}-heading`}>{lesson ? 'تعديل الدرس' : 'إضافة درس جديد'}</h2>
          <button type="button" className={styles.close} disabled={busy} onClick={onClose} aria-label="إغلاق نافذة الدرس"><X size={22} /></button>
        </div>
        <form onSubmit={save} noValidate className={styles.form}>
          <div>
            <label className={styles.label} htmlFor={`${id}-title`}>عنوان الدرس</label>
            <input autoComplete="off" id={`${id}-title`} className="input-field" value={title} maxLength={1000} disabled={busy} onChange={event => setTitle(event.target.value)} placeholder="مثال: مقدمة في بناء العلامة التجارية" />
          </div>

          {lesson && !replaceVideo ? (
            <div className={styles.current}>
              <span>{lesson.videoUrl ? 'الفيديو الحالي مرتبط بهذا الدرس' : 'لا يوجد فيديو مرتبط بهذا الدرس'}</span>
              <button type="button" className={styles.textButton} disabled={busy} onClick={() => setReplaceVideo(true)}>تغيير مصدر الفيديو</button>
            </div>
          ) : (
            <fieldset className={styles.fieldset} disabled={busy}>
              <legend className={styles.label}>مصدر الفيديو</legend>
              <div className={styles.sources}>
                <label className={`${styles.source} ${source === 'file' ? styles.selected : ''}`}>
                  <input type="radio" name={`${id}-source`} checked={source === 'file'} onChange={() => switchSource('file')} />
                  <FileVideo size={20} aria-hidden="true" />
                  <span>رفع فيديو من الجهاز</span>
                </label>
                <label className={`${styles.source} ${source === 'url' ? styles.selected : ''}`}>
                  <input type="radio" name={`${id}-source`} checked={source === 'url'} onChange={() => switchSource('url')} />
                  <Link2 size={20} aria-hidden="true" />
                  <span>إضافة رابط فيديو</span>
                </label>
              </div>
              <div key={source} className={styles.sourcePanel}>
                {source === 'file' ? (
                  <>
                    <label className={styles.label} htmlFor={`${id}-file`}>ملف الفيديو أو الصوت</label>
                    <input id={`${id}-file`} type="file" accept="video/*,audio/*" className="input-field" disabled={busy || upload.locked} onChange={event => { setFile(event.target.files?.[0] ?? null); setError(''); }} />
                    {file && <p className={styles.hint}>الملف المحدد: <bdi>{file.name}</bdi></p>}
                    <p className={styles.hint}>اختر الملف، ثم احفظ الدرس لبدء الرفع. يمكنك إيقاف الرفع مؤقتاً واستكماله.</p>
                  </>
                ) : (
                  <>
                    <label className={styles.label} htmlFor={`${id}-link`}>رابط الفيديو</label>
                    <textarea id={`${id}-link`} dir="ltr" className={`input-field ${styles.link}`} rows={3} value={link} maxLength={8000} onChange={event => { setLink(event.target.value); setError(''); }} placeholder="https://player.mediadelivery.net/embed/123/…" aria-describedby={`${id}-link-hint`} aria-invalid={!!error} />
                    <p id={`${id}-link-hint`} className={styles.hint}>ألصق رابط المشغل أو كود التضمين الرسمي من Bunny Stream. سيُربط الفيديو الموجود دون رفعه مجدداً.</p>
                  </>
                )}
              </div>
              {lesson && <button type="button" className={styles.textButton} onClick={() => { upload.pause(); setReplaceVideo(false); setError(''); }}>الاحتفاظ بالفيديو الحالي</button>}
            </fieldset>
          )}

          {replaceVideo && source === 'file' && <BunnyUploadStatus state={upload.state} progress={upload.progress} onPause={upload.pause} busy={busy} />}
          {error && <p role="alert" className={styles.error}>{error}</p>}
          {busy && <p role="status" aria-live="polite" className={styles.hint}>{phase === 'linking' ? 'جاري ربط الفيديو بالدرس...' : phase === 'uploading' ? upload.state === 'Processing' ? 'جاري تجهيز الفيديو للمشاهدة...' : 'جاري رفع الفيديو...' : 'جاري حفظ الدرس...'}</p>}
          <div className={styles.actions}>
            <button type="submit" disabled={busy} className="btn btn-solid">{busy ? phase === 'linking' ? 'جاري ربط الفيديو بالدرس...' : 'جاري الحفظ...' : lesson ? 'حفظ التعديلات' : 'حفظ الدرس'}</button>
            <button type="button" disabled={busy} className="btn" onClick={onClose}>إلغاء</button>
          </div>
        </form>
      </div>
    </div>
  );
}
