import type { CSSProperties } from 'react';
import SectionHeader from './SectionHeader';
import styles from './Home.module.css';

/** Existing testimonials from the platform, unchanged. */
const testimonials = [
  {
    text: 'عنجد الكورس كان نقطة تحول بحياتي.. الشرح مو طبيعي قديش سلس وبيدخل العقل بسرعة! حسيت حالي عم اتعلم من حدا بيعرفني من زمان وبيعرف شو اللي بيوقفني. يعطيكون ألف عافية!',
    name: 'سارة الخطيب',
    role: 'طالبة بكالوريا علمي',
  },
  {
    text: 'الأساتذة بيشرحوا من قلب ورب، ما بيبخلوا علينا بولا معلومة. الكورسات المهنية فادتني كتير وخلتني ألاقي أول شغل إلي كمبرمج. منصة بترفع الراس والله!',
    name: 'أحمد شحادة',
    role: 'مطور ويب',
  },
  {
    text: 'أحلى شي بالمنصة هي المرونة، بحضر الدروس بالوقت اللي بيناسبني والجودة ممتازة. فكرة إنو كل شي مترتب وبمكان واحد وفرت عليي كتير وقت وضياع.',
    name: 'لينا الحمصي',
    role: 'طالبة جامعية',
  },
  {
    text: 'ولا أروع من هيك! الأساتذة متابعين معنا خطوة بخطوة، والمنصة سهلة وحلوة كتير.. صرت أنصح كل رفقاتي يسجلوا فيها لأنو صدقاً بتستاهل.',
    name: 'عمر النجار',
    role: 'مسوق رقمي',
  },
];

function QuoteMark() {
  return (
    <svg className={styles.quoteMark} viewBox="0 0 48 36" width="44" height="34" aria-hidden="true" focusable="false">
      <path
        fill="currentColor"
        d="M48 0v14.6c0 12-6.4 19.4-19.2 21.4l-1.9-4.4c5.8-1.6 8.9-5 9.3-10.1H27V0h21ZM21 0v14.6C21 26.6 14.6 34 1.8 36L0 31.6c5.7-1.6 8.8-5 9.2-10.1H0V0h21Z"
      />
    </svg>
  );
}

export default function Testimonials() {
  return (
    <section className={`${styles.section} kq-section-light`} aria-labelledby="testimonials-title">
      <div className={styles.container}>
        <SectionHeader
          id="testimonials-title"
          align="center"
          eyebrow="قصص طلابنا"
          title="انضم إلى الآخرين الذين يغيرون حياتهم من خلال التعلّم"
        />
        <ul className={styles.testimonials} role="list" style={{ listStyle: 'none' }}>
          {testimonials.map((t, i) => (
            <li key={t.name} data-reveal="" style={{ '--reveal-i': i } as CSSProperties}>
              <figure className={styles.quote}>
                <QuoteMark />
                <blockquote className={styles.quoteText}>
                  <p>{t.text}</p>
                </blockquote>
                <figcaption className={styles.quoteAuthor}>
                  <span className={styles.monogram} aria-hidden="true">{t.name.charAt(0)}</span>
                  <span>
                    <cite className={styles.authorName}>{t.name}</cite>
                    <span className={styles.authorRole}>{t.role}</span>
                  </span>
                </figcaption>
              </figure>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
