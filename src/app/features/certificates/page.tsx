'use client';

import Link from 'next/link';

export default function CertificatesFeature() {
  const certificateHash = "0x8f3d1d95066ceb01a2b3c4d5e6f7g8h9";
  
  return (
    <div className="container">
      <nav className="nav">
        <Link href="/">العودة للرئيسية</Link>
        <Link href="/features/ar-labs">الميزة التالية ➡️</Link>
      </nav>

      <div className="glass-card" style={{ maxWidth: '800px', margin: '0 auto' }}>
        <h2 className="feature-title">📜 شهادات موثقة بتقنية البلوك تشين</h2>
        <p style={{ marginBottom: '2rem', opacity: 0.8 }}>
          شهادات رقمية لا يمكن تزويرها بفضل التوثيق اللامركزي، جاهزة للمشاركة المباشرة على LinkedIn.
        </p>

        <div style={{ background: '#fff', color: '#000', padding: '3rem', borderRadius: '8px', border: '10px solid #d1d5db', textAlign: 'center', position: 'relative', marginBottom: '2rem' }}>
          <div style={{ position: 'absolute', top: '1rem', right: '1rem', width: '80px', height: '80px', border: '2px solid #000', padding: '0.2rem' }}>
            {/* QR Code Placeholder */}
            <div style={{ width: '100%', height: '100%', background: 'repeating-linear-gradient(45deg, #000, #000 5px, #fff 5px, #fff 10px)' }}></div>
          </div>
          
          <h1 style={{ fontSize: '2.5rem', color: '#1e3a8a', marginBottom: '0.5rem', fontFamily: 'serif' }}>شهادة إتمام دورة</h1>
          <h3 style={{ color: '#4b5563', marginBottom: '3rem' }}>منصة التعليم الإلكتروني السورية</h3>
          
          <p style={{ fontSize: '1.2rem', marginBottom: '1rem' }}>تشهد المنصة بأن الطالب:</p>
          <h2 style={{ fontSize: '2rem', borderBottom: '2px solid #000', display: 'inline-block', paddingBottom: '0.5rem', marginBottom: '2rem' }}>أحمد محمد</h2>
          
          <p style={{ fontSize: '1.2rem', marginBottom: '3rem' }}>قد أتم بنجاح متطلبات دورة <strong>"مقدمة في البرمجة المتقدمة"</strong></p>
          
          <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid #ccc', paddingTop: '1rem', fontSize: '0.9rem', color: '#6b7280' }}>
            <span>التاريخ: 18 يونيو 2026</span>
            <span>المدير المعتمد: د. فادي</span>
          </div>
        </div>

        <div style={{ background: 'var(--secondary)', padding: '1.5rem', borderRadius: '8px', marginBottom: '1rem' }}>
          <p style={{ marginBottom: '0.5rem' }}><strong>التحقق من صحة الشهادة (Blockchain Hash):</strong></p>
          <code style={{ background: 'var(--background)', padding: '0.5rem', borderRadius: '4px', display: 'block', wordBreak: 'break-all', color: 'var(--success)' }}>
            {certificateHash}
          </code>
        </div>

        <button className="btn" style={{ width: '100%', background: '#0a66c2', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
          <span>in</span> إضافة إلى الملف الشخصي على LinkedIn
        </button>
      </div>
    </div>
  );
}
