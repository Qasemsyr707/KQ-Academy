'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Mail, ArrowRight, ShieldCheck, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import AuthShell, { authStyles as styles } from '@/components/auth/AuthShell';
import { toast } from '@/lib/motion';

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
    <AuthShell
      title={status === 'success' ? 'تم إرسال الرابط بنجاح' : 'نسيت كلمة المرور؟'}
      subtitle={status === 'success' ? undefined : 'لا تقلق، أدخل بريدك الإلكتروني المسجل لدينا وسنرسل لك رابطاً لإنشاء كلمة مرور جديدة.'}
    >
      {status === 'success' ? (
        <div style={{ textAlign: 'center' }} role="status">
          <div className={styles.successIcon} aria-hidden="true">
            <ShieldCheck size={40} />
          </div>
          <p style={{ color: 'var(--text-2)', marginBottom: '2rem', lineHeight: 1.8 }}>
            أرسلنا رابط إعادة تعيين كلمة المرور إلى البريد الإلكتروني:<br />
            <strong style={{ color: 'var(--text-1)' }} dir="ltr">{email}</strong>
          </p>
          <Link href="/login" className="btn btn-outline btn-lg" style={{ width: '100%' }}>
            العودة لتسجيل الدخول
          </Link>
        </div>
      ) : (
        <>
          <AnimatePresence>
            {status === 'error' && (
              <motion.div key="error" className={styles.alert} role="alert" variants={toast} initial="hidden" animate="visible" exit="exit">
                <AlertCircle size={18} aria-hidden="true" /> البريد الإلكتروني غير صحيح أو غير مسجل.
              </motion.div>
            )}
          </AnimatePresence>

          <form onSubmit={handleSubmit} className={styles.form}>
            <div className={styles.field}>
              <label htmlFor="forgot-email" className={styles.label}>البريد الإلكتروني</label>
              <div className={styles.control}>
                <Mail size={19} className={styles.icon} aria-hidden="true" />
                <input
                  id="forgot-email"
                  type="email"
                  required
                  autoComplete="email"
                  inputMode="email"
                  dir="ltr"
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); setStatus('idle'); }}
                  placeholder="name@example.com"
                  className={styles.input}
                  style={{ textAlign: 'right' }}
                />
              </div>
            </div>

            <button type="submit" disabled={status === 'loading'} className={`btn btn-solid btn-lg ${styles.submit}`}>
              {status === 'loading' ? <><span className="loader" aria-hidden="true" /> جاري الإرسال...</> : 'إرسال رابط الاستعادة'}
            </button>
          </form>

          <p className={styles.switch}>
            <Link href="/login" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', fontWeight: 600, color: 'var(--text-2)' }}>
              <ArrowRight size={16} aria-hidden="true" /> تذكرت كلمة المرور؟ العودة للدخول
            </Link>
          </p>
        </>
      )}
    </AuthShell>
  );
}
