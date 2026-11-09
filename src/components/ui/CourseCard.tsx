import Link from 'next/link';
import Image from 'next/image';
import type { CSSProperties, ReactNode } from 'react';
import { ArrowLeft, Award, BookOpen, Star, User } from 'lucide-react';
import styles from './CourseCard.module.css';

export type CourseCardProps = {
  href: string;
  title: string;
  category?: string | null;
  description?: string | null;
  thumbnail?: string | null;
  instructorName?: string | null;
  instructorImage?: string | null;
  /** Pre-formatted price exactly as each page already presents it. */
  price?: ReactNode;
  /** Only shown when a real rating exists (> 0). */
  rating?: number | null;
  variant?: 'default' | 'featured';
  featuredLabel?: string;
  /** Eagerly load the image (use for the first visible row only). */
  priority?: boolean;
  ctaLabel?: string;
  /** Position in a grid — drives the reveal stagger. */
  index?: number;
  reveal?: boolean;
  prefetch?: boolean;
};

/**
 * Shared course card. Contains no hooks, so it renders on the server for the
 * homepage and inside client components such as the catalogue.
 */
export default function CourseCard({
  href,
  title,
  category,
  description,
  thumbnail,
  instructorName,
  instructorImage,
  price,
  rating,
  variant = 'default',
  featuredLabel = 'الخيار الأفضل',
  priority = false,
  ctaLabel = 'التفاصيل',
  index = 0,
  reveal = true,
  prefetch,
}: CourseCardProps) {
  const featured = variant === 'featured';
  const showRating = typeof rating === 'number' && rating > 0;

  return (
    <div
      className={styles.cell}
      data-reveal={reveal ? 'scale' : undefined}
      style={{ '--reveal-i': index } as CSSProperties}
    >
    <article
      className={`${styles.card} ${featured ? styles.featured : ''}`}
      data-spotlight=""
      data-tilt={featured ? '' : undefined}
    >
      <Link href={href} className={styles.link} prefetch={prefetch}>
        <div className={styles.media}>
          {thumbnail ? (
            // Thumbnails come from several origins (uploads, CDN, legacy data URLs),
            // so they are served as-is inside a fixed aspect-ratio box (no layout shift).
            <Image
              src={thumbnail}
              alt=""
              fill
              unoptimized
              sizes="(max-width: 640px) 100vw, (max-width: 1100px) 50vw, 25vw"
              className={styles.image}
              loading={priority ? 'eager' : 'lazy'}
              fetchPriority={priority ? 'high' : undefined}
            />
          ) : (
            <div className={styles.placeholder} aria-hidden="true">
              <BookOpen size={40} strokeWidth={1.4} />
            </div>
          )}
          <div className={styles.mediaShade} aria-hidden="true" />
          {category ? <span className={`kq-badge ${styles.category}`}>{category}</span> : null}
          {featured ? (
            <span className={styles.featuredBadge}>
              <Award size={14} aria-hidden="true" /> {featuredLabel}
            </span>
          ) : null}
        </div>

        <div className={styles.body}>
          <h3 className={styles.title}>{title}</h3>

          {description ? <p className={styles.description}>{description}</p> : null}

          <div className={styles.meta}>
            <span className={styles.instructor}>
              <span className={styles.avatar} aria-hidden="true">
                {instructorImage ? (
                  <Image src={instructorImage} alt="" width={28} height={28} unoptimized loading="lazy" />
                ) : (
                  <User size={14} />
                )}
              </span>
              <span className={styles.instructorName}>{instructorName || 'المدرب'}</span>
            </span>
            {showRating ? (
              <span className={styles.rating}>
                <Star size={13} fill="currentColor" aria-hidden="true" />
                <span className="num" aria-hidden="true">{rating!.toFixed(1)}</span>
                <span className="sr-only">التقييم {rating!.toFixed(1)} من 5</span>
              </span>
            ) : null}
          </div>

          <div className={styles.footer}>
            <span className={styles.price}>{price}</span>
            <span className={styles.cta}>
              {ctaLabel}
              <ArrowLeft size={16} aria-hidden="true" />
            </span>
          </div>
        </div>
      </Link>
    </article>
    </div>
  );
}
