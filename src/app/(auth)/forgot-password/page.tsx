'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Mail, ArrowRight, ShieldCheck, AlertCircle } from 'lucide-react';
import { motion } from 'framer-motion';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setStatus('loading');
    
    // Simulate API call
    setTimeout(() => {
      if (email.includes('@')) {
        setStatus('success');
      } else {
        setStatus('error');
      }
    }, 1500);
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', background: '#050505', color: '#fff', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      {/* Background styling */}
      <div style={{ position: 'fixed', top: '-20%', left: '-10%', width: '70%', height: '70%', background: 'radial-gradient(circle, rgba(203,161,83,0.08) 0%, transparent 70%)', borderRadius: '50%', pointerEvents: 'none' }} />

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '2rem' }}>
        <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#fff', textDecoration: 'none', width: 'fit-content', fontWeight: 'bold' }}>
          <div style={{ width: '32px', height: '32px', background: 'var(--primary)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#000', fontWeight: '900', fontSize: '1.2rem' }}>
            KQ
          </div>
          <span style={{ fontSize: '1.2rem', letterSpacing: '1px' }}>أكاديمية</span>
        </Link>

        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} style={{ width: '100%', maxWidth: '440px', background: 'rgba(255,255,255,0.02)', padding: '3rem 2.5rem', borderRadius: '24px', border: '1px solid rgba(255,255,255,0.05)', backdropFilter: 'blur(10px)', boxShadow: '0 20px 40px rgba(0,0,0,0.5)' }}>
            
            {status === 'success' ? (
              <div style={{ textAlign: 'center' }}>
                <div style={{ width: '80px', height: '80px', background: 'rgba(34,197,94,0.1)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem auto', border: '1px solid rgba(34,197,94,0.2)' }}>
                  <ShieldCheck size={40} color="#22c55e" />
                </div>
                <h1 style={{ fontSize: '1.8rem', fontWeight: 'bold', marginBottom: '1rem' }}>تم إرسال الرابط بنجاح</h1>
                <p style={{ color: 'rgba(255,255,255,0.6)', marginBottom: '2rem', lineHeight: 1.6 }}>
                  أرسلنا رابط إعادة تعيين كلمة المرور إلى البريد الإلكتروني:<br/>
                  <strong style={{ color: '#fff' }}>{email}</strong>
                </p>
                <Link href="/login" style={{ display: 'block', width: '100%', padding: '1rem', background: 'rgba(255,255,255,0.1)', color: '#fff', textAlign: 'center', borderRadius: '12px', textDecoration: 'none', fontWeight: 'bold', transition: 'all 0.2s' }}>
                  العودة لتسجيل الدخول
                </Link>
              </div>
            ) : (
              <>
                <h1 style={{ fontSize: '2rem', fontWeight: 'bold', marginBottom: '0.5rem', textAlign: 'center' }}>نسيت كلمة المرور؟</h1>
                <p style={{ color: 'rgba(255,255,255,0.6)', textAlign: 'center', marginBottom: '2.5rem', fontSize: '0.95rem', lineHeight: 1.6 }}>
                  لا تقلق، أدخل بريدك الإلكتروني المسجل لدينا وسنرسل لك رابطاً لإنشاء كلمة مرور جديدة.
                </p>

                {status === 'error' && (
                  <div style={{ background: 'rgba(239,68,68,0.1)', color: '#ef4444', padding: '1rem', borderRadius: '12px', marginBottom: '1.5rem', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '0.5rem', border: '1px solid rgba(239,68,68,0.2)' }}>
                    <AlertCircle size={18} /> البريد الإلكتروني غير صحيح أو غير مسجل.
                  </div>
                )}

                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                  <div>
                    <label style={{ color: '#fff', fontSize: '0.9rem', marginBottom: '0.5rem', display: 'block' }}>البريد الإلكتروني</label>
                    <div style={{ position: 'relative' }}>
                      <Mail size={20} color="rgba(255,255,255,0.4)" style={{ position: 'absolute', right: '1rem', top: '50%', transform: 'translateY(-50%)' }} />
                      <input 
                        type="email" 
                        required
                        value={email}
                        onChange={(e) => { setEmail(e.target.value); setStatus('idle'); }}
                        placeholder="name@example.com"
                        style={{ width: '100%', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)', padding: '1rem 3rem 1rem 1rem', borderRadius: '12px', color: '#fff', fontSize: '1rem', transition: 'all 0.3s' }}
                      />
                    </div>
                  </div>

                  <button 
                    type="submit" 
                    disabled={status === 'loading'}
                    style={{ width: '100%', padding: '1rem', background: 'var(--primary)', color: '#000', border: 'none', borderRadius: '12px', fontSize: '1.05rem', fontWeight: 'bold', cursor: status === 'loading' ? 'not-allowed' : 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem', boxShadow: '0 4px 15px rgba(203,161,83,0.3)', opacity: status === 'loading' ? 0.7 : 1 }}
                  >
                    {status === 'loading' ? 'جاري الإرسال...' : 'إرسال رابط الاستعادة'}
                  </button>
                </form>

                <div style={{ marginTop: '2rem', textAlign: 'center' }}>
                  <Link href="/login" style={{ color: 'rgba(255,255,255,0.6)', textDecoration: 'none', fontSize: '0.95rem', display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }} className="hover:text-primary">
                    <ArrowRight size={16} /> تذكرت كلمة المرور؟ العودة للدخول
                  </Link>
                </div>
              </>
            )}
          </motion.div>
        </div>
      </div>
    </div>
  );
}
