'use client';

import RevealObserver from './RevealObserver';
import PointerEffects from './PointerEffects';
import BackToTop from './BackToTop';

/**
 * The single client entry point for site-wide interaction enhancements.
 * Mounted once in the root layout; every piece is progressive enhancement and
 * renders nothing (or a hidden control) on the server.
 */
export default function MotionLayer() {
  return (
    <>
      <RevealObserver />
      <PointerEffects />
      <BackToTop />
    </>
  );
}
