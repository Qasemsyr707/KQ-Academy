import Link from 'next/link';
import Image from 'next/image';
import type { ReactNode } from 'react';
import { Award, BookOpen, Briefcase } from 'lucide-react';
import BrandLogo from '@/components/ui/BrandLogo';
import styles from './Auth.module.css';

type Props = {
  title: ReactNode;
  subtitle?: ReactNode;
  children: ReactNode;
  /** Branded side panel; omit for a centered single-card layout. */
  brand?: { title: ReactNode; text: ReactNode };
};

const benefits = [
  { icon: BookOpen, label: 'المناهج السورية — بكالوريا وتاسع' },
  { icon: Briefcase, label: 'مهارات مهنية مطلوبة في سوق العمل' },
  { icon: Award, label: 'شهادات قابلة للتحقق' },
];

/** Shared presentation for login, registration and password recovery. */
export default function AuthShell({ title, subtitle, children, brand }: Props) {
  return (
    <div className={`${styles.shell} ${brand ? '' : styles.shellCentered}`}>
      <div className={styles.formSide}>
        <div className={styles.panel} data-enter="scale">
          <div className={styles.panelCard}>
            <div className={styles.head}>
              <Link href="/" className={styles.logoLink} aria-label="KQ Academy — الصفحة الرئيسية">
                <BrandLogo size={64} className={styles.logo} priority />
              </Link>
              <h1 className={styles.title}>{title}</h1>
              {subtitle ? <p className={styles.subtitle}>{subtitle}</p> : null}
            </div>
            {children}
          </div>
        </div>
      </div>

      {brand ? (
        <aside className={styles.brandSide}>
          <Image src="/logo.png" alt="" width={360} height={360} className={styles.brandMark} sizes="360px" />
          <div className={styles.brandContent} data-enter="" style={{ '--enter-i': 2 } as React.CSSProperties}>
            <p className={styles.brandTitle}>{brand.title}</p>
            <p className={styles.brandText}>{brand.text}</p>
            <ul className={styles.benefits}>
              {benefits.map(b => (
                <li key={b.label}>
                  <span className={styles.benefitIcon}><b.icon size={18} /></span>
                  {b.label}
                </li>
              ))}
            </ul>
          </div>
        </aside>
      ) : null}
    </div>
  );
}

export { styles as authStyles };
