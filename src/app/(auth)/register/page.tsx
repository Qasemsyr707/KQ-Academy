'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { Mail, Lock, User, UserPlus, Eye, EyeOff, Loader2, CheckCircle2, XCircle, ShieldCheck } from 'lucide-react';
import AuthShell, { authStyles as styles } from '@/components/auth/AuthShell';
import { toast } from '@/lib/motion';
import { authHref } from '@/lib/safe-redirect';
import { useAuthRedirectParams } from '@/lib/use-callback-url';

export default function RegisterPage() {
  const router = useRouter();
  const { callbackUrl } = useAuthRedirectParams();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  // Password strength is derived directly from the password (same scoring as before).
  const strengthScore = (() => {
    let score = 0;
    if (password.length > 0) {
      if (password.length > 5) score += 1;
      if (password.match(/[a-z]/) && password.match(/[A-Z]/)) score += 1;
      if (password.match(/\d/)) score += 1;
      if (password.match(/[^a-zA-Z\d]/)) score += 1;
    }
    return score;
  })();

  const STRENGTH_LEVELS: Record<number, { label: string; color: string }> = {
    0: { label: '', color: 'rgba(255,255,255,0.1)' },
    1: { label: 'ضعيفة', color: '#ef4444' }, // Red
    2: { label: 'متوسطة', color: '#f59e0b' }, // Orange
    3: { label: 'جيدة', color: '#eab308' }, // Yellow
    4: { label: 'قوية جداً', color: '#22c55e' }, // Green
  };
  const { label: strengthLabel, color: strengthColor } = STRENGTH_LEVELS[strengthScore];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    if (password !== confirmPassword) {
      setError('كلمتا المرور غير متطابقتين');
      setIsLoading(false);
      return;
    }

    if (strengthScore < 2) {
      setError('كلمة المرور ضعيفة جداً. يرجى استخدام أحرف وأرقام.');
      setIsLoading(false);
      return;
    }

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name, email, password }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'حدث خطأ أثناء التسجيل');
      }

      router.push(callbackUrl
        ? `/login?registered=true&callbackUrl=${encodeURIComponent(callbackUrl)}`
        : '/login?registered=true');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'حدث خطأ أثناء التسجيل');
      setIsLoading(false);
    }
  };

  const canSubmit = !(isLoading || strengthScore < 2 || password !== confirmPassword);
  const confirmState = confirmPassword.length > 0 ? (password === confirmPassword ? styles.inputValid : styles.inputInvalid) : '';

  return (
    <AuthShell
      title="إنشاء حساب جديد"
      subtitle="انضم إلى نخبة المتعلمين في الأكاديمية"
      brand={{
        title: <>استثمر في <span className="text-gold">مستقبلك</span></>,
        text: 'انضم إلى آلاف الطلاب الذين غيروا مسار حياتهم المهنية من خلال دوراتنا الاحترافية.',
      }}
    >
      {callbackUrl?.startsWith('/checkout') && !error ? (
        <div className={`${styles.alert} ${styles.alertInfo}`} role="status">
          <ShieldCheck size={18} aria-hidden="true" /> أنشئ حسابك لإتمام عملية الشراء، وستعود مباشرة إلى صفحة الدفع
        </div>
      ) : null}
      <AnimatePresence>
        {error && (
          <motion.div key="error" className={styles.alert} role="alert" variants={toast} initial="hidden" animate="visible" exit="exit">
            <XCircle size={18} aria-hidden="true" /> {error}
          </motion.div>
        )}
      </AnimatePresence>

      <form onSubmit={handleSubmit} className={styles.form}>
        <div className={styles.field}>
          <label htmlFor="register-name" className={styles.label}>الاسم الكامل</label>
          <div className={styles.control}>
            <User size={18} className={styles.icon} aria-hidden="true" />
            <input
              id="register-name"
              type="text"
              required
              autoComplete="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="الاسم الأول والأخير"
              className={styles.input}
            />
          </div>
        </div>

        <div className={styles.field}>
          <label htmlFor="register-email" className={styles.label}>البريد الإلكتروني</label>
          <div className={styles.control}>
            <Mail size={18} className={styles.icon} aria-hidden="true" />
            <input
              id="register-email"
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
          <label htmlFor="register-password" className={styles.label}>كلمة المرور</label>
          <div className={styles.control}>
            <Lock size={18} className={styles.icon} aria-hidden="true" />
            <input
              id="register-password"
              type={showPassword ? "text" : "password"}
              required
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              aria-describedby="register-password-strength"
              className={`${styles.input} ${styles.inputWithTrailing}`}
            />
            <div className={styles.trailing}>
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className={styles.toggle}
                aria-label={showPassword ? 'إخفاء كلمة المرور' : 'إظهار كلمة المرور'}
                aria-pressed={showPassword}
              >
                {showPassword ? <EyeOff size={18} aria-hidden="true" /> : <Eye size={18} aria-hidden="true" />}
              </button>
            </div>
          </div>

          {/* Password Strength Indicator */}
          {password.length > 0 && (
            <div className={styles.strength} id="register-password-strength" aria-live="polite">
              <div className={styles.strengthBars} aria-hidden="true">
                {[1, 2, 3, 4].map((level) => (
                  <span key={level} style={{ background: level <= strengthScore ? strengthColor : undefined }} />
                ))}
              </div>
              <div className={styles.strengthMeta}>
                <span style={{ color: strengthColor }}>{strengthLabel}</span>
                <span className={styles.hint}>يفضل استخدام أرقام ورموز</span>
              </div>
            </div>
          )}
        </div>

        <div className={styles.field}>
          <label htmlFor="register-confirm" className={styles.label}>تأكيد كلمة المرور</label>
          <div className={styles.control}>
            <Lock size={18} className={styles.icon} aria-hidden="true" />
            <input
              id="register-confirm"
              type={showConfirmPassword ? "text" : "password"}
              required
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="••••••••"
              aria-invalid={confirmPassword.length > 0 && password !== confirmPassword}
              className={`${styles.input} ${styles.inputWithTrailing} ${confirmState}`}
            />

            {/* Match Indicator or Eye Toggle */}
            <div className={styles.trailing}>
              {confirmPassword.length > 0 && password === confirmPassword && (
                <CheckCircle2 size={18} color="var(--success)" aria-label="كلمتا المرور متطابقتان" />
              )}
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className={styles.toggle}
                aria-label={showConfirmPassword ? 'إخفاء كلمة المرور' : 'إظهار كلمة المرور'}
                aria-pressed={showConfirmPassword}
              >
                {showConfirmPassword ? <EyeOff size={18} aria-hidden="true" /> : <Eye size={18} aria-hidden="true" />}
              </button>
            </div>
          </div>
        </div>

        <button
          type="submit"
          disabled={!canSubmit}
          className={`btn btn-solid btn-lg ${styles.submit}`}
        >
          {isLoading ? (
            <>
              <Loader2 size={20} className="spin" aria-hidden="true" />
              جاري إنشاء الحساب...
            </>
          ) : (
            <>
              إنشاء الحساب <UserPlus size={18} aria-hidden="true" />
            </>
          )}
        </button>
      </form>

      <p className={styles.switch}>
        لديك حساب مسبقاً؟{' '}
        <Link href={authHref('/login', callbackUrl)}>تسجيل الدخول</Link>
      </p>
    </AuthShell>
  );
}
