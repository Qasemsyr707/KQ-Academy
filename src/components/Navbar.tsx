'use client';

import Link from 'next/link';
import { useSession, signOut } from 'next-auth/react';
import { useState, useRef, useEffect, useCallback } from 'react';
import { usePathname } from 'next/navigation';
import {
  BookOpen, Users, ChevronDown, Wallet, Bell, ShoppingCart,
  LogOut, Menu, X, Home, LayoutDashboard,
  GraduationCap, Briefcase, ShieldCheck
} from 'lucide-react';
import BrandLogo from '@/components/ui/BrandLogo';
import styles from './Navbar.module.css';

type NotificationItem = {
  id: string;
  title: string;
  message: string;
  link?: string | null;
  isRead: boolean;
  createdAt: string;
};

type SessionUserWithRole = { role?: string };

const navLinks = [
  { href: '/', label: 'الرئيسية', icon: Home },
  { href: '/courses', label: 'الكورسات', icon: BookOpen },
  { href: '/curriculum', label: 'المنهاج الدراسي', icon: GraduationCap },
  { href: '/dashboard', label: 'لوحة التحكم', icon: LayoutDashboard },
  { href: '/instructor', label: 'المدربون', icon: Briefcase },
  { href: '/community', label: 'المجتمع', icon: Users },
];

const advancedLinks = [
  { href: '/verify', label: 'التحقق من شهادة', emoji: '📜' },
  { href: '/features/live-class', label: 'مركز البث المباشر', emoji: '🎥' },
  { href: '/features/flashcards', label: 'البطاقات الذكية', emoji: '🃏' },
  { href: '/features/exam', label: 'محاكي الامتحان', emoji: '⏱️' },
  { href: '/features/jobs', label: 'سوق العمل', emoji: '💼' },
  { href: '/features/leaderboard', label: 'أوائل القطر', emoji: '🏆' },
  { href: '/features/focus', label: 'وضع التركيز', emoji: '🎧' },
  { href: '/features/resume', label: 'صانع السيرة الذاتية', emoji: '📄' },
  { href: '/features/shorts', label: 'الفيديوهات القصيرة', emoji: '🎬' },
];

export default function Navbar() {
  const { data: session, status } = useSession();
  const pathname = usePathname();
  const [showDropdown, setShowDropdown] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [lastPathname, setLastPathname] = useState(pathname);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const notificationsRef = useRef<HTMLDivElement>(null);
  const drawerRef = useRef<HTMLDivElement>(null);
  const drawerCloseRef = useRef<HTMLButtonElement>(null);
  const menuToggleRef = useRef<HTMLButtonElement>(null);

  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  // Close every overlay when the route changes (render-phase update, no effect needed).
  if (pathname !== lastPathname) {
    setLastPathname(pathname);
    setDrawerOpen(false);
    setShowDropdown(false);
    setShowNotifications(false);
  }

  useEffect(() => {
    if (status !== 'authenticated') return;
    const fetchNotifications = async () => {
      try {
        const res = await fetch('/api/notifications');
        if (res.ok) {
          const data = await res.json();
          const list: NotificationItem[] = data.notifications || [];
          setNotifications(list);
          setUnreadCount(list.filter(n => !n.isRead).length);
        }
      } catch (e) {
        console.error(e);
      }
    };
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 60000);
    return () => clearInterval(interval);
  }, [status]);

  const markAllAsRead = async () => {
    try {
      await fetch('/api/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ markAll: true })
      });
      setNotifications(notifications.map(n => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch (e) {
      console.error(e);
    }
  };

  // Click outside closes popovers.
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

  const closeDrawer = useCallback(() => {
    setDrawerOpen(false);
    menuToggleRef.current?.focus({ preventScroll: true });
  }, []);

  // Escape closes whatever is open.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      setShowDropdown(false);
      setShowNotifications(false);
      if (drawerOpen) closeDrawer();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [drawerOpen, closeDrawer]);

  // Condensed header once the page scrolls.
  useEffect(() => {
    let frame = 0;
    const update = () => {
      frame = 0;
      setScrolled(window.scrollY > 8);
    };
    const onScroll = () => {
      if (!frame) frame = window.requestAnimationFrame(update);
    };
    frame = window.requestAnimationFrame(update);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, []);

  // Drawer: lock page scroll, move focus inside, keep Tab within the panel.
  useEffect(() => {
    if (!drawerOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const focusTimer = window.setTimeout(() => drawerCloseRef.current?.focus({ preventScroll: true }), 60);

    const trapFocus = (event: KeyboardEvent) => {
      if (event.key !== 'Tab' || !drawerRef.current) return;
      const focusable = drawerRef.current.querySelectorAll<HTMLElement>('a[href], button:not([disabled])');
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', trapFocus);

    return () => {
      window.clearTimeout(focusTimer);
      document.removeEventListener('keydown', trapFocus);
      document.body.style.overflow = previousOverflow;
    };
  }, [drawerOpen]);

  const role = (session?.user as SessionUserWithRole | undefined)?.role;
  const isAdmin = role === 'ADMIN';
  const isInstructor = role === 'INSTRUCTOR';
  const initial = session?.user?.name?.charAt(0)?.toUpperCase() || 'أ';

  return (
    <>
      <header className={styles.header} data-scrolled={scrolled ? 'true' : 'false'}>
        <nav className={styles.inner} aria-label="التنقل الرئيسي">
          {/* Logo */}
          <Link href="/" className={styles.brand} aria-label="KQ Academy — الصفحة الرئيسية">
            <BrandLogo size={44} priority className={styles.brandLogo} />
          </Link>

          {/* Desktop Nav Links */}
          <div className={styles.links}>
            {navLinks.map(link => (
              <Link
                key={link.href}
                href={link.href}
                className={styles.link}
                aria-current={pathname === link.href ? 'page' : undefined}
              >
                <link.icon size={15} aria-hidden="true" /> {link.label}
              </Link>
            ))}

            {/* Advanced Dropdown */}
            <div className={styles.popoverWrap} ref={dropdownRef}>
              <button
                type="button"
                className={styles.link}
                onClick={() => setShowDropdown(!showDropdown)}
                aria-expanded={showDropdown}
                aria-controls="nav-features-menu"
                aria-haspopup="true"
              >
                ميزات متقدمة <ChevronDown size={14} className={styles.chevron} aria-hidden="true" />
              </button>
              <div id="nav-features-menu" className={styles.popover} data-open={showDropdown ? 'true' : 'false'}>
                <div className={styles.menuList}>
                  {(isAdmin || isInstructor) && (
                    <>
                      <p className={styles.menuHeading}>لوحات الإدارة</p>
                      {isAdmin && (
                        <Link onClick={() => setShowDropdown(false)} href="/admin" className={`${styles.menuItem} ${styles.menuItemAccent}`}>
                          <span className={styles.menuIcon} aria-hidden="true">⚙️</span> لوحة الإدارة
                        </Link>
                      )}
                      <Link onClick={() => setShowDropdown(false)} href="/instructor" className={`${styles.menuItem} ${styles.menuItemAccent}`}>
                        <span className={styles.menuIcon} aria-hidden="true">👨‍🏫</span> لوحة المدربين
                      </Link>
                      <div className={styles.menuDivider} />
                    </>
                  )}
                  <p className={styles.menuHeading}>أدوات التعلّم</p>
                  {advancedLinks.map(l => (
                    <Link key={l.href} onClick={() => setShowDropdown(false)} href={l.href} className={styles.menuItem}>
                      <span className={styles.menuIcon} aria-hidden="true">{l.emoji}</span> {l.label}
                    </Link>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className={styles.actions}>
            <Link href="/dashboard/wallet" className={styles.wallet}>
              <Wallet size={15} aria-hidden="true" /> <span className={styles.walletLabel}>المحفظة</span>
            </Link>

            {/* Notifications */}
            <div className={styles.popoverWrap} ref={notificationsRef}>
              <button
                type="button"
                className={styles.iconBtn}
                onClick={() => setShowNotifications(!showNotifications)}
                aria-expanded={showNotifications}
                aria-controls="nav-notifications"
                aria-label={unreadCount > 0 ? `الإشعارات، ${unreadCount} غير مقروءة` : 'الإشعارات'}
              >
                <Bell size={20} aria-hidden="true" />
                {unreadCount > 0 && (
                  <span className={styles.badge} aria-hidden="true">{unreadCount > 9 ? '9+' : unreadCount}</span>
                )}
              </button>
              <div
                id="nav-notifications"
                className={`${styles.popover} ${styles.notifications}`}
                data-open={showNotifications ? 'true' : 'false'}
              >
                <div className={styles.notifHeader}>
                  <h2>الإشعارات</h2>
                  <button type="button" onClick={markAllAsRead} className={styles.textBtn}>تحديد كـ مقروءة</button>
                </div>
                <div className={styles.notifList}>
                  {notifications.length === 0 ? (
                    <div className={styles.notifEmpty}>لا توجد إشعارات جديدة</div>
                  ) : (
                    notifications.map(notif => (
                      <Link
                        href={notif.link || '#'}
                        key={notif.id}
                        onClick={() => setShowNotifications(false)}
                        className={styles.notifItem}
                        data-unread={!notif.isRead ? 'true' : 'false'}
                      >
                        <span className={styles.notifDot} aria-hidden="true" />
                        <span>
                          <span className={styles.notifTitle} style={{ display: 'block', fontWeight: 700 }}>{notif.title}</span>
                          <span className={styles.notifMessage} style={{ display: 'block' }}>{notif.message}</span>
                          <span className={styles.notifDate}>
                            {new Date(notif.createdAt).toLocaleDateString('ar-SA', { year: 'numeric', month: 'short', day: 'numeric' })}
                          </span>
                        </span>
                      </Link>
                    ))
                  )}
                </div>
                <Link href="/dashboard" onClick={() => setShowNotifications(false)} className={styles.notifFooter}>
                  العودة للوحة التحكم
                </Link>
              </div>
            </div>

            {/* Cart */}
            <Link href="/checkout" className={styles.iconBtn} aria-label="سلة المشتريات">
              <ShoppingCart size={20} aria-hidden="true" />
            </Link>

            {/* Auth */}
            {status === 'loading' && <span className={`kq-skeleton ${styles.authPlaceholder}`} aria-hidden="true" />}
            {status !== 'loading' && session && (
              <Link href="/profile" className={styles.avatarLink} aria-label="الملف الشخصي">
                <span className={styles.avatar} aria-hidden="true">{initial}</span>
              </Link>
            )}
            {status !== 'loading' && !session && (
              <span className={styles.authGroup}>
                <Link href="/login" className={styles.loginBtn}>دخول</Link>
                <Link href="/register" className={styles.registerBtn}>إنشاء حساب</Link>
              </span>
            )}

            {/* Drawer toggle (mobile / tablet) */}
            <button
              ref={menuToggleRef}
              type="button"
              className={`${styles.iconBtn} ${styles.menuToggle}`}
              onClick={() => setDrawerOpen(true)}
              aria-label="فتح القائمة"
              aria-expanded={drawerOpen}
              aria-controls="mobile-drawer"
            >
              <Menu size={22} aria-hidden="true" />
            </button>
          </div>
        </nav>
      </header>

      {/* Mobile Drawer */}
      <div className={styles.overlay} data-open={drawerOpen ? 'true' : 'false'} onClick={closeDrawer} aria-hidden="true" />

      <div
        id="mobile-drawer"
        ref={drawerRef}
        className={styles.drawer}
        data-open={drawerOpen ? 'true' : 'false'}
        role="dialog"
        aria-modal="true"
        aria-label="القائمة الرئيسية"
        aria-hidden={!drawerOpen}
      >
        <div className={styles.drawerHeader}>
          <Link href="/" onClick={() => setDrawerOpen(false)} aria-label="KQ Academy — الصفحة الرئيسية">
            <BrandLogo size={38} />
          </Link>
          <button ref={drawerCloseRef} type="button" className={styles.drawerClose} onClick={closeDrawer} aria-label="إغلاق القائمة">
            <X size={20} aria-hidden="true" />
          </button>
        </div>

        {session && (
          <div className={styles.drawerUser}>
            <div className={styles.drawerUserAvatar} aria-hidden="true">{initial}</div>
            <div style={{ minWidth: 0 }}>
              <div className={styles.drawerUserName}>{session.user?.name}</div>
              <div className={styles.drawerUserEmail}>{session.user?.email}</div>
            </div>
          </div>
        )}

        <div className={styles.drawerBody}>
          <p className={styles.drawerSection}>التنقل الرئيسي</p>
          {navLinks.map((link, i) => (
            <Link
              key={link.href}
              href={link.href}
              className={styles.drawerLink}
              aria-current={pathname === link.href ? 'page' : undefined}
              onClick={() => setDrawerOpen(false)}
              style={{ '--i': i } as React.CSSProperties}
            >
              <span className={styles.drawerIcon}>
                <link.icon size={18} aria-hidden="true" />
              </span>
              {link.label}
            </Link>
          ))}

          <div className={styles.drawerDivider} />
          <p className={styles.drawerSection}>ميزات متقدمة</p>
          {isAdmin && (
            <Link href="/admin" className={styles.drawerLink} onClick={() => setDrawerOpen(false)} style={{ '--i': navLinks.length } as React.CSSProperties}>
              <span className={styles.drawerIcon} aria-hidden="true">⚙️</span>
              <span style={{ color: 'var(--gold-200)', fontWeight: 700 }}>لوحة الإدارة</span>
            </Link>
          )}
          {(isAdmin || isInstructor) && (
            <Link href="/instructor" className={styles.drawerLink} onClick={() => setDrawerOpen(false)} style={{ '--i': navLinks.length + 1 } as React.CSSProperties}>
              <span className={styles.drawerIcon} aria-hidden="true">👨‍🏫</span>
              <span style={{ color: 'var(--gold-200)', fontWeight: 700 }}>لوحة المدربين</span>
            </Link>
          )}
          {advancedLinks.map((l, i) => (
            <Link
              key={l.href}
              href={l.href}
              className={styles.drawerLink}
              onClick={() => setDrawerOpen(false)}
              style={{ '--i': navLinks.length + 2 + i } as React.CSSProperties}
            >
              <span className={styles.drawerIcon} aria-hidden="true">{l.emoji}</span>
              <span>{l.label}</span>
            </Link>
          ))}
        </div>

        <div className={styles.drawerFooter}>
          {session ? (
            <div className={styles.drawerAccount}>
              <Link href="/profile" className={styles.drawerLink} onClick={() => setDrawerOpen(false)}>
                <span className={styles.drawerIcon}><ShieldCheck size={18} aria-hidden="true" /></span>
                الملف الشخصي
              </Link>
              <button
                type="button"
                className={styles.logout}
                onClick={() => { setDrawerOpen(false); signOut({ callbackUrl: '/login' }); }}
              >
                <LogOut size={18} aria-hidden="true" /> تسجيل الخروج
              </button>
            </div>
          ) : (
            <div className={styles.drawerAuth}>
              <Link href="/login" onClick={() => setDrawerOpen(false)} className="btn btn-outline">دخول</Link>
              <Link href="/register" onClick={() => setDrawerOpen(false)} className="btn btn-solid">تسجيل</Link>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
