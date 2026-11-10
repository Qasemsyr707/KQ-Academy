import Link from 'next/link';
import { ArrowLeft, BookOpen } from 'lucide-react';
import styles from './Home.module.css';

export default function FinalCta() {
  return (
    <section className={styles.sectionTight} aria-labelledby="final-cta-title">
      <div className={styles.container}>
        <div className={`${styles.cta} kq-spotlight`} data-spotlight="" data-reveal="scale">
          <div className={styles.ctaInner}>
            <span className="eyebrow">ابدأ اليوم</span>
            <h2 id="final-cta-title" className={styles.ctaTitle}>
              خطوتك القادمة نحو <span className="text-gold">التميّز</span> تبدأ من هنا
            </h2>
            <p className={styles.ctaText}>
              المناهج السورية والمهارات المهنية في مكان واحد — أنشئ حسابك وابدأ التعلّم بالسرعة التي تناسبك.
            </p>
            <div className={styles.ctaActions}>
              <Link href="/register" className="btn btn-solid btn-lg">
                ابدأ مجاناً الآن <ArrowLeft size={18} aria-hidden="true" />
              </Link>
              <Link href="/courses" className="btn btn-outline btn-lg">
                <BookOpen size={19} aria-hidden="true" /> تصفح كل الكورسات
              </Link>
            </div>
            <p className={styles.ctaNote}>
              هل أنت مدرّس؟ <Link href="/teach">انضم كمدرب</Link>
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
