import { Cairo } from 'next/font/google';

/**
 * Cairo is the platform's existing Arabic typeface. Loading it through
 * next/font self-hosts the files, removes the render-blocking CSS @import,
 * and applies a size-adjusted fallback so text does not shift on swap.
 * Cairo is a variable font, so a single file covers every weight (200–1000).
 */
export const cairo = Cairo({
  subsets: ['arabic', 'latin'],
  display: 'swap',
  variable: '--font-cairo',
});
