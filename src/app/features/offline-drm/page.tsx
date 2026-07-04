'use client';

import { useState } from 'react';
import Link from 'next/link';

export default function OfflineDrmFeature() {
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [isDownloaded, setIsDownloaded] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);

  const simulateDownload = () => {
    setDownloadProgress(10);
    const interval = setInterval(() => {
      setDownloadProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          setIsDownloaded(true);
          return 100;
        }
        return prev + 15;
      });
    }, 500);
  };

  const playProtectedContent = () => {
    setIsPlaying(true);
  };

  return (
    <div className="container">
      <nav className="nav">
        <Link href="/">العودة للرئيسية</Link>
        <Link href="/features/assessment">الميزة التالية ➡️</Link>
      </nav>

      <div className="glass-card" style={{ maxWidth: '800px', margin: '0 auto' }}>
        <h2 className="feature-title">🔒 وضع عدم الاتصال وإدارة الحقوق الرقمية (DRM)</h2>
        <p style={{ marginBottom: '2rem', opacity: 0.8 }}>
          حماية الفيديوهات من القرصنة من خلال التشفير. يمكن للطلاب تحميل الفيديوهات لمشاهدتها بدون إنترنت، ولكن فقط داخل مشغل التطبيق.
        </p>

        <div style={{ background: 'rgba(0,0,0,0.3)', padding: '2rem', borderRadius: '12px', textAlign: 'center' }}>
          <h3 style={{ marginBottom: '1rem' }}>الدرس 1: أساسيات البرمجة</h3>
          <div style={{ margin: '2rem 0' }}>
            {isPlaying ? (
              <div style={{ background: '#000', height: '200px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '8px', color: '#10b981' }}>
                ▶️ يتم تشغيل المحتوى المشفر محلياً... (بدون إنترنت)
              </div>
            ) : (
              <div style={{ height: '200px', border: '2px dashed var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '8px' }}>
                مشغل الفيديو محمي بتقنية DRM
              </div>
            )}
          </div>

          {!isDownloaded ? (
            <div>
              <button className="btn" onClick={simulateDownload} disabled={downloadProgress > 0}>
                {downloadProgress > 0 ? `جاري التشفير والتحميل ${downloadProgress}%` : 'تحميل الدرس آمن'}
              </button>
              {downloadProgress > 0 && (
                <div style={{ width: '100%', background: 'var(--secondary)', height: '8px', marginTop: '1rem', borderRadius: '4px' }}>
                  <div style={{ width: `${downloadProgress}%`, background: 'var(--success)', height: '100%', borderRadius: '4px', transition: 'width 0.3s ease' }}></div>
                </div>
              )}
            </div>
          ) : (
            <div>
              <p style={{ color: 'var(--success)', marginBottom: '1rem' }}>✅ تم تحميل الملف المشفر بنجاح في IndexedDB</p>
              <button className="btn" onClick={playProtectedContent} style={{ background: 'var(--success)' }}>
                تشغيل بدون إنترنت
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
