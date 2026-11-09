'use client';

import { useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { Mail, Lock, LogIn, Loader2, XCircle } from 'lucide-react';
import AuthShell, { authStyles as styles } from '@/components/auth/AuthShell';
import { toast } from '@/lib/motion';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const res = await signIn('credentials', {
        email,
        password,
        redirect: false,
      });

      if (res?.error) {
        setError('البريد الإلكتروني أو كلمة المرور غير صحيحة');
        setIsLoading(false);
      } else {
        router.push('/dashboard');
        router.refresh();
      }
    } catch {
      setError('حدث خطأ أثناء الاتصال بالخادم');
      setIsLoading(false);
    }
  };

  return (
    <AuthShell
      title="تسجيل الدخول"
      subtitle="أدخل بياناتك لمتابعة دوراتك التدريبية"
      brand={{
        title: <>مرحباً بك مجدداً في <span className="text-gold">K&amp;Q</span></>,
        text: 'المكان الأول لتطوير مهاراتك واحتراف التكنولوجيا في سوريا والوطن العربي.',
      }}
    >
      <AnimatePresence>
        {error && (
          <motion.div key="error" className={styles.alert} role="alert" variants={toast} initial="hidden" animate="visible" exit="exit">
            <XCircle size={18} aria-hidden="true" /> {error}
          </motion.div>
        )}
      </AnimatePresence>

      <form onSubmit={handleSubmit} className={styles.form}>
        <div className={styles.field}>
          <label htmlFor="login-email" className={styles.label}>البريد الإلكتروني</label>
          <div className={styles.control}>
            <Mail size={19} className={styles.icon} aria-hidden="true" />
            <input
              id="login-email"
              type="email"
              required
              autoComplete="email"
              inputMode="email"
              dir="ltr"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@example.com"
              className={styles.input}
              style={{ textAlign: 'right' }}
            />
          </div>
        </div>

        <div className={styles.field}>
          <div className={styles.labelRow}>
            <label htmlFor="login-password" className={styles.label}>كلمة المرور</label>
            <Link href="/forgot-password" className={styles.inlineLink}>نسيت كلمة المرور؟</Link>
          </div>
          <div className={styles.control}>
            <Lock size={19} className={styles.icon} aria-hidden="true" />
            <input
              id="login-password"
              type="password"
              required
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className={styles.input}
            />
          </div>
        </div>

        <button type="submit" disabled={isLoading} className={`btn btn-solid btn-lg ${styles.submit}`}>
          {isLoading ? (
            <>
              <Loader2 size={22} className="spin" aria-hidden="true" />
              جاري تسجيل الدخول...
            </>
          ) : (
            <>
              دخول للوحة الطالب <LogIn size={20} aria-hidden="true" />
            </>
          )}
        </button>
      </form>

      <p className={styles.switch}>
        ليس لديك حساب بعد؟{' '}
        <Link href="/register">إنشاء حساب جديد</Link>
      </p>
    </AuthShell>
  );
}
