import { Award, BookOpen } from 'lucide-react';
import { prisma } from '@/lib/db';
import CourseCard from '@/components/ui/CourseCard';
import HomeHero from '@/components/home/HomeHero';
import StatsBand from '@/components/home/StatsBand';
import SectionHeader from '@/components/home/SectionHeader';
import WhySection from '@/components/home/WhySection';
import Testimonials from '@/components/home/Testimonials';
import TrustedBy from '@/components/home/TrustedBy';
import FinalCta from '@/components/home/FinalCta';
import styles from '@/components/home/Home.module.css';
import { formatNumber } from '@/lib/format';

export const dynamic = 'force-dynamic';

async function getCourses() {
  try {
    const courses = await prisma.course.findMany({
      where: { status: 'PUBLISHED' },
      include: { instructor: { select: { name: true } } },
      orderBy: { createdAt: 'desc' },
      take: 8,
    });
    return courses;
  } catch {
    return [];
  }
}

async function getFeaturedCourses() {
  try {
    const courses = await prisma.course.findMany({
      where: { status: 'PUBLISHED', isFeatured: true },
      include: { instructor: { select: { name: true } } },
      orderBy: { createdAt: 'desc' },
      take: 4,
    });
    return courses;
  } catch {
    return [];
  }
}

export default async function HomePage() {
  const courses = await getCourses();
  const featuredCourses = await getFeaturedCourses();

  // The hero visual previews a real course when one is available.
  const spotlight = featuredCourses[0] ?? courses[0] ?? null;
  const heroCourse = spotlight
    ? {
        title: spotlight.title,
        thumbnail: spotlight.thumbnail,
        instructorName: spotlight.instructor?.name ?? null,
        category: spotlight.category,
      }
    : null;

  return (
    <div className={styles.page}>
      <HomeHero course={heroCourse} />

      <StatsBand />

      {/* Featured Courses */}
      {featuredCourses.length > 0 && (
        <section className={`${styles.section} kq-section-light`} aria-labelledby="featured-title">
          <div className={styles.container}>
            <SectionHeader
              id="featured-title"
              eyebrow={<><Award size={14} aria-hidden="true" /> مختارات KQ</>}
              title="دورات مميزة ننصح بها"
              lead="الكورسات الأقوى والأكثر طلباً لتحقيق أفضل النتائج"
            />
            <div className={styles.gridFeatured}>
              {featuredCourses.map((course, index) => (
                <CourseCard
                  key={course.id}
                  href={`/courses/${course.id}`}
                  variant="featured"
                  index={index}
                  title={course.title}
                  category={course.category}
                  description={course.description || 'دورة احترافية شاملة تأخذك خطوة بخطوة.'}
                  thumbnail={course.thumbnail}
                  instructorName={course.instructor?.name}
                  price={`$${formatNumber(course.price)}`}
                />
              ))}
            </div>
          </div>
        </section>
      )}

      <div className={styles.seam} aria-hidden="true" />

      {/* Latest Courses */}
      <section className={`${styles.section} kq-section-light`} aria-labelledby="latest-title">
        <div className={styles.container}>
          <SectionHeader
            id="latest-title"
            eyebrow={<><BookOpen size={14} aria-hidden="true" /> جديد المنصة</>}
            title="أحدث الكورسات"
            lead="المناهج السورية والمهارات المهنية في مكان واحد"
            action={{ href: '/courses', label: 'عرض الكل' }}
          />

          {courses.length === 0 ? (
            <div className={styles.empty} data-reveal="">
              <BookOpen size={48} aria-hidden="true" />
              <p className={styles.emptyTitle}>قريباً جداً...</p>
              <p>يتم الآن تجهيز المحتوى التعليمي المميز</p>
            </div>
          ) : (
            <div className={styles.grid}>
              {courses.map((course, index) => (
                <CourseCard
                  key={course.id}
                  href={`/courses/${course.id}`}
                  index={index % 4}
                  title={course.title}
                  category={course.category}
                  thumbnail={course.thumbnail}
                  instructorName={course.instructor?.name || 'المدرب'}
                  price={course.price > 0 ? `$${course.price}` : <span className={styles.free}>مجاني</span>}
                />
              ))}
            </div>
          )}
        </div>
      </section>

      <div className={styles.seam} aria-hidden="true" />

      <WhySection />

      <Testimonials />

      <TrustedBy />

      <FinalCta />
    </div>
  );
}
