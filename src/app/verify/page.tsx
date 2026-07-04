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
      minHeight: '100vh',
      background: '#050505',
      color: '#fff',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '2rem',
      fontFamily: 'system-ui, -apple-system, sans-serif'
    }}>
      {/* Background Glow */}
      <div style={{
        position: 'fixed', top: '20%', left: '50%', transform: 'translateX(-50%)',
        width: '600px', height: '600px', borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(59,130,246,0.08) 0%, transparent 70%)',
        pointerEvents: 'none'
      }} />

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
            background: 'rgba(59,130,246,0.1)',
            borderRadius: '50%',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 2rem auto',
            border: '1px solid rgba(59,130,246,0.2)',
            boxShadow: '0 0 40px rgba(59,130,246,0.15)'
          }}
        >
          <ShieldCheck size={50} color="#3b82f6" />
        </motion.div>

        <h1 style={{ fontSize: '2.5rem', fontWeight: 'bold', marginBottom: '1rem', lineHeight: 1.2 }}>
          التحقق من صحة الشهادات
        </h1>
        <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '1.1rem', marginBottom: '3rem', lineHeight: 1.6 }}>
          ادخل رقم معرّف الشهادة (Certificate ID) الموجود أسفل الشهادة للتحقق من صحتها وصدورها من أكاديمية K&Q.
        </p>

        {/* Form */}
        <form onSubmit={handleVerify}>
          <div style={{
            background: '#111', borderRadius: '20px',
            padding: '2rem',
            border: '1px solid rgba(255,255,255,0.08)',
            boxShadow: '0 20px 40px rgba(0,0,0,0.4)'
          }}>
            <label style={{ display: 'block', textAlign: 'right', fontSize: '0.9rem', color: 'rgba(255,255,255,0.6)', marginBottom: '0.75rem' }}>
              رقم معرّف الشهادة
            </label>
            <div style={{ position: 'relative', marginBottom: '1.5rem' }}>
              <Award size={20} style={{ position: 'absolute', right: '1.2rem', top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.3)' }} />
              <input
                type="text"
                value={certId}
                onChange={(e) => { setCertId(e.target.value); setError(''); }}
                placeholder="مثال: CERT-2026-8941"
                style={{
                  width: '100%',
                  padding: '1rem 1rem 1rem 3rem',
                  background: 'rgba(255,255,255,0.04)',
                  border: error ? '1px solid #ef4444' : '1px solid rgba(255,255,255,0.1)',
                  borderRadius: '14px',
                  color: '#fff',
                  fontSize: '1.1rem',
                  fontFamily: 'monospace',
                  outline: 'none',
                  direction: 'ltr',
                  textAlign: 'left'
                }}
              />
            </div>

            {error && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#ef4444', fontSize: '0.9rem', marginBottom: '1rem', textAlign: 'right' }}>
                <AlertCircle size={16} /> {error}
              </div>
            )}

            <button
              type="submit"
              style={{
                width: '100%',
                padding: '1rem',
                background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)',
                color: '#fff',
                border: 'none',
                borderRadius: '14px',
                fontWeight: 'bold',
                fontSize: '1.1rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem',
                boxShadow: '0 4px 20px rgba(59,130,246,0.3)'
              }}
            >
              <Search size={20} /> تحقق الآن
            </button>
          </div>
        </form>

        {/* Info Boxes */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginTop: '2rem' }}>
          {[
            { icon: '🔒', title: 'موثّقة رقمياً', desc: 'كل شهادة تحمل توقيعاً رقمياً فريداً' },
            { icon: '⚡', title: 'فوري ومجاني', desc: 'نتيجة التحقق خلال ثوانٍ بدون تسجيل' },
          ].map((item, i) => (
            <div key={i} style={{ background: '#111', padding: '1.5rem', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.05)', textAlign: 'right' }}>
              <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>{item.icon}</div>
              <div style={{ fontWeight: 'bold', marginBottom: '0.3rem' }}>{item.title}</div>
              <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.85rem' }}>{item.desc}</div>
            </div>
          ))}
        </div>
      </motion.div>
    </div>
  );
}
