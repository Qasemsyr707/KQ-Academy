'use client';

import { useState } from 'react';
import Image from 'next/image';
import { BookOpen } from 'lucide-react';
import styles from './CourseCover.module.css';

/**
 * Courses created without an image store a CSS gradient as their "thumbnail";
 * only real image sources are loaded (a gradient used as a URL returned 404).
 */
export const isImageSource = (value: string | null | undefined): value is string =>
  !!value && /^(https?:\/\/|\/(?!\/)|data:image\/(?:jpeg|png|webp|gif|avif);base64,)/i.test(value);

/** Width/height ratios close enough to 16:9 to fill the frame without losing anything important. */
const FILL_RANGE = { min: 1.55, max: 2.05 };

/**
 * A course cover inside a fixed 16:9 (or any) frame given by the parent.
 * - 16:9-like images fill the frame (object-fit: cover), never stretched;
 * - portrait, square, 4:3 or ultra-wide images are shown whole (contain) over a
 *   blurred copy of themselves, so faces and titles are never cut off;
 * - no image, a CSS gradient, or a failed load: a branded placeholder.
 * The original files are never modified.
 */
export default function CourseCover({ src, alt = '', sizes = '(max-width: 640px) 100vw, 33vw', priority = false, className, iconSize = 40 }: {
  src: string | null | undefined;
  alt?: string;
  sizes?: string;
  priority?: boolean;
  className?: string;
  iconSize?: number;
}) {
  const [failed, setFailed] = useState<string | null>(null);
  const [ratio, setRatio] = useState<{ src: string; value: number } | null>(null);
  const usable = isImageSource(src) && failed !== src;
  const fit = usable && ratio?.src === src && (ratio.value < FILL_RANGE.min || ratio.value > FILL_RANGE.max) ? 'contain' : 'cover';

  if (!usable) {
    return (
      <div className={`${styles.placeholder} ${className ?? ''}`} aria-hidden={alt ? undefined : true} role={alt ? 'img' : undefined} aria-label={alt || undefined}>
        <BookOpen size={iconSize} strokeWidth={1.4} />
      </div>
    );
  }
  return (
    <div className={`${styles.frame} ${className ?? ''}`} data-fit={fit}>
      {fit === 'contain' ? (
        <Image src={src} alt="" fill unoptimized sizes={sizes} className={styles.backdrop} aria-hidden="true" loading={priority ? 'eager' : 'lazy'} />
      ) : null}
      <Image
        src={src}
        alt={alt}
        fill
        unoptimized
        sizes={sizes}
        className={styles.image}
        loading={priority ? 'eager' : 'lazy'}
        fetchPriority={priority ? 'high' : undefined}
        onLoad={event => {
          const img = event.currentTarget;
          if (img.naturalWidth && img.naturalHeight) setRatio({ src, value: img.naturalWidth / img.naturalHeight });
        }}
        onError={() => setFailed(src)}
      />
    </div>
  );
}
