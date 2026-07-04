'use client';

import { useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { Mail, Lock, LogIn, ArrowRight, Loader2 } from 'lucide-react';

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
    } catch (err) {
      setError('حدث خطأ أثناء الاتصال بالخادم');
      setIsLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', background: '#050505' }}>
      
      {/* Left Side - Image/Branding */}
      <div style={{ flex: 1, display: 'none', position: 'relative', overflow: 'hidden' }} className="md:flex">
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to right, rgba(0,0,0,0.9), transparent)', zIndex: 1 }} />
        <img 
          src="https://images.unsplash.com/photo-1522202176988-66273c2fd55f?q=80&w=1200&auto=format&fit=crop" 
          alt="Students learning"
          style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: 0.6 }}
        />
        <div style={{ position: 'absolute', bottom: '10%', left: '10%', zIndex: 2, maxWidth: '500px' }}>
          <h1 style={{ fontSize: '3rem', fontWeight: 'bold', color: '#fff', marginBottom: '1rem', lineHeight: '1.2' }}>
            مرحباً بك مجدداً في <span style={{ color: 'var(--primary)' }}>K&Q</span>
          </h1>
          <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: '1.2rem', lineHeight: '1.6' }}>
            المكان الأول لتطوير مهاراتك واحتراف التكنولوجيا في سوريا والوطن العربي.
          </p>
        </div>
      </div>

      {/* Right Side - Login Form */}
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
        <motion.div 
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5 }}
          style={{ width: '100%', maxWidth: '400px' }}
        >
          <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
            <Link href="/" style={{ display: 'inline-block', marginBottom: '2rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                <div style={{ width: '40px', height: '40px', background: 'var(--primary)', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <span style={{ color: '#000', fontWeight: 'bold', fontSize: '1.5rem' }}>K</span>
                </div>
                <span style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#fff', letterSpacing: '2px' }}>&Q</span>
              </div>
            </Link>
            <h2 style={{ fontSize: '2rem', color: '#fff', marginBottom: '0.5rem' }}>تسجيل الدخول</h2>
            <p style={{ color: 'rgba(255,255,255,0.6)' }}>أدخل بياناتك لمتابعة دوراتك التدريبية</p>
          </div>

          {error && (
            <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid #ef4444', color: '#ef4444', padding: '1rem', borderRadius: '12px', marginBottom: '1.5rem', textAlign: 'center' }}>
              {error}
            </motion.div>
          )}

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div>
              <label style={{ display: 'block', color: '#fff', marginBottom: '0.5rem', fontSize: '0.9rem' }}>البريد الإلكتروني</label>
              <div style={{ position: 'relative' }}>
                <Mail size={20} color="rgba(255,255,255,0.4)" style={{ position: 'absolute', right: '1rem', top: '50%', transform: 'translateY(-50%)' }} />
                <input 
                  type="email" 
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  style={{ width: '100%', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)', padding: '1rem 3rem 1rem 1rem', borderRadius: '12px', color: '#fff', fontSize: '1rem', transition: 'all 0.3s' }}
                  className="focus:border-primary focus:outline-none"
                />
              </div>
            </div>

            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                <label style={{ color: '#fff', fontSize: '0.9rem' }}>كلمة المرور</label>
                <a href="#" style={{ color: 'var(--primary)', fontSize: '0.8rem', textDecoration: 'none' }} className="hover:underline">نسيت كلمة المرور؟</a>
              </div>
              <div style={{ position: 'relative' }}>
                <Lock size={20} color="rgba(255,255,255,0.4)" style={{ position: 'absolute', right: '1rem', top: '50%', transform: 'translateY(-50%)' }} />
                <input 
                  type="password" 
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  style={{ width: '100%', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)', padding: '1rem 3rem 1rem 1rem', borderRadius: '12px', color: '#fff', fontSize: '1rem', transition: 'all 0.3s' }}
                  className="focus:border-primary focus:outline-none"
                />
              </div>
            </div>

            <button 
              type="submit" 
              disabled={isLoading}
              className="btn btn-solid" 
              style={{ width: '100%', padding: '1rem', fontSize: '1.1rem', marginTop: '1rem', display: 'flex', justifyContent: 'center', gap: '0.5rem' }}
            >
              {isLoading ? (
                <>
                  <Loader2 size={24} className="spin" />
                  جاري تسجيل الدخول...
                </>
              ) : (
                <>
                  دخول للوحة الطالب <LogIn size={20} />
                </>
              )}
            </button>
          </form>

          <div style={{ marginTop: '3rem', textAlign: 'center', color: 'rgba(255,255,255,0.6)' }}>
            ليس لديك حساب بعد؟{' '}
            <Link href="/register" style={{ color: '#fff', fontWeight: 'bold', textDecoration: 'none', transition: 'color 0.3s' }} className="hover:text-primary">
              إنشاء حساب جديد
            </Link>
          </div>
        </motion.div>
      </div>

      <style jsx global>{`
        @media (min-width: 768px) {
          .md\\:flex { display: flex !important; }
        }
        .hover\\:border-primary:focus { border-color: var(--primary) !important; }
        .hover\\:text-primary:hover { color: var(--primary) !important; }
        .hover\\:underline:hover { text-decoration: underline !important; }
        .spin { animation: spin 1s linear infinite; }
        @keyframes spin { 100% { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
