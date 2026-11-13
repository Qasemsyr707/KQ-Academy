'use client';

import { useEffect } from 'react';

const TARGET = '[data-spotlight], [data-tilt]';
const MAX_TILT_DEG = 3.5;

/**
 * One delegated, rAF-throttled pointer listener for every interactive card.
 *
 *  • data-spotlight → writes --mx / --my so CSS can paint a soft gold light
 *  • data-tilt      → additionally writes --rx / --ry for a restrained 3D tilt
 *
 * Only active for fine pointers (mouse / trackpad). Touch devices never pay
 * for it, and reduced-motion users get the light without the tilt.
 */
export default function PointerEffects() {
  useEffect(() => {
    const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)');
    if (!finePointer.matches) return;
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

    let active: HTMLElement | null = null;
    let frame = 0;
    let x = 0;
    let y = 0;

    const reset = (el: HTMLElement) => {
      el.style.removeProperty('--rx');
      el.style.removeProperty('--ry');
      el.removeAttribute('data-pointer');
    };

    const paint = () => {
      frame = 0;
      const el = active;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const px = x - rect.left;
      const py = y - rect.top;
      el.style.setProperty('--mx', `${px.toFixed(1)}px`);
      el.style.setProperty('--my', `${py.toFixed(1)}px`);
      el.setAttribute('data-pointer', 'on');

      if (el.hasAttribute('data-tilt') && !reducedMotion.matches && rect.width > 0 && rect.height > 0) {
        const ry = (px / rect.width - 0.5) * 2 * MAX_TILT_DEG;
        const rx = (0.5 - py / rect.height) * 2 * MAX_TILT_DEG;
        el.style.setProperty('--rx', `${rx.toFixed(2)}deg`);
        el.style.setProperty('--ry', `${ry.toFixed(2)}deg`);
      }
    };

    const onMove = (event: PointerEvent) => {
      if (event.pointerType !== 'mouse') return;
      const target = event.target instanceof Element ? event.target.closest<HTMLElement>(TARGET) : null;
      if (active && active !== target) reset(active);
      active = target;
      if (!target) return;
      x = event.clientX;
      y = event.clientY;
      if (!frame) frame = window.requestAnimationFrame(paint);
    };

    const onLeaveWindow = () => {
      if (active) reset(active);
      active = null;
    };

    document.addEventListener('pointermove', onMove, { passive: true });
    document.documentElement.addEventListener('pointerleave', onLeaveWindow);
    window.addEventListener('blur', onLeaveWindow);

    return () => {
      document.removeEventListener('pointermove', onMove);
      document.documentElement.removeEventListener('pointerleave', onLeaveWindow);
      window.removeEventListener('blur', onLeaveWindow);
      if (frame) window.cancelAnimationFrame(frame);
      if (active) reset(active);
    };
  }, []);

  return null;
}
