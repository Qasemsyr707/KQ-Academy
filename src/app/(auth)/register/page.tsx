'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { Mail, Lock, User, UserPlus, Eye, EyeOff, Loader2, CheckCircle2, XCircle } from 'lucide-react';

export default function RegisterPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  // Password Strength State
  const [strengthScore, setStrengthScore] = useState(0);
  const [strengthLabel, setStrengthLabel] = useState('');
  const [strengthColor, setStrengthColor] = useState('rgba(255,255,255,0.1)');

  // Calculate Password Strength
  useEffect(() => {
    let score = 0;
    if (password.length > 0) {
      if (password.length > 5) score += 1;
      if (password.match(/[a-z]/) && password.match(/[A-Z]/)) score += 1;
      if (password.match(/\d/)) score += 1;
      if (password.match(/[^a-zA-Z\d]/)) score += 1;
    }

    setStrengthScore(score);

    switch(score) {
      case 0:
        setStrengthLabel('');
        setStrengthColor('rgba(255,255,255,0.1)');
        break;
      case 1:
        setStrengthLabel('ضعيفة');
        setStrengthColor('#ef4444'); // Red
        break;
      case 2:
        setStrengthLabel('متوسطة');
        setStrengthColor('#f59e0b'); // Orange
        break;
      case 3:
        setStrengthLabel('جيدة');
        setStrengthColor('#eab308'); // Yellow
        break;
      case 4:
        setStrengthLabel('قوية جداً');
        setStrengthColor('#22c55e'); // Green
        break;
      default:
        break;
    }
  }, [password]);

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

      router.push('/login?registered=true');
    } catch (err: any) {
      setError(err.message);
      setIsLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', background: '#050505' }}>
      
      {/* Right Side - Register Form */}
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
        <motion.div 
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5 }}
          style={{ width: '100%', maxWidth: '400px' }}
        >
          <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
            <Link href="/" style={{ display: 'inline-block', marginBottom: '1.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                <div style={{ width: '40px', height: '40px', background: 'var(--primary)', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <span style={{ color: '#000', fontWeight: 'bold', fontSize: '1.5rem' }}>K</span>
                </div>
                <span style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#fff', letterSpacing: '2px' }}>&Q</span>
              </div>
            </Link>
            <h2 style={{ fontSize: '1.8rem', color: '#fff', marginBottom: '0.5rem' }}>إنشاء حساب جديد</h2>
            <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.9rem' }}>انضم إلى نخبة المتعلمين في الأكاديمية</p>
          </div>

          {error && (
            <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid #ef4444', color: '#ef4444', padding: '1rem', borderRadius: '12px', marginBottom: '1.5rem', textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
              <XCircle size={18} /> {error}
            </motion.div>
          )}

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
            <div>
              <label style={{ display: 'block', color: '#fff', marginBottom: '0.5rem', fontSize: '0.85rem' }}>الاسم الكامل</label>
              <div style={{ position: 'relative' }}>
                <User size={18} color="rgba(255,255,255,0.4)" style={{ position: 'absolute', right: '1rem', top: '50%', transform: 'translateY(-50%)' }} />
                <input 
                  type="text" 
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="الاسم الأول والأخير"
                  style={{ width: '100%', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)', padding: '0.9rem 2.8rem 0.9rem 1rem', borderRadius: '12px', color: '#fff', fontSize: '0.95rem', transition: 'all 0.3s' }}
                  className="focus:border-primary focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label style={{ display: 'block', color: '#fff', marginBottom: '0.5rem', fontSize: '0.85rem' }}>البريد الإلكتروني</label>
              <div style={{ position: 'relative' }}>
                <Mail size={18} color="rgba(255,255,255,0.4)" style={{ position: 'absolute', right: '1rem', top: '50%', transform: 'translateY(-50%)' }} />
                <input 
                  type="email" 
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  style={{ width: '100%', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)', padding: '0.9rem 2.8rem 0.9rem 1rem', borderRadius: '12px', color: '#fff', fontSize: '0.95rem', transition: 'all 0.3s' }}
                  className="focus:border-primary focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label style={{ display: 'block', color: '#fff', marginBottom: '0.5rem', fontSize: '0.85rem' }}>كلمة المرور</label>
              <div style={{ position: 'relative' }}>
                <Lock size={18} color="rgba(255,255,255,0.4)" style={{ position: 'absolute', right: '1rem', top: '50%', transform: 'translateY(-50%)' }} />
                <input 
                  type={showPassword ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  style={{ width: '100%', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)', padding: '0.9rem 1rem 0.9rem 2.8rem', borderRadius: '12px', color: '#fff', fontSize: '0.95rem', transition: 'all 0.3s' }}
                  className="focus:border-primary focus:outline-none"
                />
                <button 
                  type="button" 
                  onClick={() => setShowPassword(!showPassword)}
                  style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.4)' }}
                  className="hover:text-primary"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              
              {/* Password Strength Indicator */}
              {password.length > 0 && (
                <div style={{ marginTop: '0.8rem' }}>
                  <div style={{ display: 'flex', gap: '4px', height: '4px', marginBottom: '0.4rem' }}>
                    {[1, 2, 3, 4].map((level) => (
                      <div 
                        key={level} 
                        style={{ 
                          flex: 1, 
                          borderRadius: '2px', 
                          background: level <= strengthScore ? strengthColor : 'rgba(255,255,255,0.1)',
                          transition: 'all 0.3s ease'
                        }} 
                      />
                    ))}
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: strengthColor }}>
                    <span>{strengthLabel}</span>
                    <span style={{ color: 'rgba(255,255,255,0.4)' }}>يفضل استخدام أرقام ورموز</span>
                  </div>
                </div>
              )}
            </div>

            <div>
              <label style={{ display: 'block', color: '#fff', marginBottom: '0.5rem', fontSize: '0.85rem' }}>تأكيد كلمة المرور</label>
              <div style={{ position: 'relative' }}>
                <Lock size={18} color="rgba(255,255,255,0.4)" style={{ position: 'absolute', right: '1rem', top: '50%', transform: 'translateY(-50%)' }} />
                <input 
                  type={showConfirmPassword ? "text" : "password"}
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  style={{ 
                    width: '100%', 
                    background: 'rgba(255,255,255,0.03)', 
                    border: `1px solid ${confirmPassword.length > 0 ? (password === confirmPassword ? 'var(--success)' : '#ef4444') : 'rgba(255,255,255,0.1)'}`, 
                    padding: '0.9rem 1rem 0.9rem 2.8rem', 
                    borderRadius: '12px', 
                    color: '#fff', 
                    fontSize: '0.95rem', 
                    transition: 'all 0.3s' 
                  }}
                  className="focus:outline-none"
                />
                
                {/* Match Indicator or Eye Toggle */}
                <div style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  {confirmPassword.length > 0 && password === confirmPassword && (
                    <CheckCircle2 size={18} color="var(--success)" />
                  )}
                  <button 
                    type="button" 
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.4)', padding: 0 }}
                    className="hover:text-primary"
                  >
                    {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>
            </div>

            <button 
              type="submit" 
              disabled={isLoading || strengthScore < 2 || password !== confirmPassword}
              className="btn btn-solid" 
              style={{ 
                width: '100%', 
                padding: '1rem', 
                fontSize: '1rem', 
                marginTop: '0.5rem', 
                display: 'flex', 
                justifyContent: 'center', 
                gap: '0.5rem',
                opacity: (isLoading || strengthScore < 2 || password !== confirmPassword) ? 0.5 : 1,
                cursor: (isLoading || strengthScore < 2 || password !== confirmPassword) ? 'not-allowed' : 'pointer'
              }}
            >
              {isLoading ? (
                <>
                  <Loader2 size={20} className="spin" />
                  جاري إنشاء الحساب...
                </>
              ) : (
                <>
                  إنشاء الحساب <UserPlus size={18} />
                </>
              )}
            </button>
          </form>

          <div style={{ marginTop: '2.5rem', textAlign: 'center', color: 'rgba(255,255,255,0.6)', fontSize: '0.9rem' }}>
            لديك حساب مسبقاً؟{' '}
            <Link href="/login" style={{ color: '#fff', fontWeight: 'bold', textDecoration: 'none', transition: 'color 0.3s' }} className="hover:text-primary">
              تسجيل الدخول
            </Link>
          </div>
        </motion.div>
      </div>

      {/* Left Side - Image/Branding */}
      <div style={{ flex: 1, display: 'none', position: 'relative', overflow: 'hidden' }} className="md:flex">
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to left, rgba(0,0,0,0.9), transparent)', zIndex: 1 }} />
        <img 
          src="https://images.unsplash.com/photo-1516321318423-f06f85e504b3?q=80&w=1200&auto=format&fit=crop" 
          alt="Student Success"
          style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: 0.6 }}
        />
        <div style={{ position: 'absolute', top: '10%', right: '10%', zIndex: 2, maxWidth: '500px', textAlign: 'right' }}>
          <h1 style={{ fontSize: '3rem', fontWeight: 'bold', color: '#fff', marginBottom: '1rem', lineHeight: '1.2' }}>
            استثمر في <span style={{ color: 'var(--primary)' }}>مستقبلك</span>
          </h1>
          <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: '1.2rem', lineHeight: '1.6' }}>
            انضم إلى آلاف الطلاب الذين غيروا مسار حياتهم المهنية من خلال دوراتنا الاحترافية.
          </p>
        </div>
      </div>

      <style jsx global>{`
        @media (min-width: 768px) {
          .md\\:flex { display: flex !important; }
        }
        .hover\\:border-primary:focus { border-color: var(--primary) !important; }
        .hover\\:text-primary:hover { color: var(--primary) !important; }
        .spin { animation: spin 1s linear infinite; }
        @keyframes spin { 100% { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
