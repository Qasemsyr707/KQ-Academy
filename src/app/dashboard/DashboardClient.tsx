'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { BookOpen, Trophy, Clock, Bell, Flame, TrendingUp, PlayCircle, Bot, Video, Headphones, Wallet, Settings } from 'lucide-react';
import { useSession } from 'next-auth/react';

export default function DashboardClient({ enrollments, points }: { enrollments: any[], points: number }) {
  const { data: session } = useSession();
  
  const firstName = session?.user?.name?.split(' ')[0] || 'طالبنا العزيز';
  const isAdmin = (session?.user as any)?.role === 'ADMIN';

  // Fallback if no enrollments
  const displayCourses = enrollments.length > 0 ? enrollments : [];

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
          <p style={{ opacity: 0.8, fontSize: '1.1rem' }}>نتمنى لك يوماً دراسياً موفقاً!</p>
        </div>
        <div style={{ display: 'flex', gap: '1.5rem', textAlign: 'center' }}>
          <div>
            <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
              <Flame size={28} /> 1
            </div>
            <p style={{ fontSize: '0.9rem', opacity: 0.7 }}>أيام متتالية</p>
          </div>
          <div style={{ width: '1px', background: 'var(--border-light)' }}></div>
          <div>
            <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--success)' }}>{points.toLocaleString()}</div>
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
            <Link href="/courses" style={{ background: 'rgba(255,255,255,0.03)', padding: '1.5rem', borderRadius: '16px', textAlign: 'center', border: '1px solid var(--border-light)', display: 'block' }}>
              <BookOpen size={32} color="var(--success)" style={{ margin: '0 auto 1rem auto' }} />
              <h3 style={{ fontSize: '1rem' }}>تصفح الكورسات</h3>
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
              <PlayCircle color="var(--primary)" /> مساقاتي الحالية
            </h2>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {displayCourses.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '3rem', color: 'rgba(255,255,255,0.5)', background: 'rgba(0,0,0,0.2)', borderRadius: '16px' }}>
                  <p style={{ marginBottom: '1rem' }}>لم تشترك في أي كورس بعد.</p>
                  <Link href="/courses" className="btn btn-solid" style={{ padding: '0.5rem 1.5rem' }}>استكشف الكورسات</Link>
                </div>
              ) : (
                displayCourses.map((enrollment: any, index: number) => {
                  const colors = [
                    'linear-gradient(45deg, #1e3a8a, #312e81)',
                    'linear-gradient(45deg, #134e4a, #064e3b)',
                    'linear-gradient(45deg, #581c87, #4a044e)'
                  ];
                  const color = colors[index % colors.length];

                  return (
                    <div key={enrollment.id} style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', background: 'rgba(0,0,0,0.4)', padding: '1rem', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.02)' }}>
                      <div style={{ width: '80px', height: '60px', borderRadius: '8px', background: color }}></div>
                      <div style={{ flex: 1 }}>
                        <h4 style={{ fontSize: '1.1rem', marginBottom: '0.3rem' }}>{enrollment.course.title}</h4>
                        <p style={{ fontSize: '0.8rem', opacity: 0.6 }}><Clock size={12} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '2px' }} /> آخر تحديث: {new Date(enrollment.updatedAt).toLocaleDateString('ar-SA')}</p>
                      </div>
                      <div style={{ width: '150px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: '0.3rem' }}>
                          <span>الإنجاز</span>
                          <span style={{ color: 'var(--primary)' }}>{enrollment.progress}%</span>
                        </div>
                        <div style={{ height: '6px', background: 'rgba(255,255,255,0.1)', borderRadius: '3px' }}>
                          <div style={{ height: '100%', width: `${enrollment.progress}%`, background: 'var(--primary)', borderRadius: '3px' }} />
                        </div>
                      </div>
                      <Link href={`/courses/${enrollment.courseId}/learn`} className="btn btn-solid" style={{ padding: '0.5rem 1.5rem', fontSize: '0.9rem' }}>متابعة</Link>
                    </div>
                  );
                })
              )}
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
                <span style={{ display: 'block', color: 'var(--warning)', marginBottom: '0.2rem' }}>مرحبا بك في منصة KQ Academy!</span>
                نتمنى لك رحلة تعليمية موفقة وممتعة. <Link href="/courses" style={{ color: 'var(--primary)', textDecoration: 'underline' }}>تصفح الكورسات</Link>
              </li>
            </ul>
          </div>

        </motion.div>
      </div>
    </div>
  );
}
