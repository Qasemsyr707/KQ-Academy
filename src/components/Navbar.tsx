'use client';

import Link from 'next/link';
import { useSession, signOut } from 'next-auth/react';
import { useState, useRef, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { 
  BookOpen, Users, ChevronDown, Wallet, Bell, ShoppingCart, 
  Sun, Moon, LogOut, Menu, X, Home, LayoutDashboard,
  GraduationCap, Briefcase, PlaySquare, ShieldCheck
} from 'lucide-react';

export default function Navbar() {
  const { data: session, status } = useSession();
  const pathname = usePathname();
  const [isDark, setIsDark] = useState(true);
  const [showDropdown, setShowDropdown] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
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

  // Close drawer on route change
  useEffect(() => {
    setDrawerOpen(false);
  }, [pathname]);

  // Prevent body scroll when drawer is open
  useEffect(() => {
    if (drawerOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [drawerOpen]);

  const isAdmin = (session?.user as any)?.role === 'ADMIN';
  const isInstructor = (session?.user as any)?.role === 'INSTRUCTOR';

  const navLinks = [
    { href: '/', label: 'الرئيسية', icon: Home },
    { href: '/courses', label: 'الكورسات', icon: BookOpen },
    { href: '/curriculum', label: 'المنهاج الدراسي', icon: GraduationCap },
    { href: '/dashboard', label: 'لوحة التحكم', icon: LayoutDashboard },
    { href: '/instructor', label: 'المدربون', icon: Briefcase },
    { href: '/community', label: 'المجتمع', icon: Users },
  ];

  const advancedLinks = [
    { href: '/verify', label: 'التحقق من شهادة', emoji: '📜', color: '#3b82f6' },
    { href: '/features/live-class', label: 'مركز البث المباشر', emoji: '🎥', color: '#ef4444' },
    { href: '/features/flashcards', label: 'البطاقات الذكية', emoji: '🃏', color: '#4f46e5' },
    { href: '/features/exam', label: 'محاكي الامتحان', emoji: '⏱️', color: '#ef4444' },
    { href: '/features/jobs', label: 'سوق العمل', emoji: '💼', color: '#7c3aed' },
    { href: '/features/leaderboard', label: 'أوائل القطر', emoji: '🏆', color: '#d97706' },
    { href: '/features/focus', label: 'وضع التركيز', emoji: '🎧', color: '#6366f1' },
    { href: '/features/resume', label: 'صانع السيرة الذاتية', emoji: '📄', color: '#10b981' },
    { href: '/features/shorts', label: 'الفيديوهات القصيرة', emoji: '🎬', color: '#f43f5e' },
  ];

  return (
    <>
      <style dangerouslySetInnerHTML={{__html: `
        .navbar-root {
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          padding: 0.75rem 2rem;
          display: flex;
          justify-content: space-between;
          align-items: center;
          background: rgba(5,5,5,0.92);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          border-bottom: 1px solid rgba(255,255,255,0.06);
          z-index: 200;
          gap: 1rem;
        }

        /* Desktop nav links */
        .nav-desktop-links {
          display: flex;
          gap: 0.35rem;
          align-items: center;
          flex: 1;
          justify-content: center;
        }
        .nav-link-pill {
          font-weight: 600;
          font-size: 0.9rem;
          color: rgba(255,255,255,0.75);
          text-decoration: none;
          display: flex;
          align-items: center;
          gap: 0.35rem;
          white-space: nowrap;
          padding: 0.45rem 0.85rem;
          border-radius: 30px;
          background: transparent;
          border: 1px solid transparent;
          transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
          cursor: pointer;
          font-family: inherit;
        }
        .nav-link-pill:hover, .nav-link-pill.active {
          background: rgba(203,161,83,0.12);
          border-color: rgba(203,161,83,0.4);
          color: var(--primary);
        }
        .nav-actions {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          flex-shrink: 0;
        }

        /* Hamburger */
        .hamburger-btn {
          display: none;
          background: rgba(255,255,255,0.05);
          border: 1px solid rgba(255,255,255,0.1);
          color: #fff;
          border-radius: 10px;
          padding: 0.5rem;
          cursor: pointer;
          align-items: center;
          justify-content: center;
          transition: all 0.2s;
        }
        .hamburger-btn:hover {
          background: rgba(203,161,83,0.15);
          border-color: rgba(203,161,83,0.4);
          color: var(--primary);
        }

        /* Mobile Drawer Overlay */
        .drawer-overlay {
          display: none;
          position: fixed;
          inset: 0;
          background: rgba(0,0,0,0.7);
          backdrop-filter: blur(4px);
          z-index: 300;
          opacity: 0;
          transition: opacity 0.3s ease;
        }
        .drawer-overlay.open {
          display: block;
          opacity: 1;
        }

        /* Drawer Panel */
        .drawer-panel {
          position: fixed;
          top: 0;
          right: -320px;
          width: 300px;
          max-width: 85vw;
          height: 100vh;
          background: rgba(8,8,8,0.98);
          border-left: 1px solid rgba(203,161,83,0.15);
          z-index: 400;
          display: flex;
          flex-direction: column;
          transition: right 0.35s cubic-bezier(0.4, 0, 0.2, 1);
          overflow-y: auto;
          scrollbar-width: none;
        }
        .drawer-panel::-webkit-scrollbar { display: none; }
        .drawer-panel.open { right: 0; }

        .drawer-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 1rem 1.25rem;
          border-bottom: 1px solid rgba(255,255,255,0.05);
          flex-shrink: 0;
        }
        .drawer-close-btn {
          background: rgba(255,255,255,0.05);
          border: 1px solid rgba(255,255,255,0.1);
          color: #fff;
          border-radius: 8px;
          padding: 0.45rem;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.2s;
        }
        .drawer-close-btn:hover {
          background: rgba(239,68,68,0.15);
          border-color: rgba(239,68,68,0.4);
          color: #ef4444;
        }
        .drawer-nav-link {
          display: flex;
          align-items: center;
          gap: 0.85rem;
          padding: 0.85rem 1.25rem;
          color: rgba(255,255,255,0.8);
          text-decoration: none;
          font-weight: 600;
          font-size: 1rem;
          border-radius: 12px;
          margin: 0 0.75rem;
          transition: all 0.2s;
          border: 1px solid transparent;
        }
        .drawer-nav-link:hover, .drawer-nav-link.active {
          background: rgba(203,161,83,0.1);
          border-color: rgba(203,161,83,0.25);
          color: var(--primary);
        }
        .drawer-nav-link .icon-wrap {
          width: 36px;
          height: 36px;
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: rgba(255,255,255,0.04);
          flex-shrink: 0;
          transition: all 0.2s;
        }
        .drawer-nav-link:hover .icon-wrap,
        .drawer-nav-link.active .icon-wrap {
          background: rgba(203,161,83,0.15);
        }
        .drawer-section-title {
          font-size: 0.7rem;
          font-weight: 700;
          color: rgba(255,255,255,0.3);
          letter-spacing: 1.5px;
          text-transform: uppercase;
          padding: 1rem 1.5rem 0.5rem;
        }
        .drawer-divider {
          height: 1px;
          background: rgba(255,255,255,0.05);
          margin: 0.75rem 1.25rem;
        }
        .drawer-advanced-link {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          padding: 0.65rem 1.25rem;
          color: rgba(255,255,255,0.7);
          text-decoration: none;
          font-size: 0.9rem;
          border-radius: 10px;
          margin: 0 0.75rem;
          transition: background 0.2s;
        }
        .drawer-advanced-link:hover {
          background: rgba(255,255,255,0.04);
          color: #fff;
        }
        .drawer-footer {
          padding: 1rem 1.25rem;
          border-top: 1px solid rgba(255,255,255,0.05);
          margin-top: auto;
          flex-shrink: 0;
        }

        /* Responsive Breakpoints */
        @media (max-width: 900px) {
          .nav-desktop-links { display: none; }
          .hamburger-btn { display: flex; }
          .navbar-root { padding: 0.6rem 1rem; }
        }
      `}} />

      <nav className="navbar-root">
        {/* Logo */}
        <Link href="/" style={{ display: 'flex', alignItems: 'center', flexShrink: 0 }}>
          <img 
            src="/logo.png" 
            alt="KQ Academy" 
            style={{ height: '42px', width: 'auto', objectFit: 'contain', filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.5))' }} 
          />
        </Link>

        {/* Desktop Nav Links */}
        <div className="nav-desktop-links">
          {navLinks.map((link) => (
            <Link 
              key={link.href} 
              href={link.href} 
              className={`nav-link-pill ${pathname === link.href ? 'active' : ''}`}
            >
              <link.icon size={15} /> {link.label}
            </Link>
          ))}

          {/* Advanced Dropdown */}
          <div style={{ position: 'relative' }} ref={dropdownRef}>
            <button 
              className={`nav-link-pill ${showDropdown ? 'active' : ''}`}
              onClick={() => setShowDropdown(!showDropdown)}
            >
              ميزات متقدمة <ChevronDown size={14} style={{ transform: showDropdown ? 'rotate(180deg)' : 'none', transition: '0.3s' }} />
            </button>
            {showDropdown && (
              <div style={{
                position: 'absolute', top: 'calc(100% + 0.6rem)', right: 0,
                minWidth: '220px', maxHeight: '380px', overflowY: 'auto',
                background: 'rgba(10,10,10,0.97)', border: '1px solid rgba(203,161,83,0.2)',
                borderRadius: '16px', padding: '0.4rem', display: 'flex', flexDirection: 'column',
                gap: '0.15rem', boxShadow: '0 20px 50px rgba(0,0,0,0.6)', backdropFilter: 'blur(20px)', zIndex: 101,
              }}>
                {isAdmin && <Link onClick={() => setShowDropdown(false)} href="/admin" style={{ padding: '0.6rem 0.75rem', borderRadius: '8px', color: '#eab308', fontWeight: 'bold', textDecoration: 'none', fontSize: '0.9rem' }}>⚙️ لوحة الإدارة</Link>}
                {(isAdmin || isInstructor) && <Link onClick={() => setShowDropdown(false)} href="/instructor" style={{ padding: '0.6rem 0.75rem', borderRadius: '8px', color: '#10b981', fontWeight: 'bold', textDecoration: 'none', fontSize: '0.9rem' }}>👨‍🏫 لوحة المدربين</Link>}
                {advancedLinks.map(l => (
                  <Link key={l.href} onClick={() => setShowDropdown(false)} href={l.href} style={{ padding: '0.6rem 0.75rem', borderRadius: '8px', color: l.color, textDecoration: 'none', fontSize: '0.88rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span>{l.emoji}</span> {l.label}
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Actions */}
        <div className="nav-actions">
          {/* Wallet */}
          <Link href="/dashboard/wallet" style={{ 
            display: 'flex', alignItems: 'center', gap: '0.3rem', 
            padding: '0.4rem 0.75rem', borderRadius: '2rem', 
            background: 'var(--primary)', color: '#000', 
            fontWeight: 'bold', textDecoration: 'none', fontSize: '0.82rem', flexShrink: 0
          }}>
            <Wallet size={14} /> <span style={{ display: 'inline' }}>المحفظة</span>
          </Link>

          {/* Notifications */}
          <div style={{ position: 'relative' }} ref={notificationsRef}>
            <button onClick={() => setShowNotifications(!showNotifications)} 
              style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#fff', display: 'flex', position: 'relative' }}>
              <Bell size={20} />
              <span style={{ position: 'absolute', top: '-4px', right: '-4px', background: '#ef4444', color: '#fff', fontSize: '0.6rem', fontWeight: 'bold', width: '16px', height: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '50%', border: '2px solid rgba(5,5,5,0.92)' }}>3</span>
            </button>
            {showNotifications && (
              <div style={{ position: 'absolute', top: 'calc(100% + 1rem)', right: '-80px', width: '300px', background: 'rgba(15,15,15,0.97)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '16px', boxShadow: '0 20px 50px rgba(0,0,0,0.5)', backdropFilter: 'blur(20px)', overflow: 'hidden', zIndex: 50 }}>
                <div style={{ padding: '1rem', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <h4 style={{ margin: 0, fontSize: '1rem', color: '#fff' }}>الإشعارات</h4>
                  <button style={{ background: 'none', border: 'none', color: 'var(--primary)', fontSize: '0.8rem', cursor: 'pointer' }}>تحديد كـ مقروءة</button>
                </div>
                <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
                  {[
                    { title: 'مختبرات الـ AR أصبحت متاحة!', desc: 'قم بتجربة تشريح القلب البشري في الواقع المعزز.', time: 'قبل 10 دقائق', isNew: true },
                    { title: 'تمت مراجعة مشروعك', desc: 'حصلت على تقييم 5 نجوم من المدرب.', time: 'قبل ساعتين', isNew: true },
                    { title: 'تذكير بالبث المباشر', desc: 'جلسة المراجعة تبدأ بعد 30 دقيقة.', time: 'قبل 3 أيام', isNew: false }
                  ].map((notif, idx) => (
                    <div key={idx} style={{ padding: '0.85rem 1rem', borderBottom: '1px solid rgba(255,255,255,0.02)', background: notif.isNew ? 'rgba(203,161,83,0.05)' : 'transparent', display: 'flex', gap: '0.75rem', alignItems: 'flex-start', cursor: 'pointer' }}>
                      <div style={{ width: '7px', height: '7px', borderRadius: '50%', background: notif.isNew ? 'var(--primary)' : 'transparent', marginTop: '6px', flexShrink: 0 }} />
                      <div>
                        <h5 style={{ margin: '0 0 0.25rem 0', color: '#fff', fontSize: '0.875rem' }}>{notif.title}</h5>
                        <p style={{ margin: 0, color: 'rgba(255,255,255,0.55)', fontSize: '0.78rem', lineHeight: 1.4 }}>{notif.desc}</p>
                        <span style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.35)', marginTop: '0.3rem', display: 'block' }}>{notif.time}</span>
                      </div>
                    </div>
                  ))}
                </div>
                <Link href="/dashboard" onClick={() => setShowNotifications(false)} style={{ display: 'block', padding: '0.75rem', textAlign: 'center', background: 'rgba(255,255,255,0.02)', color: 'var(--primary)', textDecoration: 'none', fontSize: '0.85rem', fontWeight: 'bold' }}>
                  عرض كل الإشعارات
                </Link>
              </div>
            )}
          </div>

          {/* Cart */}
          <Link href="/checkout" style={{ position: 'relative', color: '#fff', display: 'flex' }}>
            <ShoppingCart size={20} />
          </Link>

          {/* Auth */}
          {status !== 'loading' && session && (
            <Link href="/profile" style={{ display: 'flex', alignItems: 'center', background: 'rgba(255,255,255,0.05)', padding: '0.3rem 0.5rem', borderRadius: '2rem', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', textDecoration: 'none' }}>
              <div style={{ width: '26px', height: '26px', borderRadius: '50%', background: 'var(--primary)', color: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '0.8rem' }}>
                {session.user?.name?.charAt(0)?.toUpperCase() || 'أ'}
              </div>
            </Link>
          )}
          {status !== 'loading' && !session && (
            <Link href="/login" style={{ fontWeight: 'bold', padding: '0.4rem 0.75rem', background: 'rgba(255,255,255,0.07)', color: '#fff', textDecoration: 'none', fontSize: '0.85rem', borderRadius: '0.5rem', border: '1px solid rgba(255,255,255,0.1)' }}>دخول</Link>
          )}

          {/* Hamburger Button (mobile only) */}
          <button className="hamburger-btn" onClick={() => setDrawerOpen(true)} aria-label="فتح القائمة">
            <Menu size={22} />
          </button>
        </div>
      </nav>

      {/* Mobile Drawer Overlay */}
      <div className={`drawer-overlay ${drawerOpen ? 'open' : ''}`} onClick={() => setDrawerOpen(false)} />

      {/* Mobile Drawer Panel */}
      <div className={`drawer-panel ${drawerOpen ? 'open' : ''}`}>
        {/* Drawer Header */}
        <div className="drawer-header">
          <Link href="/" onClick={() => setDrawerOpen(false)}>
            <img src="/logo.png" alt="KQ Academy" style={{ height: '36px', width: 'auto', objectFit: 'contain' }} />
          </Link>
          <button className="drawer-close-btn" onClick={() => setDrawerOpen(false)} aria-label="إغلاق القائمة">
            <X size={20} />
          </button>
        </div>

        {/* User Info */}
        {session && (
          <div style={{ padding: '1rem 1.25rem', display: 'flex', alignItems: 'center', gap: '0.85rem', background: 'rgba(203,161,83,0.05)', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
            <div style={{ width: '42px', height: '42px', borderRadius: '50%', background: 'linear-gradient(135deg, var(--primary), #b8852a)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '1.1rem', color: '#000', flexShrink: 0 }}>
              {session.user?.name?.charAt(0)?.toUpperCase() || 'أ'}
            </div>
            <div>
              <div style={{ fontWeight: 700, color: '#fff', fontSize: '0.95rem' }}>{session.user?.name}</div>
              <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.45)' }}>{session.user?.email}</div>
            </div>
          </div>
        )}

        {/* Nav Links */}
        <div style={{ padding: '0.75rem 0', flex: 1 }}>
          <p className="drawer-section-title">التنقل الرئيسي</p>
          {navLinks.map((link) => (
            <Link 
              key={link.href} 
              href={link.href} 
              className={`drawer-nav-link ${pathname === link.href ? 'active' : ''}`}
              onClick={() => setDrawerOpen(false)}
            >
              <span className="icon-wrap">
                <link.icon size={18} color={pathname === link.href ? 'var(--primary)' : 'rgba(255,255,255,0.6)'} />
              </span>
              {link.label}
            </Link>
          ))}

          {/* Advanced Features */}
          <div className="drawer-divider" />
          <p className="drawer-section-title">ميزات متقدمة</p>
          {isAdmin && (
            <Link href="/admin" className="drawer-advanced-link" onClick={() => setDrawerOpen(false)}>
              <span style={{ fontSize: '1.1rem' }}>⚙️</span> <span style={{ color: '#eab308', fontWeight: 700 }}>لوحة الإدارة</span>
            </Link>
          )}
          {(isAdmin || isInstructor) && (
            <Link href="/instructor" className="drawer-advanced-link" onClick={() => setDrawerOpen(false)}>
              <span style={{ fontSize: '1.1rem' }}>👨‍🏫</span> <span style={{ color: '#10b981', fontWeight: 700 }}>لوحة المدربين</span>
            </Link>
          )}
          {advancedLinks.map(l => (
            <Link key={l.href} href={l.href} className="drawer-advanced-link" onClick={() => setDrawerOpen(false)}>
              <span style={{ fontSize: '1.1rem' }}>{l.emoji}</span>
              <span>{l.label}</span>
            </Link>
          ))}
        </div>

        {/* Drawer Footer */}
        <div className="drawer-footer">
          {session ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <Link href="/profile" className="drawer-nav-link" style={{ margin: 0 }} onClick={() => setDrawerOpen(false)}>
                <span className="icon-wrap"><ShieldCheck size={18} color="rgba(255,255,255,0.6)" /></span>
                الملف الشخصي
              </Link>
              <button 
                onClick={() => { setDrawerOpen(false); signOut({ callbackUrl: '/login' }); }}
                style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', padding: '0.75rem 1.25rem', color: '#ef4444', background: 'rgba(239,68,68,0.07)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '12px', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 600, fontSize: '0.95rem', width: '100%', transition: 'all 0.2s' }}
              >
                <LogOut size={18} /> تسجيل الخروج
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <Link href="/login" onClick={() => setDrawerOpen(false)} style={{ flex: 1, textAlign: 'center', padding: '0.75rem', fontWeight: 'bold', color: '#fff', textDecoration: 'none', background: 'rgba(255,255,255,0.07)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)' }}>دخول</Link>
              <Link href="/register" onClick={() => setDrawerOpen(false)} style={{ flex: 1, textAlign: 'center', padding: '0.75rem', fontWeight: 'bold', background: 'var(--primary)', color: '#000', borderRadius: '12px', textDecoration: 'none' }}>تسجيل</Link>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
