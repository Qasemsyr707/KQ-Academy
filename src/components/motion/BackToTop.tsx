'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { ArrowUp } from 'lucide-react';
import styles from './BackToTop.module.css';

// Immersive or tool-like screens where a floating control would get in the way.
const HIDDEN_PREFIXES = ['/admin', '/instructor', '/live', '/features/live-class', '/features/shorts', '/shorts', '/lesson'];

function isHiddenRoute(pathname: string) {
  if (/^\/courses\/[^/]+\/learn/.test(pathname)) return true;
  return HIDDEN_PREFIXES.some(prefix => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

export default function BackToTop() {
  const pathname = usePathname() ?? '/';
  const [visible, setVisible] = useState(false);
  const hidden = isHiddenRoute(pathname);

  useEffect(() => {
    if (hidden) return;
    let frame = 0;
    const update = () => {
      frame = 0;
      setVisible(window.scrollY > window.innerHeight * 1.5);
    };
    const onScroll = () => {
      if (!frame) frame = window.requestAnimationFrame(update);
    };
    // Read the initial position on the next frame (handles restored scroll).
    frame = window.requestAnimationFrame(update);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, [hidden]);

  if (hidden) return null;

  const scrollToTop = () => {
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    window.scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' });
    // Return keyboard focus to the start of the page for screen-reader users.
    document.getElementById('main-content')?.focus({ preventScroll: true });
  };

  return (
    <button
      type="button"
      className={styles.button}
      data-visible={visible ? 'true' : 'false'}
      onClick={scrollToTop}
      aria-label="العودة إلى أعلى الصفحة"
      tabIndex={visible ? 0 : -1}
      aria-hidden={!visible}
    >
      <ArrowUp size={20} aria-hidden="true" />
    </button>
  );
}
