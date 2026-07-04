'use client';

import Link from 'next/link';
import { useState } from 'react';

export default function ARLabsFeature() {
  const [isARActive, setIsARActive] = useState(false);

  return (
    <div className="container">
      <nav className="nav">
        <Link href="/">العودة للرئيسية</Link>
      </nav>

      <div className="glass-card" style={{ maxWidth: '800px', margin: '0 auto' }}>
        <h2 className="feature-title">🔬 مختبرات الواقع المعزز (AR)</h2>
        <p style={{ marginBottom: '2rem', opacity: 0.8 }}>
          تجربة تعليمية ثلاثية الأبعاد تفاعلية تتيح لطلاب العلوم والطب عرض المجسمات بشكل واقعي من خلال كاميرا الهاتف (باستخدام WebXR).
        </p>

        <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem', overflowX: 'auto', paddingBottom: '1rem' }}>
          <div style={{ background: 'var(--secondary)', minWidth: '150px', padding: '1rem', borderRadius: '8px', textAlign: 'center', cursor: 'pointer', border: '2px solid var(--primary)' }}>
            <div style={{ fontSize: '3rem', marginBottom: '0.5rem' }}>🫀</div>
            <p>قلب الإنسان</p>
          </div>
          <div style={{ background: 'var(--secondary)', minWidth: '150px', padding: '1rem', borderRadius: '8px', textAlign: 'center', cursor: 'pointer', opacity: 0.5 }}>
            <div style={{ fontSize: '3rem', marginBottom: '0.5rem' }}>⚛️</div>
            <p>الذرة</p>
          </div>
          <div style={{ background: 'var(--secondary)', minWidth: '150px', padding: '1rem', borderRadius: '8px', textAlign: 'center', cursor: 'pointer', opacity: 0.5 }}>
            <div style={{ fontSize: '3rem', marginBottom: '0.5rem' }}>🧬</div>
            <p>الحمض النووي (DNA)</p>
          </div>
        </div>

        <div style={{ background: '#000', height: '400px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', overflow: 'hidden', border: '1px solid var(--border)' }}>
          {isARActive ? (
            <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'radial-gradient(circle, rgba(59,130,246,0.2) 0%, rgba(0,0,0,1) 100%)' }}>
              <div style={{ animation: 'spin 10s linear infinite', fontSize: '8rem', textShadow: '0 0 20px rgba(239, 68, 68, 0.8)' }}>
                🫀
              </div>
              <p style={{ color: 'var(--success)', marginTop: '2rem', background: 'rgba(0,0,0,0.5)', padding: '0.5rem 1rem', borderRadius: '20px' }}>
                الكاميرا مفعلة... يمكنك توجيه الهاتف لرؤية المجسم في غرفتك.
              </p>
            </div>
          ) : (
            <div style={{ textAlign: 'center' }}>
              <p style={{ color: 'white', marginBottom: '1rem' }}>نموذج 3D: قلب الإنسان</p>
              <button className="btn" onClick={() => setIsARActive(true)}>
                تفعيل كاميرا الواقع المعزز (AR)
              </button>
            </div>
          )}
        </div>
      </div>
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes spin {
          0% { transform: rotateY(0deg); }
          100% { transform: rotateY(360deg); }
        }
      `}} />
    </div>
  );
}
