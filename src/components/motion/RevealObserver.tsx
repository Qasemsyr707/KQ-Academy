'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';

const SELECTOR = '[data-reveal]:not([data-reveal-state])';
const SETTLE_MS = 1400;

/**
 * Progressive scroll reveal.
 *
 * Server HTML is always fully visible. After hydration this marks only the
 * elements that are still below the fold as "hidden", then reveals each one
 * once as it scrolls into view. Elements already on screen are never hidden,
 * so there is no flash and nothing depends on JavaScript to be readable.
 */
export default function RevealObserver() {
  const pathname = usePathname();

  useEffect(() => {
    if (typeof window === 'undefined' || !('IntersectionObserver' in window)) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const timers = new Set<number>();
    let frame = 0;

    const settle = (el: Element) => {
      const id = window.setTimeout(() => {
        timers.delete(id);
        el.setAttribute('data-reveal-state', 'done');
      }, SETTLE_MS);
      timers.add(id);
    };

    const observer = new IntersectionObserver(
      entries => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          const el = entry.target;
          observer.unobserve(el);
          el.setAttribute('data-reveal-state', 'shown');
          settle(el);
        }
      },
      { rootMargin: '0px 0px -8% 0px', threshold: 0 },
    );

    const scan = () => {
      frame = 0;
      const fold = window.innerHeight * 0.94;
      document.querySelectorAll(SELECTOR).forEach(el => {
        const rect = el.getBoundingClientRect();
        // Already visible (or scrolled past): leave in its final state.
        if (rect.top < fold) {
          el.setAttribute('data-reveal-state', 'done');
          return;
        }
        el.setAttribute('data-reveal-state', 'hidden');
        observer.observe(el);
      });
    };

    scan();

    // Client components can add revealable content later (filters, pagination).
    const mutations = new MutationObserver(() => {
      if (!frame) frame = window.requestAnimationFrame(scan);
    });
    const root = document.getElementById('main-content') ?? document.body;
    mutations.observe(root, { childList: true, subtree: true });

    return () => {
      mutations.disconnect();
      observer.disconnect();
      if (frame) window.cancelAnimationFrame(frame);
      timers.forEach(id => window.clearTimeout(id));
      // Anything still waiting must not stay invisible after this effect ends.
      document.querySelectorAll('[data-reveal-state="hidden"], [data-reveal-state="shown"]').forEach(el => {
        el.removeAttribute('data-reveal-state');
      });
    };
  }, [pathname]);

  return null;
}
