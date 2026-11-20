import Link from 'next/link';
import Image from 'next/image';
import type { CSSProperties } from 'react';
import { ArrowLeft, BookOpen, CheckCircle2, GraduationCap, Lock, Play, PlayCircle, Search, ShieldCheck, Sparkles, Zap } from 'lucide-react';
import styles from './Home.module.css';

export type HeroCourse = {
  title: string;
  thumbnail: string | null;
  instructorName: string | null;
  category: string | null;
} | null;

// Fields that exist in the published catalogue (each link runs a real search).
const quickSearches = [
  { label: 'البرمجة', href: '/courses?q=%D8%A7%D9%84%D8%A8%D8%B1%D9%85%D8%AC%D8%A9' },
  { label: 'الذكاء الاصطناعي', href: '/courses?q=%D8%A7%D9%84%D8%B0%D9%83%D8%A7%D8%A1%20%D8%A7%D9%84%D8%A7%D8%B5%D8%B7%D9%86%D8%A7%D8%B9%D9%8A' },
  { label: 'التصميم', href: '/courses?q=%D8%A7%D9%84%D8%AA%D8%B5%D9%85%D9%8A%D9%85' },
  { label: 'صناعة المحتوى', href: '/courses?q=%D8%B5%D9%86%D8%A7%D8%B9%D8%A9%20%D8%A7%D9%84%D9%85%D8%AD%D8%AA%D9%88%D9%89' },
];

const enter = (i: number) => ({ '--enter-i': i }) as CSSProperties;

export default function HomeHero({ course }: { course: HeroCourse }) {
  return (
    <section className={styles.hero} aria-labelledby="home-hero-title">
      <div className={styles.heroBg} aria-hidden="true">
        <div className={`${styles.orb} ${styles.orbA}`} />
        <div className={`${styles.orb} ${styles.orbB}`} />
      </div>

      <div className={styles.container}>
        <div className={styles.heroGrid}>
          {/* ----- Copy ----- */}
          <div className={styles.heroCopy}>
            <span className="eyebrow" data-enter="" style={enter(0)}>
              <Zap size={14} aria-hidden="true" /> تجربة تعليمية تصنع الفارق
            </span>

            <h1 id="home-hero-title" className={styles.heroTitle} data-enter="" style={enter(1)}>
              <bdi className={styles.heroBrand}>KQ Academy</bdi>
              <span className={`text-gold ${styles.heroTitleGold}`}>تعلّم بذكاء. تقدّم بثقة.</span>
            </h1>

            <p className={styles.heroLead} data-enter="" style={enter(2)}>
              تجربة تعليمية متكاملة تجمع المعرفة والمهارات العملية في مكان واحد. تعلّم البرمجة والذكاء الاصطناعي وصناعة المحتوى وغيرها من المهارات التي تساعدك على تطوير قدراتك، بخطوات واضحة وفي الوقت الذي يناسبك.
            </p>

            <form action="/courses" method="GET" role="search" className={styles.search} data-enter="" style={enter(3)}>
              <span className={styles.searchIcon} aria-hidden="true">
                <Search size={22} />
              </span>
              <label htmlFor="home-search" className="sr-only">ابحث عن كورس، مدرب، أو مهارة</label>
              <input
                id="home-search"
                name="q"
                type="search"
                placeholder="ابحث عن كورس، مدرب، أو مهارة..."
                className={styles.searchInput}
                autoComplete="off"
                enterKeyHint="search"
              />
              <button type="submit" className={styles.searchButton}>بحث</button>
            </form>

            <div className={styles.quick} data-enter="fade" style={enter(4)}>
              <span>تصفّح حسب المجال:</span>
              {quickSearches.map(item => (
                <Link key={item.href} href={item.href} className={styles.quickLink}>{item.label}</Link>
              ))}
            </div>

            <div className={styles.ctas} data-enter="" style={enter(5)}>
              <Link href="/courses" className="btn btn-solid btn-lg">
                <BookOpen size={20} aria-hidden="true" /> استكشف الكورسات
              </Link>
              <Link href="/about" className="btn btn-outline btn-lg">
                اكتشف المنصة <ArrowLeft size={18} aria-hidden="true" />
              </Link>
            </div>
          </div>

          {/* ----- Visual: a layered representation of the learning experience ----- */}
          <div className={styles.visual} aria-hidden="true" data-enter="scale" style={enter(3)}>
            <div className={styles.ring} />

            <div className={styles.window} data-tilt="">
              <div className={styles.windowBar}>
                <span className={styles.dots}><span /><span /><span /></span>
                <span className={styles.url}>kqacademy.com</span>
                <Sparkles size={14} color="var(--gold-300)" />
              </div>

              <div className={styles.player}>
                {course?.thumbnail ? (
                  <Image
                    src={course.thumbnail}
                    alt=""
                    fill
                    unoptimized
                    sizes="(max-width: 960px) 90vw, 520px"
                    className={styles.playerImage}
                    loading="eager"
                  />
                ) : null}
                <div className={styles.playerShade} />
                <span className={styles.play}><Play size={26} fill="currentColor" /></span>
                <div className={styles.timeline}><span /></div>
              </div>

              <div className={styles.windowBody}>
                <div className={styles.courseMeta}>
                  {course?.category ? <span className="kq-badge kq-badge--gold" style={{ width: 'fit-content' }}>{course.category}</span> : null}
                  <span className={styles.courseTitle}>{course?.title || 'تجربة تعلّم متكاملة بين يديك'}</span>
                  <span className={styles.courseBy}>{course?.instructorName ? `مع ${course.instructorName}` : 'دروس مسجّلة · بث مباشر · اختبارات'}</span>
                </div>
                <ul className={styles.lessons}>
                  <li className={styles.lesson}>
                    <CheckCircle2 size={16} color="var(--success)" />
                    <span className={styles.lessonLine} style={{ maxWidth: '72%' }} />
                  </li>
                  <li className={`${styles.lesson} ${styles.lessonActive}`}>
                    <PlayCircle size={16} />
                    <span className={styles.lessonLine} style={{ maxWidth: '58%' }} />
                  </li>
                  <li className={styles.lesson}>
                    <Lock size={15} />
                    <span className={styles.lessonLine} style={{ maxWidth: '64%' }} />
                  </li>
                </ul>
              </div>
            </div>

            <div className={`${styles.float} ${styles.floatCert}`}>
              <span className={styles.floatIcon}><ShieldCheck size={18} /></span>
              <span>
                <span className={styles.floatTitle}>شهادة موثّقة</span>
                <span className={styles.floatText}>قابلة للتحقق برقم فريد</span>
              </span>
            </div>

            <div className={`${styles.float} ${styles.floatLive}`}>
              <span className={styles.liveDot} />
              <span>
                <span className={styles.floatTitle}>بث مباشر</span>
                <span className={styles.floatText}>حصص تفاعلية مع المدرّبين</span>
              </span>
            </div>

            <div className={`${styles.float} ${styles.floatCurriculum}`}>
              <span className={styles.floatIcon}><GraduationCap size={18} /></span>
              <span>
                <span className={styles.floatTitle}>مهارات عملية</span>
                <span className={styles.floatText}>برمجة · تصميم · تسويق</span>
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
