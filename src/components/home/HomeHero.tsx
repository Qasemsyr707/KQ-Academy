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

const quickSearches = [
  { label: 'بكالوريا علمي', href: '/curriculum?grade=12-science' },
  { label: 'التاسع', href: '/curriculum?grade=9' },
  { label: 'البرمجة', href: '/courses?q=programming' },
  { label: 'اللغة الإنجليزية', href: '/courses?q=english' },
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
              <Zap size={14} aria-hidden="true" /> المنصة التعليمية الأولى في سوريا
            </span>

            <h1 id="home-hero-title" className={styles.heroTitle} data-enter="" style={enter(1)}>
              أكاديمية <bdi>KQ</bdi>..{' '}
              <span className={`text-gold ${styles.heroTitleGold}`}>بوابتك نحو التميز!</span>
            </h1>

            <p className={styles.heroLead} data-enter="" style={enter(2)}>
              نجمع بين قوة المناهج المدرسية (بكالوريا وتاسع) وأحدث المهارات المطلوبة في سوق العمل لضمان تفوقك الأكاديمي والمهني المستمر.
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
              <span>الأكثر طلباً:</span>
              {quickSearches.map(item => (
                <Link key={item.href} href={item.href} className={styles.quickLink}>{item.label}</Link>
              ))}
            </div>

            <div className={styles.ctas} data-enter="" style={enter(5)}>
              <Link href="/courses" className="btn btn-solid btn-lg">
                <BookOpen size={20} aria-hidden="true" /> تصفح كل الكورسات
              </Link>
              <Link href="/register" className="btn btn-outline btn-lg">
                ابدأ مجاناً الآن <ArrowLeft size={18} aria-hidden="true" />
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
                <span className={styles.floatTitle}>المناهج السورية</span>
                <span className={styles.floatText}>بكالوريا · تاسع</span>
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
