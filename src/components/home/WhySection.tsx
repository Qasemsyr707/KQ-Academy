import Link from 'next/link';
import type { CSSProperties } from 'react';
import { Award, BookOpen, Briefcase, ShieldCheck, Users } from 'lucide-react';
import SectionHeader from './SectionHeader';
import styles from './Home.module.css';
import { curriculumHidden } from '@/lib/catalogue-visibility';

const curriculumLinks = [
  { label: 'البكالوريا - الفرع العلمي', href: '/curriculum?grade=12-science' },
  { label: 'البكالوريا - الفرع الأدبي', href: '/curriculum?grade=12-literary' },
  { label: 'شهادة التعليم الأساسي (التاسع)', href: '/curriculum?grade=9' },
  { label: 'نماذج امتحانية ومكثفات', href: '/curriculum?type=exams' },
];

const skillLinks = [
  { label: 'البرمجة', href: '/courses?q=%D8%A7%D9%84%D8%A8%D8%B1%D9%85%D8%AC%D8%A9' },
  { label: 'الذكاء الاصطناعي', href: '/courses?q=%D8%A7%D9%84%D8%B0%D9%83%D8%A7%D8%A1%20%D8%A7%D9%84%D8%A7%D8%B5%D8%B7%D9%86%D8%A7%D8%B9%D9%8A' },
  { label: 'التصميم', href: '/courses?q=%D8%A7%D9%84%D8%AA%D8%B5%D9%85%D9%8A%D9%85' },
  { label: 'التسويق وصناعة المحتوى', href: '/courses?q=%D8%A7%D9%84%D8%AA%D8%B3%D9%88%D9%8A%D9%82' },
];

export default function WhySection() {
  // While the school curriculum is hidden, the first card presents the skills catalogue.
  const hidden = curriculumHidden();
  return (
    <section className={`${styles.section} kq-section-light`} aria-labelledby="why-title">
      <div className={styles.container}>
        <SectionHeader
          id="why-title"
          align="center"
          eyebrow="لماذا نحن"
          title={<>لماذا تختار <span className="text-gold">KQ Academy</span>؟</>}
          lead="معرفة ومهارات عملية في تجربة تعلّم واحدة متكاملة."
        />

        <div className={styles.bento}>
          <article className={`${styles.feature} ${styles.featureWide} kq-spotlight`} data-spotlight="" data-reveal="" style={{ '--reveal-i': 0 } as CSSProperties}>
            <span className={styles.featureIcon} aria-hidden="true"><BookOpen size={26} /></span>
            <h3 className={styles.featureTitle}>{hidden ? 'مسارات تعلّم عملية' : 'المناهج الدراسية'}</h3>
            <p className={styles.featureDesc}>{hidden ? 'كورسات منظّمة خطوة بخطوة في مجالات مطلوبة، مع مدربين متخصصين' : 'كورسات البكالوريا والتاسع مع نخبة من المدرسين'}</p>
            <div className={`${styles.featureArt} ${styles.chips}`}>
              {(hidden ? skillLinks : curriculumLinks).map(item => (
                <Link key={item.href} href={item.href} className={styles.chip}>{item.label}</Link>
              ))}
            </div>
          </article>

          <article className={`${styles.feature} kq-spotlight`} data-spotlight="" data-reveal="" style={{ '--reveal-i': 1 } as CSSProperties}>
            <span className={styles.featureIcon} aria-hidden="true"><Briefcase size={26} /></span>
            <h3 className={styles.featureTitle}>مهارات السوق</h3>
            <p className={styles.featureDesc}>تطوير مهني حقيقي مطلوب في سوق العمل</p>
            <div className={`${styles.featureArt} ${styles.skillBars}`} aria-hidden="true">
              <span style={{ height: '38%' }} />
              <span style={{ height: '56%' }} />
              <span style={{ height: '48%' }} />
              <span style={{ height: '74%' }} />
              <span style={{ height: '100%' }} />
            </div>
          </article>

          <article className={`${styles.feature} kq-spotlight`} data-spotlight="" data-reveal="" style={{ '--reveal-i': 2 } as CSSProperties}>
            <span className={styles.featureIcon} aria-hidden="true"><Award size={26} /></span>
            <h3 className={styles.featureTitle}>شهادات إتمام</h3>
            <p className={styles.featureDesc}>شهادة إتمام لكل كورس تُنهيه، قابلة للتحقق برمز خاص</p>
            <Link href="/verify" className={`${styles.featureArt} ${styles.certArt}`}>
              <span className={styles.certSeal} aria-hidden="true"><ShieldCheck size={20} /></span>
              <span className={styles.certLines} aria-hidden="true"><span /><span /><span /></span>
              <span className="sr-only">التحقق من شهادة</span>
            </Link>
          </article>

          <article className={`${styles.feature} ${styles.featureWide} kq-spotlight`} data-spotlight="" data-reveal="" style={{ '--reveal-i': 3 } as CSSProperties}>
            <span className={styles.featureIcon} aria-hidden="true"><Users size={26} /></span>
            <h3 className={styles.featureTitle}>مجتمع تعليمي</h3>
            <p className={styles.featureDesc}>تفاعل مع الطلاب والمدربين في بيئة تعليمية نشطة</p>
            <div className={`${styles.featureArt} ${styles.people}`}>
              <span className={styles.person} aria-hidden="true">س</span>
              <span className={styles.person} aria-hidden="true">أ</span>
              <span className={styles.person} aria-hidden="true">ل</span>
              <span className={styles.person} aria-hidden="true">ع</span>
              <Link href="/community" className={`${styles.chip} ${styles.peopleNote}`}>انضم إلى المجتمع</Link>
            </div>
          </article>
        </div>
      </div>
    </section>
  );
}
