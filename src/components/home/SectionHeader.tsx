import Link from 'next/link';
import type { ReactNode } from 'react';
import { ArrowLeft } from 'lucide-react';
import styles from './Home.module.css';

type Props = {
  id?: string;
  eyebrow?: ReactNode;
  title: ReactNode;
  lead?: ReactNode;
  align?: 'start' | 'center';
  action?: { href: string; label: string };
};

export default function SectionHeader({ id, eyebrow, title, lead, align = 'start', action }: Props) {
  return (
    <div className={`${styles.header} ${align === 'center' ? styles.headerCentered : ''}`} data-reveal="">
      <div className={styles.headerText}>
        {eyebrow ? <span className="eyebrow">{eyebrow}</span> : null}
        <h2 id={id} className={styles.title}>{title}</h2>
        {lead ? <p className={styles.lead}>{lead}</p> : null}
      </div>
      {action ? (
        <Link href={action.href} className={styles.viewAll}>
          {action.label} <ArrowLeft size={18} aria-hidden="true" />
        </Link>
      ) : null}
    </div>
  );
}
