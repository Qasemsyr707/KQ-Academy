'use client';

import Link from 'next/link';
import { useSession, signOut } from 'next-auth/react';
import { useState, useRef, useEffect } from 'react';
import { 
  BookOpen, Users, ChevronDown, Wallet, Bell, ShoppingCart, 
  Sun, Moon, LogOut, User, PlaySquare, Briefcase
} from 'lucide-react';

export default function Navbar() {
  const { data: session, status } = useSession();
  const [isDark, setIsDark] = useState(true);
  const [showDropdown, setShowDropdown] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const notificationsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
      if (notificationsRef.current && !notificationsRef.current.contains(event.target as Node)) {
        setShowNotifications(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const isAdmin = (session?.user as any)?.role === 'ADMIN';
  const isInstructor = (session?.user as any)?.role === 'INSTRUCTOR';

  return (
    <nav style={{
      position: 'fixed',
      top: 0,
      left: 0,
      width: '100%',
      padding: '0.85rem 2rem',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      background: 'rgba(5,5,5,0.85)',
      backdropFilter: 'blur(20px)',
      WebkitBackdropFilter: 'blur(20px)',
      borderBottom: '1px solid rgba(255,255,255,0.05)',
      zIndex: 100,
      gap: '1rem'
    }}>
      {/* Logo */}
      <Link href="/" style={{ 
        display: 'flex', 
        alignItems: 'center', 
        gap: '0.5rem', 
        fontWeight: 'bold', 
        fontSize: '1.4rem',
        textDecoration: 'none',
        color: '#fff',
        flexShrink: 0
      }}>
        <div style={{ 
          width: '36px', height: '36px', 
          background: 'var(--primary)', 
          borderRadius: '10px', 
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: '#000', fontWeight: '900', fontSize: '1rem'
        }}>KQ</div>
        <span style={{ 
          background: 'linear-gradient(135deg, var(--primary), #e0b86a)', 
          WebkitBackgroundClip: 'text', 
          WebkitTextFillColor: 'transparent' 
        }}>Academy</span>
      </Link>

      {/* Nav Links */}
      <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'nowrap' }}>
        <Link href="/courses" style={{ fontWeight: 600, color: '#fff', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
          <BookOpen size={16} /> الكورسات
        </Link>
        <Link href="/dashboard" style={{ fontWeight: 600, color: '#fff', textDecoration: 'none' }}>
          لوحة التحكم
        </Link>
        <Link href="/instructor" style={{ fontWeight: 600, color: '#fff', textDecoration: 'none' }}>
          المدربون
        </Link>
        <Link href="/community" style={{ fontWeight: 600, color: '#fff', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
          <Users size={16} /> المجتمع
        </Link>

        {/* Advanced Features Dropdown */}
        <div style={{ position: 'relative' }} ref={dropdownRef}>
          <button 
            onClick={() => setShowDropdown(!showDropdown)}
            style={{ 
              background: 'none', border: 'none', color: '#fff', fontWeight: 600, 
              display: 'flex', alignItems: 'center', gap: '0.25rem', cursor: 'pointer',
              fontSize: '1rem', fontFamily: 'inherit'
            }}
          >
            ميزات متقدمة <ChevronDown size={16} />
          </button>
          
          {showDropdown && (
            <div style={{
              position: 'absolute',
              top: 'calc(100% + 0.75rem)',
              right: 0,
              minWidth: '240px',
              maxHeight: '400px',
              overflowY: 'auto',
              background: 'rgba(10,10,10,0.95)',
              border: '1px solid rgba(203,161,83,0.2)',
              borderRadius: '12px',
              padding: '0.5rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.25rem',
              boxShadow: '0 20px 50px rgba(0,0,0,0.5)',
              backdropFilter: 'blur(20px)',
            }}>
              {isAdmin && (
                <Link onClick={() => setShowDropdown(false)} href="/admin" style={{ padding: '0.6rem 0.75rem', borderRadius: '8px', color: '#eab308', fontWeight: 'bold', textDecoration: 'none', fontSize: '0.9rem' }}>⚙️ لوحة الإدارة</Link>
              )}
              {(isAdmin || isInstructor) && (
                <Link onClick={() => setShowDropdown(false)} href="/instructor" style={{ padding: '0.6rem 0.75rem', borderRadius: '8px', color: '#10b981', fontWeight: 'bold', textDecoration: 'none', fontSize: '0.9rem' }}>👨‍🏫 لوحة المدربين</Link>
              )}
              <Link onClick={() => setShowDropdown(false)} href="/verify" style={{ padding: '0.6rem 0.75rem', borderRadius: '8px', color: '#3b82f6', fontWeight: 'bold', textDecoration: 'none', fontSize: '0.9rem' }}>📜 التحقق من شهادة</Link>
              <Link onClick={() => setShowDropdown(false)} href="/live-class" style={{ padding: '0.6rem 0.75rem', borderRadius: '8px', color: '#ef4444', fontWeight: 'bold', textDecoration: 'none', fontSize: '0.9rem' }}>🎥 مركز البث المباشر</Link>
              <Link onClick={() => setShowDropdown(false)} href="/features/flashcards" style={{ padding: '0.6rem 0.75rem', borderRadius: '8px', color: '#4f46e5', textDecoration: 'none', fontSize: '0.9rem' }}>🃏 البطاقات الذكية</Link>
              <Link onClick={() => setShowDropdown(false)} href="/features/exam" style={{ padding: '0.6rem 0.75rem', borderRadius: '8px', color: '#ef4444', textDecoration: 'none', fontSize: '0.9rem' }}>⏱️ محاكي الامتحان</Link>
              <Link onClick={() => setShowDropdown(false)} href="/features/jobs" style={{ padding: '0.6rem 0.75rem', borderRadius: '8px', color: '#7c3aed', textDecoration: 'none', fontSize: '0.9rem' }}>💼 سوق العمل</Link>
              <Link onClick={() => setShowDropdown(false)} href="/features/leaderboard" style={{ padding: '0.6rem 0.75rem', borderRadius: '8px', color: '#d97706', textDecoration: 'none', fontSize: '0.9rem' }}>🏆 أوائل القطر</Link>
              <Link onClick={() => setShowDropdown(false)} href="/features/focus" style={{ padding: '0.6rem 0.75rem', borderRadius: '8px', color: '#6366f1', textDecoration: 'none', fontSize: '0.9rem' }}>🎧 وضع التركيز</Link>
              <Link onClick={() => setShowDropdown(false)} href="/features/resume" style={{ padding: '0.6rem 0.75rem', borderRadius: '8px', color: 'rgba(255,255,255,0.8)', textDecoration: 'none', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Briefcase size={14} /> صانع السيرة الذاتية
              </Link>
              <Link onClick={() => setShowDropdown(false)} href="/features/shorts" style={{ padding: '0.6rem 0.75rem', borderRadius: '8px', color: 'rgba(255,255,255,0.8)', textDecoration: 'none', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <PlaySquare size={14} /> الفيديوهات القصيرة
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* Right Side Actions */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexShrink: 0 }}>
        {/* Wallet */}
        <Link href="/dashboard/wallet" style={{ 
          display: 'flex', alignItems: 'center', gap: '0.35rem', 
          padding: '0.4rem 0.85rem', borderRadius: '2rem', 
          background: 'var(--primary)', color: '#000', 
          fontWeight: 'bold', textDecoration: 'none', fontSize: '0.85rem'
        }}>
          <Wallet size={15} /> 
          <span>المحفظة</span>
        </Link>

        {/* Notifications */}
        <div style={{ position: 'relative' }} ref={notificationsRef}>
          <button 
            onClick={() => setShowNotifications(!showNotifications)} 
            style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#fff', display: 'flex', position: 'relative' }}
          >
            <Bell size={20} />
            <span style={{
              position: 'absolute', top: '-4px', right: '-4px',
              background: '#ef4444', color: '#fff', fontSize: '0.6rem',
              fontWeight: 'bold', width: '16px', height: '16px',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              borderRadius: '50%', border: '2px solid rgba(5,5,5,0.85)'
            }}>3</span>
          </button>
          
          {showNotifications && (
            <div style={{
              position: 'absolute',
              top: 'calc(100% + 1rem)',
              right: '-80px',
              width: '320px',
              background: 'rgba(15,15,15,0.95)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '16px',
              boxShadow: '0 20px 50px rgba(0,0,0,0.5)',
              backdropFilter: 'blur(20px)',
              overflow: 'hidden',
              zIndex: 50
            }}>
              <div style={{ padding: '1rem', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h4 style={{ margin: 0, fontSize: '1rem', color: '#fff' }}>الإشعارات</h4>
                <button style={{ background: 'none', border: 'none', color: 'var(--primary)', fontSize: '0.8rem', cursor: 'pointer' }}>تحديد كـ مقروءة</button>
              </div>
              <div style={{ maxHeight: '350px', overflowY: 'auto' }}>
                {[
                  { title: 'مختبرات الـ AR أصبحت متاحة!', desc: 'قم بتجربة تشريح القلب البشري في ميزة الواقع المعزز.', time: 'قبل 10 دقائق', isNew: true },
                  { title: 'تمت مراجعة مشروعك', desc: 'حصلت على تقييم 5 نجوم من المدرب في مشروع React.', time: 'قبل ساعتين', isNew: true },
                  { title: 'تذكير بالبث المباشر', desc: 'جلسة المراجعة لمادة الفيزياء تبدأ بعد 30 دقيقة.', time: 'قبل 3 أيام', isNew: false }
                ].map((notif, idx) => (
                  <div key={idx} style={{
                    padding: '1rem',
                    borderBottom: '1px solid rgba(255,255,255,0.02)',
                    background: notif.isNew ? 'rgba(203,161,83,0.05)' : 'transparent',
                    display: 'flex', gap: '1rem', alignItems: 'flex-start', cursor: 'pointer', transition: 'background 0.2s'
                  }} onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'} onMouseLeave={(e) => e.currentTarget.style.background = notif.isNew ? 'rgba(203,161,83,0.05)' : 'transparent'}>
                    <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: notif.isNew ? 'var(--primary)' : 'transparent', marginTop: '6px', flexShrink: 0 }}></div>
                    <div>
                      <h5 style={{ margin: '0 0 0.3rem 0', color: '#fff', fontSize: '0.9rem' }}>{notif.title}</h5>
                      <p style={{ margin: 0, color: 'rgba(255,255,255,0.6)', fontSize: '0.8rem', lineHeight: 1.4 }}>{notif.desc}</p>
                      <span style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.4)', marginTop: '0.4rem', display: 'block' }}>{notif.time}</span>
                    </div>
                  </div>
                ))}
              </div>
              <Link href="/dashboard" onClick={() => setShowNotifications(false)} style={{
                display: 'block', padding: '0.8rem', textAlign: 'center',
                background: 'rgba(255,255,255,0.02)', color: 'var(--primary)',
                textDecoration: 'none', fontSize: '0.85rem', fontWeight: 'bold'
              }}>
                عرض كل الإشعارات
              </Link>
            </div>
          )}
        </div>

        {/* Cart */}
        <Link href="/checkout" style={{ position: 'relative', color: '#fff', display: 'flex' }}>
          <ShoppingCart size={20} />
        </Link>

        {/* Dark/Light Toggle */}
        <button 
          onClick={() => setIsDark(!isDark)} 
          style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#fff', display: 'flex' }}
        >
          {isDark ? <Sun size={20} /> : <Moon size={20} />}
        </button>

        {/* Auth */}
        {status === 'loading' ? (
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
             <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: 'rgba(255,255,255,0.1)' }}></div>
          </div>
        ) : session ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Link href="/profile" style={{ 
              display: 'flex', alignItems: 'center', gap: '0.5rem', 
              background: 'rgba(255,255,255,0.05)', padding: '0.4rem 0.75rem', 
              borderRadius: '2rem', border: '1px solid rgba(255,255,255,0.1)', 
              color: '#fff', textDecoration: 'none' 
            }}>
              <div style={{ 
                width: '28px', height: '28px', borderRadius: '50%', 
                background: 'var(--primary)', color: '#000', 
                display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '0.85rem'
              }}>
                {session.user?.name?.charAt(0)?.toUpperCase() || 'أ'}
              </div>
            </Link>
            <button 
              onClick={() => signOut({ callbackUrl: '/login' })} 
              style={{ fontSize: '0.85rem', color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '0.25rem' }}
            >
              <LogOut size={16} /> خروج
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <Link href="/login" style={{ fontWeight: 'bold', padding: '0.4rem 0.85rem', color: '#fff', textDecoration: 'none', fontSize: '0.9rem' }}>دخول</Link>
            <Link href="/register" style={{ 
              fontWeight: 'bold', padding: '0.4rem 0.85rem', 
              background: 'var(--primary)', color: '#000', 
              borderRadius: '0.5rem', textDecoration: 'none', fontSize: '0.9rem'
            }}>تسجيل</Link>
          </div>
        )}
      </div>
    </nav>
  );
}
