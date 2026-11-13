'use client';

import { useState, useEffect, type ReactNode } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Filter, BookOpen, Star, User, X, SlidersHorizontal, ArrowUpDown, Tag } from 'lucide-react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import CourseCard from '@/components/ui/CourseCard';
import { backdrop, drawerFromStart, fadeUp } from '@/lib/motion';
import styles from './Courses.module.css';
import { formatNumber } from '@/lib/format';

type CatalogCourse = {
  id: string;
  title: string;
  description?: string | null;
  category?: string | null;
  thumbnail?: string | null;
  priceSYP: number;
  rating: number;
  instructor: { name: string | null; image?: string | null };
};

type Props = {
  initialCourses: CatalogCourse[];
  featuredCourses?: CatalogCourse[];
  categories?: string[];
  instructors?: string[];
  /** Optional page heading overrides (used by /curriculum). */
  eyebrow?: ReactNode;
  heading?: ReactNode;
  description?: ReactNode;
};

export default function CoursesClient({
  initialCourses,
  featuredCourses = [],
  categories = [],
  instructors = [],
  eyebrow = 'اكتشف كورسك القادم',
  heading = <>البحث <span className="text-gold">المتقدم</span></>,
  description,
}: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [courses, setCourses] = useState(initialCourses);
  const [loading, setLoading] = useState(false);
  const [isMobileFiltersOpen, setIsMobileFiltersOpen] = useState(false);

  // Filters State
  const [q, setQ] = useState(searchParams.get('q') || '');
  const [category, setCategory] = useState(searchParams.get('category') || 'الكل');
  const [type, setType] = useState(searchParams.get('type') || 'الكل');
  const [price, setPrice] = useState(searchParams.get('price') || 'الكل');
  const [rating, setRating] = useState(searchParams.get('rating') || 'الكل');
  const [instructor, setInstructor] = useState(searchParams.get('instructor') || 'الكل');
  const [sort, setSort] = useState(searchParams.get('sort') || 'newest');

  // Trigger search when filters change (400ms debounce)
  useEffect(() => {
    const fetchCourses = async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        if (q) params.set('q', q);
        if (category && category !== 'الكل') params.set('category', category);
        if (type && type !== 'الكل') params.set('type', type);
        if (price && price !== 'الكل') params.set('price', price);
        if (rating && rating !== 'الكل') params.set('rating', rating);
        if (instructor && instructor !== 'الكل') params.set('instructor', instructor);
        if (sort && sort !== 'newest') params.set('sort', sort);

        router.replace(`${pathname}?${params.toString()}`, { scroll: false });

        const res = await fetch(`/api/courses/search?${params.toString()}`);
        if (res.ok) {
          const data = await res.json();
          setCourses(data.courses);
        }
      } catch (error) {
        console.error('Failed to fetch courses:', error);
      }
      setLoading(false);
    };

    const delayDebounceFn = setTimeout(() => {
      fetchCourses();
    }, 400);
    return () => clearTimeout(delayDebounceFn);
  }, [q, category, type, price, rating, instructor, sort, router, pathname]);

  // Escape closes the mobile filters; page scroll is locked while open.
  useEffect(() => {
    if (!isMobileFiltersOpen) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsMobileFiltersOpen(false);
    };
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = previousOverflow;
    };
  }, [isMobileFiltersOpen]);

  const clearFilters = () => {
    setQ('');
    setCategory('الكل');
    setType('الكل');
    setPrice('الكل');
    setRating('الكل');
    setInstructor('الكل');
    setSort('newest');
  };

  const renderFilters = (idPrefix: string) => (
    <div className={styles.filters}>
      <div className={styles.filterGroup}>
        <label className={styles.filterLabel} htmlFor={`${idPrefix}-category`}>
          <BookOpen size={18} aria-hidden="true" /> القسم
        </label>
        <select id={`${idPrefix}-category`} value={category} onChange={e => setCategory(e.target.value)} className="input-field" style={{ cursor: 'pointer' }}>
          <option value="الكل">جميع الأقسام</option>
          {categories.map((c, i) => <option key={i} value={c}>{c}</option>)}
        </select>
      </div>

      <div className={styles.filterGroup}>
        <label className={styles.filterLabel} htmlFor={`${idPrefix}-instructor`}>
          <User size={18} aria-hidden="true" /> المدرب
        </label>
        <select id={`${idPrefix}-instructor`} value={instructor} onChange={e => setInstructor(e.target.value)} className="input-field" style={{ cursor: 'pointer' }}>
          <option value="الكل">جميع المدربين</option>
          {instructors.map((ins, i) => <option key={i} value={ins}>{ins}</option>)}
        </select>
      </div>

      <fieldset className={styles.filterGroup}>
        <legend className={styles.filterLabel} style={{ marginBottom: '0.75rem' }}>
          <Filter size={18} aria-hidden="true" /> نوع الكورس
        </legend>
        <div className={styles.pills}>
          {['الكل', 'SKILL', 'CURRICULUM'].map(t => (
            <label key={t} className={styles.pill} data-checked={type === t ? 'true' : undefined}>
              <input type="radio" name={`${idPrefix}-type`} checked={type === t} onChange={() => setType(t)} />
              {t === 'الكل' ? 'الجميع' : t === 'SKILL' ? 'كورس مهاري عام' : 'منهاج دراسي'}
            </label>
          ))}
        </div>
      </fieldset>

      <fieldset className={styles.filterGroup}>
        <legend className={styles.filterLabel} style={{ marginBottom: '0.75rem' }}>
          <Tag size={18} aria-hidden="true" /> التسعير
        </legend>
        <div className={styles.pills}>
          {['الكل', 'free', 'paid'].map(p => (
            <label key={p} className={styles.pill} data-checked={price === p ? 'true' : undefined}>
              <input type="radio" name={`${idPrefix}-price`} checked={price === p} onChange={() => setPrice(p)} />
              {p === 'الكل' ? 'الجميع' : p === 'free' ? 'مجاني' : 'مدفوع'}
            </label>
          ))}
        </div>
      </fieldset>

      <fieldset className={styles.filterGroup}>
        <legend className={styles.filterLabel} style={{ marginBottom: '0.75rem' }}>
          <Star size={18} aria-hidden="true" /> التقييم
        </legend>
        <div className={styles.pills}>
          {['الكل', '4.5', '4.0', '3.5'].map(r => (
            <label key={r} className={styles.pill} data-checked={rating === r ? 'true' : undefined}>
              <input type="radio" name={`${idPrefix}-rating`} checked={rating === r} onChange={() => setRating(r)} />
              {r === 'الكل' ? 'أي تقييم' : <><Star size={13} fill="currentColor" aria-hidden="true" /> {r} فما فوق</>}
            </label>
          ))}
        </div>
      </fieldset>

      <button type="button" onClick={clearFilters} className={`btn ${styles.clear}`}>
        مسح جميع الفلاتر
      </button>
    </div>
  );

  const showFeatured = featuredCourses.length > 0 && !q && category === 'الكل' && type === 'الكل';

  return (
    <div className={styles.page}>
      {/* Search Header */}
      <header className={styles.hero}>
        <span className="eyebrow" data-enter="" style={{ '--enter-i': 0 } as React.CSSProperties}>
          <Search size={14} aria-hidden="true" /> {eyebrow}
        </span>
        <h1 className={styles.heroTitle} data-enter="" style={{ '--enter-i': 1 } as React.CSSProperties}>
          {heading}
        </h1>
        {description ? (
          <p className={styles.heroText} data-enter="" style={{ '--enter-i': 2 } as React.CSSProperties}>{description}</p>
        ) : null}
        <div className={styles.search} role="search" data-enter="" style={{ '--enter-i': 2 } as React.CSSProperties}>
          <span className={styles.searchIcon} aria-hidden="true">
            <Search size={22} />
          </span>
          <label htmlFor="catalog-search" className="sr-only">ابحث عن كورس، مدرب، أو مهارة</label>
          <input
            id="catalog-search"
            type="search"
            placeholder="ابحث عن كورس، مدرب، أو مهارة..."
            value={q}
            onChange={e => setQ(e.target.value)}
            className={styles.searchInput}
            autoComplete="off"
            enterKeyHint="search"
          />
          {q ? (
            <button type="button" className={styles.clearSearch} onClick={() => setQ('')} aria-label="مسح البحث">
              <X size={18} aria-hidden="true" />
            </button>
          ) : null}
        </div>
      </header>

      {/* Featured Courses Section */}
      {showFeatured && (
        <section className={`${styles.container} ${styles.featured} kq-section-light`} aria-labelledby="catalog-featured-title">
          <h2 id="catalog-featured-title" className={styles.sectionTitle}>
            <span className={styles.sectionIcon} aria-hidden="true"><Star size={22} fill="currentColor" /></span>
            دورات مميزة ننصح بها
          </h2>
          <div className={styles.featuredGrid}>
            {featuredCourses.map((course, index) => (
              <CourseCard
                key={course.id}
                href={`/courses/${course.id}`}
                variant="featured"
                featuredLabel="موصى به"
                index={index}
                priority={index < 2}
                title={course.title}
                category={course.category}
                description={course.description || 'دورة احترافية شاملة تأخذك خطوة بخطوة.'}
                thumbnail={course.thumbnail}
                instructorName={course.instructor?.name}
                instructorImage={course.instructor?.image}
                rating={course.rating}
                price={course.priceSYP > 0 ? `${formatNumber(course.priceSYP)} ل.س` : null}
              />
            ))}
          </div>
        </section>
      )}

      <div className={`${styles.container} ${styles.layout} kq-section-light`}>
        {/* Desktop Sidebar */}
        <aside className={styles.sidebar} aria-label="فلاتر البحث">
          {renderFilters('desktop')}
        </aside>

        {/* Mobile Filters Drawer */}
        <AnimatePresence>
          {isMobileFiltersOpen && (
            <div className={styles.drawerRoot} role="dialog" aria-modal="true" aria-labelledby="mobile-filters-title">
              <motion.div
                className={styles.drawerBackdrop}
                variants={backdrop}
                initial="hidden"
                animate="visible"
                exit="exit"
                onClick={() => setIsMobileFiltersOpen(false)}
              />
              <motion.div className={styles.drawer} variants={drawerFromStart} initial="hidden" animate="visible" exit="exit">
                <div className={styles.drawerHeader}>
                  <h2 id="mobile-filters-title" className={styles.drawerTitle}>الفلاتر المتقدمة</h2>
                  <button type="button" onClick={() => setIsMobileFiltersOpen(false)} className={styles.iconButton} aria-label="إغلاق الفلاتر" autoFocus>
                    <X size={22} aria-hidden="true" />
                  </button>
                </div>
                {renderFilters('mobile')}
                <button type="button" className={`btn btn-solid ${styles.drawerApply}`} onClick={() => setIsMobileFiltersOpen(false)}>
                  عرض النتائج ({courses.length})
                </button>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Main Content Area */}
        <div className={styles.main}>
          {/* Top Bar: Results count & Sort */}
          <div className={styles.toolbar}>
            <div className={styles.toolbarStart}>
              <button
                type="button"
                className={`btn btn-outline btn-sm ${styles.filterToggle}`}
                onClick={() => setIsMobileFiltersOpen(true)}
                aria-expanded={isMobileFiltersOpen}
              >
                <SlidersHorizontal size={17} aria-hidden="true" /> الفلاتر
              </button>
              <h2 className={styles.count} aria-live="polite">
                {loading ? (
                  <><span className="loader" style={{ width: 16, height: 16 }} aria-hidden="true" /> جاري البحث...</>
                ) : (
                  <>وجدنا <strong className="num">{courses.length}</strong> كورس</>
                )}
              </h2>
            </div>

            <div className={styles.sort}>
              <ArrowUpDown size={18} aria-hidden="true" />
              <label htmlFor="catalog-sort" className={styles.sortLabel}>ترتيب حسب:</label>
              <select id="catalog-sort" value={sort} onChange={e => setSort(e.target.value)} className={`input-field ${styles.sortSelect}`}>
                <option value="newest">الأحدث إضافة</option>
                <option value="rating">الأعلى تقييماً</option>
                <option value="price_asc">السعر: الأقل للأعلى</option>
                <option value="price_desc">السعر: الأعلى للأقل</option>
              </select>
            </div>
          </div>

          {loading && <div className={styles.progress} role="presentation" />}

          {/* Courses Grid */}
          {courses.length === 0 && !loading ? (
            <div className={styles.empty}>
              <span className={styles.emptyIcon} aria-hidden="true"><BookOpen size={40} /></span>
              <h3 className={styles.emptyTitle}>لم نجد أي كورسات تطابق بحثك</h3>
              <p className={styles.emptyText}>جرب تخفيف الفلاتر أو تغيير مصطلحات البحث.</p>
              <button type="button" onClick={clearFilters} className="btn btn-solid" style={{ marginTop: '0.75rem' }}>إظهار كل الكورسات</button>
            </div>
          ) : (
            <div className={styles.grid} aria-busy={loading}>
              <AnimatePresence initial={false}>
                {courses.map((course, idx) => (
                  <motion.div
                    key={course.id}
                    variants={fadeUp}
                    custom={idx % 6}
                    initial="hidden"
                    animate="visible"
                    exit="exit"
                    style={{ height: '100%' }}
                  >
                    <CourseCard
                      href={`/courses/${course.id}`}
                      reveal={false}
                      title={course.title}
                      category={course.category}
                      description={course.description}
                      thumbnail={course.thumbnail}
                      instructorName={course.instructor?.name}
                      instructorImage={course.instructor?.image}
                      rating={course.rating}
                      priority={idx < 3 && !showFeatured}
                      price={course.priceSYP > 0 ? `${formatNumber(course.priceSYP)} ل.س` : null}
                    />
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
