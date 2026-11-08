'use client';

import { useEffect, useState } from 'react';
import { parseBunnyEmbed } from '@/lib/bunny-embed';
import { lessonPlaybackEndpoint } from '@/lib/lesson-links';
import { safeMediaUrl } from '@/lib/media-url';

const fill = { position: 'absolute' as const, inset: 0, width: '100%', height: '100%', border: 'none' };
const PLAYBACK_ERROR = 'تعذّر تشغيل الفيديو، يرجى المحاولة مجدداً';
class PlaybackResponseError extends Error {}

export function LessonMediaPlayer({ lessonId, title, onEnded, directUrl }: {
  lessonId?: string;
  title: string;
  onEnded?: () => void;
  directUrl?: string | null;
}) {
  const [result, setResult] = useState<{ id: string | undefined; url?: string; error?: string } | null>(null);
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    if (!lessonId) return;
    const controller = new AbortController();
    fetch(lessonPlaybackEndpoint(lessonId), { cache: 'no-store', signal: controller.signal })
      .then(async response => {
        const data = await response.json();
        if (!response.ok || typeof data.url !== 'string') throw new PlaybackResponseError(typeof data.error === 'string' ? data.error : PLAYBACK_ERROR);
        if (!controller.signal.aborted) setResult({ id: lessonId, url: data.url });
      })
      .catch(error => {
        if (!controller.signal.aborted) setResult({ id: lessonId, error: error instanceof PlaybackResponseError ? error.message : PLAYBACK_ERROR });
      });
    return () => controller.abort();
  }, [lessonId, retry]);

  const source = lessonId ? (result?.id === lessonId ? result.url : undefined) : directUrl;
  const error = result?.id === lessonId ? result?.error : undefined;
  const bunny = parseBunnyEmbed(source);
  const safeSource = safeMediaUrl(source);

  if (!safeSource || error) return (
    <div style={{ ...fill, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '1rem', color: '#fff', padding: '1rem', textAlign: 'center' }} role="status">
      <span>{error || (source || !lessonId ? 'الفيديو غير متاح للمشاهدة حالياً' : 'جاري تحميل الفيديو...')}</span>
      {error && <button type="button" className="btn btn-solid" onClick={() => { setResult(null); setRetry(value => value + 1); }}>إعادة المحاولة</button>}
    </div>
  );

  if (bunny) return <iframe key={safeSource} src={safeSource} title={title} loading="lazy" referrerPolicy="strict-origin-when-cross-origin" style={fill} allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowFullScreen />;

  const isAudio = /\.(mp3|wav|ogg|aac|m4a)(\?.*)?$/i.test(safeSource);
  const isImage = /\.(jpg|jpeg|png|gif|webp|svg)(\?.*)?$/i.test(safeSource);
  const isOwnFile = /^\/api\/files\/[^/?#]+(?:\?[^#]*)?$/.test(safeSource);
  const isPdf = /\.pdf(\?.*)?$/i.test(safeSource) || isOwnFile;
  if (isAudio) return <div style={{ ...fill, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#111' }}><audio src={safeSource} controls preload="none" onEnded={onEnded} style={{ width: '80%' }} /></div>;
  // eslint-disable-next-line @next/next/no-img-element
  if (isImage) return <img src={safeSource} alt={title} style={{ ...fill, objectFit: 'contain' }} />;
  if (isPdf && !isOwnFile) return <div role="status" style={{ ...fill, padding: '1.5rem', color: '#fff' }}>ملف الدرس الأصلي غير متوفر في التخزين المحمي. يجب على المدرّب إعادة رفع ملف PDF الأصلي؛ لا يمكن استعادة صفحاته من رابط صورة.</div>;
  if (isPdf) return (
    <div style={{ ...fill, display: 'flex', flexDirection: 'column' }}>
      <iframe src={safeSource} title={title} style={{ width: '100%', flex: 1, border: 0, background: '#fff' }} />
      <div style={{ padding: '0.6rem 1rem', background: '#0a0a0a', display: 'flex', flexWrap: 'wrap', gap: '0.75rem', justifyContent: 'space-between', color: 'rgba(255,255,255,0.6)', fontSize: '0.85rem' }}>
        <span>إذا لم يظهر المستند كاملاً، افتحه في نافذة جديدة أو حمّله.</span>
        <a href={safeSource} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--primary)' }}>فتح الملف بنافذة كاملة</a>
        <a href={`${safeSource}${safeSource.includes('?') ? '&' : '?'}download=1`} download style={{ color: 'var(--primary)' }}>تحميل الملف</a>
      </div>
    </div>
  );
  return <video key={safeSource} src={safeSource} controls autoPlay={!!lessonId} preload="none" onEnded={onEnded} onError={() => setResult({ id: lessonId, error: PLAYBACK_ERROR })} style={fill} />;
}
