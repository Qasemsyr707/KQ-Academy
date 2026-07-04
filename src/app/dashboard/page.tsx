'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { BookOpen, Trophy, Clock, Bell, Flame, TrendingUp, PlayCircle, Bot, Video, Headphones, Wallet, Settings } from 'lucide-react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function StudentDashboard() {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    }
  }, [status, router]);

  const courses = [
    { id: 1, title: 'الفيزياء الكلاسيكية - متقدم', progress: 75, lastAccessed: 'قبل ساعتين', thumbnail: 'bg-gradient-to-r from-blue-900 to-indigo-900' },
    { id: 2, title: 'تطوير الويب الشامل (React)', progress: 42, lastAccessed: 'أمس', thumbnail: 'bg-gradient-to-r from-teal-900 to-emerald-900' },
    { id: 3, title: 'الرياضيات - التفاضل والتكامل', progress: 12, lastAccessed: 'قبل 3 أيام', thumbnail: 'bg-gradient-to-r from-purple-900 to-fuchsia-900' },
  ];

  const firstName = session?.user?.name?.split(' ')[0] || 'طالبنا العزيز';
  const isAdmin = (session?.user as any)?.role === 'ADMIN';

  if (status === 'loading') {
    return <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>جاري التحميل...</div>;
  }

  return (
    <div className="container" style={{ padding: '2rem 5%' }}>
      {isAdmin && (
        <div style={{ background: 'rgba(234, 179, 8, 0.1)', border: '1px solid #eab308', padding: '1rem', borderRadius: '12px', marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h3 style={{ color: '#eab308', marginBottom: '0.2rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Settings size={18} /> وضع الإدارة</h3>
            <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.9rem' }}>أنت تتصفح حالياً لوحة تحكم الطالب. بصفتك مديراً، يمكنك الانتقال إلى لوحة الإدارة الشاملة.</p>
          </div>
          <Link href="/admin" className="btn btn-solid" style={{ background: '#eab308', color: '#000', padding: '0.6rem 1.5rem' }}>الانتقال للوحة الإدارة</Link>
        </div>
      )}

      {/* Welcome Banner */}
      <motion.div 
        className="glass-card" 
        style={{ 
          background: 'linear-gradient(135deg, rgba(203, 161, 83, 0.15) 0%, rgba(10, 10, 10, 0.8) 100%)',
          marginBottom: '2rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div>
          <h1 style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>مرحباً بعودتك، <span style={{ color: 'var(--primary)' }}>{firstName}</span> 👋</h1>
          <p style={{ opacity: 0.8, fontSize: '1.1rem' }}>أنت في الفئة <strong style={{ color: '#60a5fa' }}>الماسية 💎</strong> هذا الأسبوع. استمر في التألق!</p>
        </div>
        <div style={{ display: 'flex', gap: '1.5rem', textAlign: 'center' }}>
          <div>
            <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
              <Flame size={28} /> 14
            </div>
            <p style={{ fontSize: '0.9rem', opacity: 0.7 }}>أيام متتالية</p>
          </div>
          <div style={{ width: '1px', background: 'var(--border-light)' }}></div>
          <div>
            <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--success)' }}>2,450</div>
            <p style={{ fontSize: '0.9rem', opacity: 0.7 }}>نقطة خبرة (XP)</p>
          </div>
        </div>
      </motion.div>

      <div className="grid" style={{ gridTemplateColumns: '3fr 1fr', gap: '2rem' }}>
        {/* Main Content Area */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          
          {/* Quick Actions / Ecosystem */}
          <motion.div 
            style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '1rem' }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
          >
            <Link href="/dashboard/wallet" style={{ background: 'rgba(255,255,255,0.03)', padding: '1.5rem', borderRadius: '16px', textAlign: 'center', border: '1px solid var(--border-light)', display: 'block' }}>
              <Wallet size={32} color="#eab308" style={{ margin: '0 auto 1rem auto' }} />
              <h3 style={{ fontSize: '1rem' }}>محفظتي</h3>
            </Link>
            <Link href="/features/ai-tutor" style={{ background: 'rgba(255,255,255,0.03)', padding: '1.5rem', borderRadius: '16px', textAlign: 'center', border: '1px solid var(--border-light)', display: 'block' }}>
              <Bot size={32} color="var(--primary)" style={{ margin: '0 auto 1rem auto' }} />
              <h3 style={{ fontSize: '1rem' }}>المساعد الذكي</h3>
            </Link>
            <Link href="/features/live-class" style={{ background: 'rgba(255,255,255,0.03)', padding: '1.5rem', borderRadius: '16px', textAlign: 'center', border: '1px solid var(--border-light)', display: 'block' }}>
              <Video size={32} color="#f43f5e" style={{ margin: '0 auto 1rem auto' }} />
              <h3 style={{ fontSize: '1rem' }}>البث المباشر (الآن)</h3>
            </Link>
            <Link href="/features/study-rooms" style={{ background: 'rgba(255,255,255,0.03)', padding: '1.5rem', borderRadius: '16px', textAlign: 'center', border: '1px solid var(--border-light)', display: 'block' }}>
              <Headphones size={32} color="#a855f7" style={{ margin: '0 auto 1rem auto' }} />
              <h3 style={{ fontSize: '1rem' }}>غرف الدراسة</h3>
            </Link>
            <Link href="/features/assessment" style={{ background: 'rgba(255,255,255,0.03)', padding: '1.5rem', borderRadius: '16px', textAlign: 'center', border: '1px solid var(--border-light)', display: 'block' }}>
              <Trophy size={32} color="var(--success)" style={{ margin: '0 auto 1rem auto' }} />
              <h3 style={{ fontSize: '1rem' }}>اختبر قدراتك</h3>
            </Link>
          </motion.div>

          {/* Continue Learning */}
          <motion.div 
            className="glass-card" 
            style={{ padding: '2rem' }}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <h2 style={{ fontSize: '1.5rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <PlayCircle color="var(--primary)" /> متابعة التعلم
            </h2>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {courses.map(course => (
                <div key={course.id} style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', background: 'rgba(0,0,0,0.4)', padding: '1rem', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.02)' }}>
                  <div style={{ width: '80px', height: '60px', borderRadius: '8px', background: course.id === 1 ? 'linear-gradient(45deg, #1e3a8a, #312e81)' : course.id === 2 ? 'linear-gradient(45deg, #134e4a, #064e3b)' : 'linear-gradient(45deg, #581c87, #4a044e)' }}></div>
                  <div style={{ flex: 1 }}>
                    <h4 style={{ fontSize: '1.1rem', marginBottom: '0.3rem' }}>{course.title}</h4>
                    <p style={{ fontSize: '0.8rem', opacity: 0.6 }}><Clock size={12} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '2px' }} /> آخر دخول: {course.lastAccessed}</p>
                  </div>
                  <div style={{ width: '150px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: '0.3rem' }}>
                      <span>الإنجاز</span>
                      <span style={{ color: 'var(--primary)' }}>{course.progress}%</span>
                    </div>
                    <div style={{ height: '6px', background: 'rgba(255,255,255,0.1)', borderRadius: '3px' }}>
                      <div style={{ height: '100%', width: `${course.progress}%`, background: 'var(--primary)', borderRadius: '3px' }} />
                    </div>
                  </div>
                  <Link href={`/courses/${course.id}/learn`} className="btn btn-solid" style={{ padding: '0.5rem 1.5rem', fontSize: '0.9rem' }}>أكمل الدرس</Link>
                </div>
              ))}
            </div>
          </motion.div>
        </div>

        {/* Sidebar / Schedule & Notifications */}
        <motion.div 
          style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.4 }}
        >
          {/* Notifications */}
          <div className="glass-card" style={{ padding: '1.5rem' }}>
            <h3 style={{ fontSize: '1.2rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Bell size={20} color="var(--primary)" /> الإشعارات والتنبيهات
            </h3>
            <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <li style={{ fontSize: '0.9rem', paddingBottom: '1rem', borderBottom: '1px solid var(--border-light)' }}>
                <span style={{ display: 'block', color: 'var(--warning)', marginBottom: '0.2rem' }}>مختبرات الـ AR جاهزة!</span>
                تم إضافة مجسم تشريح القلب البشري لمقرر العلوم. <Link href="/features/ar-labs" style={{ color: 'var(--primary)', textDecoration: 'underline' }}>جرب الآن</Link>
              </li>
              <li style={{ fontSize: '0.9rem', paddingBottom: '1rem', borderBottom: '1px solid var(--border-light)' }}>
                <span style={{ display: 'block', color: 'var(--success)', marginBottom: '0.2rem' }}>تهانينا!</span>
                تم تصنيف كود React الخاص بك كأفضل كود في مجتمع الطلاب اليوم.
              </li>
              <li style={{ fontSize: '0.9rem' }}>
                <span style={{ display: 'block', color: '#60a5fa', marginBottom: '0.2rem' }}>فرصة تدريب جديدة</span>
                مهمة متاحة في مسارك المهني من شركة سيمفوني. <Link href="/features/career-mapping" style={{ color: 'var(--primary)', textDecoration: 'underline' }}>التفاصيل</Link>
              </li>
            </ul>
          </div>

          {/* Mini Career Progress */}
          <div className="glass-card" style={{ padding: '1.5rem', background: 'linear-gradient(180deg, rgba(203, 161, 83, 0.05) 0%, rgba(0,0,0,0.5) 100%)' }}>
            <h3 style={{ fontSize: '1.2rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <TrendingUp size={20} color="var(--primary)" /> المسار المهني
            </h3>
            <p style={{ fontSize: '0.9rem', opacity: 0.8, marginBottom: '1rem' }}>
              أنت تقترب بنسبة 80% من الجاهزية للعمل كـ <strong>مهندس واجهات (Frontend)</strong>.
            </p>
            <Link href="/features/career-mapping" className="btn btn-solid" style={{ width: '100%', fontSize: '0.9rem' }}>عرض الخريطة المهنية</Link>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
