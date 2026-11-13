import Image from 'next/image';

type Props = {
  /** Rendered height in CSS pixels (the logo is square). */
  size?: number;
  className?: string;
  priority?: boolean;
};

/**
 * The official KQ Academy logo, served through the image optimiser so a
 * correctly sized WebP/AVIF is delivered instead of the 1254px source PNG.
 */
export default function BrandLogo({ size = 44, className, priority = false }: Props) {
  return (
    <Image
      src="/logo.png"
      alt="KQ Academy"
      width={size}
      height={size}
      className={className}
      loading={priority ? 'eager' : 'lazy'}
      fetchPriority={priority ? 'high' : undefined}
      sizes={`${size}px`}
      style={{ width: size, height: size, objectFit: 'contain' }}
    />
  );
}
