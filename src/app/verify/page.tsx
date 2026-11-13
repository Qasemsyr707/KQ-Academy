'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ShieldCheck, Search, Award, AlertCircle } from 'lucide-react';
import { motion } from 'framer-motion';

export default function VerifyLandingPage() {
  const [certId, setCertId] = useState('');
  const [error, setError] = useState('');
  const router = useRouter();

  const handleVerify = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = certId.trim();
    if (!trimmed) {
      setError('يرجى إدخال رقم معرّف الشهادة');
      return;
    }
    router.push(`/verify/${trimmed}`);
  };

  return (
    <div style={{
      minHeight: 'calc(100vh - var(--nav-h))',
      color: 'var(--text-1)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 'clamp(2.5rem, 6vw, 4rem) var(--gutter)',
      position: 'relative',
      isolation: 'isolate'
    }}>
      {/* Background Glow */}
      <div style={{
        position: 'absolute', top: '5%', left: '50%', transform: 'translateX(-50%)',
        width: 'min(640px, 100vw)', aspectRatio: '1', borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(224,184,106,0.12) 0%, transparent 65%)',
        pointerEvents: 'none', zIndex: -1
      }} aria-hidden="true" />

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        style={{ width: '100%', maxWidth: '560px', textAlign: 'center' }}
      >
        {/* Icon */}
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', delay: 0.2 }}
          style={{
            width: '100px', height: '100px',
            background: 'linear-gradient(145deg, rgba(224,184,106,0.22), rgba(203,161,83,0.05))',
            borderRadius: '50%',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 2rem auto',
            border: '1px solid rgba(203,161,83,0.35)',
            boxShadow: '0 0 50px rgba(203,161,83,0.18)'
          }}
        >
          <ShieldCheck size={50} color="var(--gold-200)" aria-hidden="true" />
        </motion.div>

        <h1 style={{ fontSize: '2.5rem', fontWeight: 'bold', marginBottom: '1rem', lineHeight: 1.2 }}>
          التحقق من صحة <span className="text-gold">الشهادات</span>
        </h1>
        <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '1.1rem', marginBottom: '3rem', lineHeight: 1.6 }}>
          ادخل رقم معرّف الشهادة (Certificate ID) الموجود أسفل الشهادة للتحقق من صحتها وصدورها من أكاديمية K&Q.
        </p>

        {/* Form */}
        <form onSubmit={handleVerify}>
          <div className="glass-panel" style={{
            padding: 'clamp(1.5rem, 4vw, 2rem)',
            borderColor: 'var(--line-gold)'
          }}>
            <label htmlFor="verify-cert-id" style={{ display: 'block', textAlign: 'right', fontSize: '0.9rem', color: 'rgba(255,255,255,0.6)', marginBottom: '0.75rem' }}>
              رقم معرّف الشهادة
            </label>
            <div style={{ position: 'relative', marginBottom: '1.5rem' }}>
              <Award size={20} aria-hidden="true" style={{ position: 'absolute', right: '1.2rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--gold-300)' }} />
              <input
                id="verify-cert-id"
                aria-invalid={!!error}
                aria-describedby={error ? 'verify-error' : undefined}
                autoComplete="off"
                spellCheck={false}
                type="text"
                value={certId}
                onChange={(e) => { setCertId(e.target.value); setError(''); }}
                placeholder="مثال: CERT-2026-8941"
                style={{
                  width: '100%',
                  padding: '1rem 3rem 1rem 1rem',
                  background: 'rgba(255,255,255,0.04)',
                  borderColor: error ? 'var(--danger)' : undefined,
                  borderRadius: '14px',
                  fontSize: '1.1rem',
                  fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
                  direction: 'ltr',
                  textAlign: 'left'
                }}
              />
            </div>

            {error && (
              <div id="verify-error" role="alert" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#ff8a80', fontSize: '0.9rem', marginBottom: '1rem', textAlign: 'right' }}>
                <AlertCircle size={16} aria-hidden="true" /> {error}
              </div>
            )}

            <button type="submit" className="btn btn-solid btn-lg" style={{ width: '100%' }}>
              <Search size={20} aria-hidden="true" /> تحقق الآن
            </button>
          </div>
        </form>

        {/* Info Boxes */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 210px), 1fr))', gap: '1rem', marginTop: '2rem' }}>
          {[
            { icon: '🔒', title: 'موثّقة رقمياً', desc: 'كل شهادة تحمل توقيعاً رقمياً فريداً' },
            { icon: '⚡', title: 'فوري ومجاني', desc: 'نتيجة التحقق خلال ثوانٍ بدون تسجيل' },
          ].map((item, i) => (
            <div key={i} className="kq-surface" style={{ padding: '1.5rem', textAlign: 'right' }}>
              <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }} aria-hidden="true">{item.icon}</div>
              <div style={{ fontWeight: 'bold', marginBottom: '0.3rem' }}>{item.title}</div>
              <div style={{ color: 'var(--text-3)', fontSize: '0.85rem' }}>{item.desc}</div>
            </div>
          ))}
        </div>
      </motion.div>
    </div>
  );
}
