/**
 * Centralised motion presets.
 *
 * CSS owns most motion (see the "MOTION SYSTEM" section of globals.css). These
 * values mirror the CSS tokens so the few framer-motion surfaces that already
 * exist in client components (filters drawer, accordions, modals) share the
 * same timing language instead of ad-hoc numbers.
 */
import type { Transition, Variants } from 'framer-motion';

export const EASE_OUT = [0.22, 1, 0.36, 1] as const;
export const EASE_IN_OUT = [0.65, 0, 0.35, 1] as const;

export const DURATION = {
  fast: 0.14,
  base: 0.22,
  slow: 0.36,
  reveal: 0.64,
} as const;

export const STAGGER = 0.07;

export const transitions = {
  base: { duration: DURATION.base, ease: EASE_OUT } satisfies Transition,
  slow: { duration: DURATION.slow, ease: EASE_OUT } satisfies Transition,
  reveal: { duration: DURATION.reveal, ease: EASE_OUT } satisfies Transition,
  drawer: { type: 'tween', duration: DURATION.slow, ease: EASE_OUT } satisfies Transition,
} as const;

/** Fade + lift used for cards and list items. */
export const fadeUp: Variants = {
  hidden: { opacity: 0, y: 16 },
  visible: (index: number = 0) => ({
    opacity: 1,
    y: 0,
    transition: { ...transitions.reveal, delay: Math.min(index, 8) * STAGGER },
  }),
  exit: { opacity: 0, scale: 0.98, transition: transitions.base },
};

/** Height-auto accordion panel. */
export const collapse: Variants = {
  collapsed: { height: 0, opacity: 0, transition: transitions.base },
  open: { height: 'auto', opacity: 1, transition: transitions.slow },
};

/** Dialog / modal surface. */
export const modal: Variants = {
  hidden: { opacity: 0, y: 12, scale: 0.98 },
  visible: { opacity: 1, y: 0, scale: 1, transition: transitions.slow },
  exit: { opacity: 0, y: 8, scale: 0.98, transition: transitions.base },
};

export const backdrop: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: transitions.base },
  exit: { opacity: 0, transition: transitions.base },
};

/** Inline toast / alert. */
export const toast: Variants = {
  hidden: { opacity: 0, y: -8 },
  visible: { opacity: 1, y: 0, transition: transitions.base },
  exit: { opacity: 0, y: -6, transition: transitions.base },
};

/**
 * Off-canvas panel that enters from the inline-start edge. In RTL the start
 * edge is the right side, so a positive x offset is "off screen".
 */
export const drawerFromStart: Variants = {
  hidden: { x: '100%' },
  visible: { x: 0, transition: transitions.drawer },
  exit: { x: '100%', transition: transitions.base },
};
