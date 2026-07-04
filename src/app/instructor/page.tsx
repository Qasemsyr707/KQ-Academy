'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { Users, UploadCloud, Video, FileEdit, Star, TrendingUp, DollarSign, Bot, ShieldCheck } from 'lucide-react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function InstructorDashboard() {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    }
  }, [status, router]);

  const activeCourses = [
    { id: 1, title: 'تطوير الويب الشامل (React)', students: 1240, rating: 4.9, revenue: '2,500,000 SYP' },
    { id: 2, title: 'مقدمة في الذكاء الاصطناعي', students: 850, rating: 4.8, revenue: '1,800,000 SYP' },
  ];

  const firstName = session?.user?.name?.split(' ')[0] || 'أستاذنا العزيز';

  if (status === 'loading') {
    return <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>جاري التحميل...</div>;
  }

  return (
    <div className="container" style={{ padding: '2rem 5%' }}>
      {/* Welcome Banner - Instructor Edition */}
      <motion.div 
        className="glass-card" 
        style={{ 
          background: 'linear-gradient(135deg, rgba(203, 161, 83, 0.05) 0%, rgba(5, 5, 5, 0.9) 100%)',
          marginBottom: '2rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          borderLeft: '4px solid var(--primary)'
        }}
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div>
          <h1 style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>مرحباً بك أستاذ <span style={{ color: 'var(--primary)' }}>{firstName}</span> 👑</h1>
          <p style={{ opacity: 0.8, fontSize: '1.1rem' }}>لديك <strong style={{ color: 'var(--success)' }}>3</strong> دروس بانتظار المراجعة، وتقييمك العام ارتفع هذا الأسبوع!</p>
        </div>
        <div style={{ display: 'flex', gap: '2rem', textAlign: 'center' }}>
          <div>
            <div style={{ fontSize: '2rem', fontWeight: 800, color: '#60a5fa', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
              <Users size={28} /> 2,090
            </div>
            <p style={{ fontSize: '0.9rem', opacity: 0.7 }}>إجمالي الطلاب</p>
          </div>
          <div style={{ width: '1px', background: 'var(--border-light)' }}></div>
          <div>
            <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--warning)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
              <Star size={28} fill="var(--warning)" /> 4.85
            </div>
            <p style={{ fontSize: '0.9rem', opacity: 0.7 }}>متوسط التقييم</p>
          </div>
        </div>
      </motion.div>

      <div className="grid" style={{ gridTemplateColumns: '1fr 3fr', gap: '2rem' }}>
        
        {/* Sidebar - Control Panel */}
        <motion.div 
          style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
        >
          <div className="glass-card" style={{ padding: '1.5rem' }}>
            <h3 style={{ fontSize: '1.2rem', marginBottom: '1.5rem', borderBottom: '1px solid var(--border-light)', paddingBottom: '0.8rem' }}>إدارة المحتوى</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <Link href="/instructor/courses" className="btn btn-solid" style={{ width: '100%', justifyContent: 'flex-start', textDecoration: 'none' }}><UploadCloud size={20} /> رفع درس جديد (DRM)</Link>
              <Link href="/instructor/live/schedule" className="btn" style={{ width: '100%', justifyContent: 'flex-start', textDecoration: 'none' }}><Video size={20} /> جدولة بث مباشر</Link>
              <Link href="/instructor/quizzes" className="btn" style={{ width: '100%', justifyContent: 'flex-start', textDecoration: 'none' }}><FileEdit size={20} /> إدارة الاختبارات</Link>
            </div>
          </div>

          <div className="glass-card" style={{ padding: '1.5rem', background: 'rgba(203, 161, 83, 0.05)' }}>
            <h3 style={{ fontSize: '1.2rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Bot size={20} color="var(--primary)" /> مساعد المعلم الذكي
            </h3>
            <p style={{ fontSize: '0.9rem', opacity: 0.8, marginBottom: '1.5rem' }}>
              دع الذكاء الاصطناعي يقرأ ملف الـ PDF الخاص بك ويقوم بتوليد 50 سؤال اختبار تكيفي تلقائياً.
            </p>
            <button className="btn" style={{ width: '100%', fontSize: '0.9rem', borderColor: 'var(--primary)' }}>توليد أسئلة بالـ AI ✨</button>
          </div>
        </motion.div>

        {/* Main Content Area */}
        <motion.div 
          style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          {/* Revenue & Analytics */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1.5rem' }}>
            <div className="glass-card" style={{ padding: '1.5rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <div style={{ background: 'rgba(34, 197, 94, 0.2)', padding: '1rem', borderRadius: '12px' }}>
                <DollarSign size={24} color="var(--success)" />
              </div>
              <div>
                <p style={{ fontSize: '0.9rem', opacity: 0.7 }}>أرباح هذا الشهر</p>
                <h3 style={{ fontSize: '1.5rem' }}>4,300,000 SYP</h3>
              </div>
            </div>
            <div className="glass-card" style={{ padding: '1.5rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <div style={{ background: 'rgba(59, 130, 246, 0.2)', padding: '1rem', borderRadius: '12px' }}>
                <TrendingUp size={24} color="#60a5fa" />
              </div>
              <div>
                <p style={{ fontSize: '0.9rem', opacity: 0.7 }}>معدل إكمال الدورات</p>
                <h3 style={{ fontSize: '1.5rem' }}>68% <span style={{ fontSize: '0.9rem', color: 'var(--success)' }}>↑ 5%</span></h3>
              </div>
            </div>
            <div className="glass-card" style={{ padding: '1.5rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <div style={{ background: 'rgba(168, 85, 247, 0.2)', padding: '1rem', borderRadius: '12px' }}>
                <ShieldCheck size={24} color="#a855f7" />
              </div>
              <div>
                <p style={{ fontSize: '0.9rem', opacity: 0.7 }}>حماية DRM</p>
                <h3 style={{ fontSize: '1.2rem' }}>مفعلة (0 تسريبات)</h3>
              </div>
            </div>
          </div>

          {/* Active Courses */}
          <div className="glass-card" style={{ padding: '2rem' }}>
            <h2 style={{ fontSize: '1.5rem', marginBottom: '1.5rem' }}>دوراتك الحالية</h2>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'right' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border-light)', color: 'var(--primary)' }}>
                    <th style={{ padding: '1rem', fontWeight: 600 }}>اسم الدورة</th>
                    <th style={{ padding: '1rem', fontWeight: 600 }}>الطلاب المسجلين</th>
                    <th style={{ padding: '1rem', fontWeight: 600 }}>التقييم</th>
                    <th style={{ padding: '1rem', fontWeight: 600 }}>الأرباح المباشرة</th>
                    <th style={{ padding: '1rem', fontWeight: 600 }}>إجراءات</th>
                  </tr>
                </thead>
                <tbody>
                  {activeCourses.map(course => (
                    <tr key={course.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', transition: 'background 0.3s' }}>
                      <td style={{ padding: '1.2rem 1rem', fontWeight: 600 }}>{course.title}</td>
                      <td style={{ padding: '1.2rem 1rem' }}>{course.students} طالب</td>
                      <td style={{ padding: '1.2rem 1rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}><Star size={16} fill="var(--warning)" color="var(--warning)" /> {course.rating}</td>
                      <td style={{ padding: '1.2rem 1rem', color: 'var(--success)' }}>{course.revenue}</td>
                      <td style={{ padding: '1.2rem 1rem' }}>
                        <button className="btn" style={{ padding: '0.4rem 1rem', fontSize: '0.8rem' }}>إدارة</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
