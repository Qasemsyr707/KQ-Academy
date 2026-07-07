'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { BookOpen, Trophy, Clock, Bell, Flame, TrendingUp, PlayCircle, Bot, Video, Headphones, Wallet, Settings, LayoutDashboard, ChevronLeft, ArrowRight, ShieldCheck, CheckCircle2 } from 'lucide-react';
import { useSession } from 'next-auth/react';
import { useState } from 'react';

export default function DashboardClient({ enrollments, points }: { enrollments: any[], points: number }) {
  const { data: session } = useSession();
  
  const firstName = session?.user?.name?.split(' ')[0] || 'طالبنا العزيز';
  const isAdmin = (session?.user as any)?.role === 'ADMIN';

  const displayCourses = enrollments.length > 0 ? enrollments : [];
  
  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const itemVariants: any = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 300, damping: 24 } }
  };

  return (
    <div style={{ minHeight: '100vh', background: '#050505', color: '#fff' }}>
      
      {/* Top Accent Line */}
      <div style={{ height: '4px', background: 'linear-gradient(to right, var(--primary), #b8852a, #3b82f6)', width: '100%' }} />

      <div className="container" style={{ padding: '3rem 5%', maxWidth: '1400px', margin: '0 auto' }}>
        
        {isAdmin && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            style={{ 
              background: 'linear-gradient(90deg, rgba(234, 179, 8, 0.1) 0%, rgba(234, 179, 8, 0.02) 100%)', 
              border: '1px solid rgba(234, 179, 8, 0.3)', 
              padding: '1.25rem 2rem', 
              borderRadius: '16px', 
              marginBottom: '2rem', 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center',
              boxShadow: '0 10px 30px -10px rgba(234, 179, 8, 0.15)'
            }}
          >
            <div>
              <h3 style={{ color: '#eab308', marginBottom: '0.4rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 800 }}>
                <Settings size={20} /> وضع الإدارة (Admin View)
              </h3>
              <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.95rem', margin: 0 }}>
                أنت تتصفح حالياً لوحة تحكم الطالب. بصفتك مديراً، يمكنك الانتقال إلى لوحة الإدارة الشاملة للتحكم في المنصة.
              </p>
            </div>
            <Link href="/admin" className="btn btn-solid" style={{ background: '#eab308', color: '#000', padding: '0.8rem 1.5rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <LayoutDashboard size={18} /> الانتقال للوحة الإدارة
            </Link>
          </motion.div>
        )}

        {/* Hero Section */}
        <motion.div 
          className="glass-card" 
          style={{ 
            background: 'url(/abstract-bg.jpg) center/cover, linear-gradient(135deg, rgba(203, 161, 83, 0.15) 0%, rgba(10, 10, 10, 0.95) 100%)',
            backgroundBlendMode: 'overlay',
            marginBottom: '3rem',
            padding: '3rem',
            borderRadius: '24px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            border: '1px solid rgba(203, 161, 83, 0.2)',
            boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)'
          }}
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
        >
          <div>
            <div style={{ display: 'inline-block', padding: '0.4rem 1rem', background: 'rgba(255,255,255,0.05)', borderRadius: '20px', fontSize: '0.9rem', marginBottom: '1.5rem', border: '1px solid rgba(255,255,255,0.1)', color: 'var(--primary)' }}>
              لوحة التحكم (Dashboard)
            </div>
            <h1 style={{ fontSize: '3rem', marginBottom: '0.5rem', fontWeight: 900, letterSpacing: '-1px' }}>
              مرحباً بعودتك، <span style={{ color: 'var(--primary)' }}>{firstName}</span> 👋
            </h1>
            <p style={{ opacity: 0.8, fontSize: '1.2rem', margin: 0, maxWidth: '600px', lineHeight: 1.6 }}>
              جاهز لتحقيق هدف جديد اليوم؟ دعنا نتابع من حيث توقفنا.
            </p>
          </div>
          <div style={{ display: 'flex', gap: '3rem', textAlign: 'center', background: 'rgba(0,0,0,0.4)', padding: '2rem 3rem', borderRadius: '20px', border: '1px solid rgba(255,255,255,0.05)', backdropFilter: 'blur(10px)' }}>
            <div>
              <div style={{ fontSize: '2.5rem', fontWeight: 900, color: '#f97316', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', textShadow: '0 0 20px rgba(249,115,22,0.4)' }}>
                <Flame size={32} /> 1
              </div>
              <p style={{ fontSize: '0.9rem', opacity: 0.7, margin: 0, fontWeight: 600, letterSpacing: '0.5px' }}>أيام متتالية</p>
            </div>
            <div style={{ width: '1px', background: 'linear-gradient(to bottom, transparent, rgba(255,255,255,0.2), transparent)' }}></div>
            <div>
              <div style={{ fontSize: '2.5rem', fontWeight: 900, color: 'var(--success)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', textShadow: '0 0 20px rgba(34,197,94,0.4)' }}>
                <Trophy size={32} /> {points.toLocaleString()}
              </div>
              <p style={{ fontSize: '0.9rem', opacity: 0.7, margin: 0, fontWeight: 600, letterSpacing: '0.5px' }}>نقطة خبرة (XP)</p>
            </div>
          </div>
        </motion.div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: '3rem' }}>
          
          {/* Main Content Area */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '3rem' }}>
            
            {/* Quick Actions - Bento Grid */}
            <motion.div 
              variants={containerVariants}
              initial="hidden"
              animate="show"
            >
              <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <TrendingUp color="var(--primary)" /> الوصول السريع
              </h2>
              
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '1rem' }}>
                {[
                  { href: '/dashboard/wallet', icon: Wallet, color: '#eab308', title: 'محفظتي' },
                  { href: '/features/ai-tutor', icon: Bot, color: '#3b82f6', title: 'المساعد الذكي' },
                  { href: '/features/live-class', icon: Video, color: '#f43f5e', title: 'بث مباشر' },
                  { href: '/features/study-rooms', icon: Headphones, color: '#a855f7', title: 'غرف الدراسة' },
                  { href: '/courses', icon: BookOpen, color: '#22c55e', title: 'تصفح الكورسات' }
                ].map((item, idx) => (
                  <motion.div key={idx} variants={itemVariants}>
                    <Link 
                      href={item.href} 
                      className="group"
                      style={{ 
                        background: 'rgba(255,255,255,0.02)', 
                        padding: '1.5rem', 
                        borderRadius: '20px', 
                        textAlign: 'center', 
                        border: '1px solid rgba(255,255,255,0.05)', 
                        display: 'flex', 
                        flexDirection: 'column', 
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '1rem',
                        transition: 'all 0.3s',
                        height: '100%',
                        position: 'relative',
                        overflow: 'hidden'
                      }}
                    >
                      <div className="absolute inset-0 opacity-0 group-hover:opacity-10" style={{ background: `radial-gradient(circle at center, ${item.color} 0%, transparent 70%)`, transition: 'opacity 0.3s' }} />
                      <item.icon size={36} color={item.color} style={{ transition: 'transform 0.3s' }} className="group-hover:scale-110" />
                      <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: '#fff', margin: 0 }}>{item.title}</h3>
                    </Link>
                  </motion.div>
                ))}
              </div>
            </motion.div>

            {/* Continue Learning */}
            <motion.div 
              variants={itemVariants}
              initial="hidden"
              animate="show"
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <PlayCircle color="var(--primary)" /> مساقاتي الحالية ({displayCourses.length})
                </h2>
                {displayCourses.length > 0 && (
                  <Link href="/courses" style={{ color: 'var(--primary)', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                    استكشاف المزيد <ChevronLeft size={16} />
                  </Link>
                )}
              </div>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                {displayCourses.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '4rem 2rem', background: 'rgba(255,255,255,0.02)', border: '1px dashed rgba(255,255,255,0.1)', borderRadius: '24px' }}>
                    <BookOpen size={48} color="rgba(255,255,255,0.2)" style={{ margin: '0 auto 1.5rem' }} />
                    <h3 style={{ fontSize: '1.5rem', marginBottom: '1rem', color: '#fff' }}>لم تشترك في أي كورس بعد</h3>
                    <p style={{ color: 'rgba(255,255,255,0.5)', marginBottom: '2rem', maxWidth: '400px', margin: '0 auto 2rem' }}>
                      ابدأ رحلتك التعليمية الآن! تصفح مئات الكورسات المتقدمة المتاحة على المنصة.
                    </p>
                    <Link href="/courses" className="btn btn-solid" style={{ padding: '1rem 2.5rem', fontSize: '1.1rem' }}>
                      استكشف الكورسات الآن
                    </Link>
                  </div>
                ) : (
                  displayCourses.map((enrollment: any, index: number) => {
                    const progress = enrollment.progress || 0;
                    return (
                      <div 
                        key={enrollment.id} 
                        className="group"
                        style={{ 
                          display: 'flex', 
                          alignItems: 'center', 
                          gap: '2rem', 
                          background: 'rgba(255,255,255,0.02)', 
                          padding: '1.5rem', 
                          borderRadius: '20px', 
                          border: '1px solid rgba(255,255,255,0.05)',
                          transition: 'all 0.3s'
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.04)'}
                        onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.02)'}
                      >
                        <div style={{ width: '120px', height: '80px', borderRadius: '12px', background: enrollment.course.thumbnail ? `url(${enrollment.course.thumbnail}) center/cover` : '#222', position: 'relative', overflow: 'hidden' }}>
                          <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0, transition: 'opacity 0.3s' }} className="group-hover:opacity-100">
                            <PlayCircle size={32} color="var(--primary)" />
                          </div>
                        </div>
                        
                        <div style={{ flex: 1 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.3rem' }}>
                            <span style={{ fontSize: '0.75rem', background: 'rgba(255,255,255,0.1)', padding: '0.2rem 0.6rem', borderRadius: '4px', color: 'rgba(255,255,255,0.8)' }}>
                              {enrollment.course.category || 'كورس'}
                            </span>
                            {progress === 100 && <span style={{ fontSize: '0.75rem', background: 'rgba(34,197,94,0.2)', color: '#22c55e', padding: '0.2rem 0.6rem', borderRadius: '4px', display: 'flex', alignItems: 'center', gap: '0.2rem' }}><CheckCircle2 size={12} /> مكتمل</span>}
                          </div>
                          
                          <h4 style={{ fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '0.5rem', color: '#fff' }}>{enrollment.course.title}</h4>
                          <p style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.5)', margin: 0, display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                            <Clock size={14} /> آخر نشاط: {new Date(enrollment.updatedAt).toLocaleDateString('ar-SA')}
                          </p>
                        </div>

                        <div style={{ width: '180px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', marginBottom: '0.5rem', fontWeight: 600 }}>
                            <span style={{ color: 'rgba(255,255,255,0.7)' }}>نسبة الإنجاز</span>
                            <span style={{ color: progress === 100 ? 'var(--success)' : 'var(--primary)' }}>{progress}%</span>
                          </div>
                          <div style={{ height: '8px', background: 'rgba(255,255,255,0.05)', borderRadius: '4px', overflow: 'hidden' }}>
                            <motion.div 
                              initial={{ width: 0 }}
                              animate={{ width: `${progress}%` }}
                              transition={{ duration: 1, ease: 'easeOut' }}
                              style={{ height: '100%', background: progress === 100 ? 'var(--success)' : 'var(--primary)', borderRadius: '4px', boxShadow: progress === 100 ? '0 0 10px rgba(34,197,94,0.5)' : '0 0 10px rgba(203,161,83,0.5)' }} 
                            />
                          </div>
                        </div>

                        <Link href={`/courses/${enrollment.courseId}/learn`} className="btn btn-outline" style={{ padding: '0.8rem 1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem', border: '1px solid rgba(255,255,255,0.1)' }}>
                          {progress === 0 ? 'ابدأ الآن' : progress === 100 ? 'مراجعة' : 'متابعة'} <ArrowRight size={16} />
                        </Link>
                      </div>
                    );
                  })
                )}
              </div>
            </motion.div>
          </div>

          {/* Sidebar */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            
            {/* Notifications */}
            <motion.div 
              className="glass-card" 
              style={{ padding: '2rem', borderRadius: '24px', border: '1px solid rgba(255,255,255,0.05)', background: 'rgba(15,15,15,0.6)' }}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.4 }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <h3 style={{ fontSize: '1.3rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0 }}>
                  <Bell size={20} color="var(--primary)" /> الإشعارات 
                </h3>
                <span style={{ background: 'var(--primary)', color: '#000', padding: '0.1rem 0.5rem', borderRadius: '10px', fontSize: '0.8rem', fontWeight: 'bold' }}>جديد</span>
              </div>
              
              <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '1.25rem', margin: 0, padding: 0 }}>
                <li style={{ padding: '1rem', background: 'rgba(255,255,255,0.02)', borderRadius: '12px', borderLeft: '3px solid var(--primary)' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#fff', marginBottom: '0.4rem', fontWeight: 600, fontSize: '0.95rem' }}>
                    <ShieldCheck size={16} color="var(--primary)" /> تم تفعيل حسابك بنجاح!
                  </span>
                  <p style={{ color: 'rgba(255,255,255,0.6)', margin: 0, fontSize: '0.85rem', lineHeight: 1.5 }}>
                    مرحباً بك في منصة KQ Academy. رحلتك التعليمية تبدأ من هنا. نتمنى لك التوفيق!
                  </p>
                </li>
                {enrollments.length === 0 && (
                  <li style={{ padding: '1rem', background: 'rgba(34,197,94,0.05)', borderRadius: '12px', borderLeft: '3px solid var(--success)' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#fff', marginBottom: '0.4rem', fontWeight: 600, fontSize: '0.95rem' }}>
                      <BookOpen size={16} color="var(--success)" /> مقترح لك
                    </span>
                    <p style={{ color: 'rgba(255,255,255,0.6)', margin: 0, fontSize: '0.85rem', lineHeight: 1.5 }}>
                      تصفح الكورسات المتاحة الآن وابدأ أول خطوة نحو هدفك. <Link href="/courses" style={{ color: 'var(--success)', textDecoration: 'underline' }}>تصفح الآن</Link>
                    </p>
                  </li>
                )}
              </ul>
            </motion.div>

          </div>
        </div>
      </div>
    </div>
  );
}
