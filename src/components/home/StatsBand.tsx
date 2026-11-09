import type { CSSProperties } from 'react';
import { BookOpen, Star, Users } from 'lucide-react';
import CountUp from '@/components/motion/CountUp';
import styles from './Home.module.css';

/** The platform's existing headline figures, displayed exactly as provided. */
const stats = [
  { value: '+100K', label: 'طالب مسجل', icon: Users },
  { value: '+150', label: 'كورس ومادة علمية', icon: BookOpen },
  { value: '4.9/5', label: 'تقييم الطلاب', icon: Star },
];

export default function StatsBand() {
  return (
    <section className={styles.stats} aria-label="أرقام المنصة">
      <div className={styles.container}>
        <ul className={styles.statsCard} data-reveal="scale" role="list" style={{ listStyle: 'none' }}>
          {stats.map((stat, i) => (
            <li key={stat.label} className={styles.stat} style={{ '--reveal-i': i } as CSSProperties}>
              <span className={styles.statIcon} aria-hidden="true">
                <stat.icon size={22} />
              </span>
              <div>
                <CountUp value={stat.value} className={`text-gold ${styles.statValue}`} />
                <span className={styles.statLabel}>{stat.label}</span>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
