'use client';

import { useEffect, useRef } from 'react';

type Props = {
  /** The exact, final text to display, e.g. "+100K", "+150", "4.9/5". */
  value: string;
  className?: string;
  durationMs?: number;
};

/**
 * Animates the first number inside `value` up to its exact final figure.
 *
 * Accuracy rules:
 *  • The server always renders the real final value (SEO, no-JS, screen readers).
 *  • Animation only runs when the element is first scrolled into view from below
 *    the fold; if it is already visible, the real value is simply shown.
 *  • The animation always ends on the exact original string.
 */
export default function CountUp({ value, className, durationMs = 1400 }: Props) {
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    if (!('IntersectionObserver' in window)) return;

    const match = value.match(/\d+(?:\.\d+)?/);
    if (!match || match.index === undefined) return;

    // If it is already on screen there is nothing to "reveal" — keep it static.
    if (el.getBoundingClientRect().top < window.innerHeight) return;

    const target = Number(match[0]);
    const decimals = match[0].includes('.') ? match[0].split('.')[1].length : 0;
    const prefix = value.slice(0, match.index);
    const suffix = value.slice(match.index + match[0].length);
    const format = (n: number) => `${prefix}${n.toFixed(decimals)}${suffix}`;

    let frame = 0;
    el.textContent = format(0);

    const run = () => {
      const start = performance.now();
      const tick = (now: number) => {
        const t = Math.min(1, (now - start) / durationMs);
        const eased = 1 - Math.pow(1 - t, 3);
        el.textContent = t < 1 ? format(target * eased) : value;
        if (t < 1) frame = window.requestAnimationFrame(tick);
      };
      frame = window.requestAnimationFrame(tick);
    };

    const observer = new IntersectionObserver(
      entries => {
        if (entries.some(entry => entry.isIntersecting)) {
          observer.disconnect();
          run();
        }
      },
      { threshold: 0.6 },
    );
    observer.observe(el);

    return () => {
      observer.disconnect();
      if (frame) window.cancelAnimationFrame(frame);
      el.textContent = value;
    };
  }, [value, durationMs]);

  return (
    <span className={className}>
      <span ref={ref} aria-hidden="true">{value}</span>
      <span className="sr-only">{value}</span>
    </span>
  );
}
