'use client';

import { useState, useEffect, useRef, type ReactNode } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Filter, BookOpen, Star, User, X, SlidersHorizontal, ArrowUpDown, Tag } from 'lucide-react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import CourseCard from '@/components/ui/CourseCard';
import { backdrop, drawerFromStart, fadeUp } from '@/lib/motion';
import styles from './Courses.module.css';
import { coursePriceLabel } from '@/lib/format';

type CatalogCourse = {
  id: string;
  title: string;
  description?: string | null;
  category?: string | null;
  thumbnail?: string | null;
  price?: number;
  priceSYP: number;
  rating: number;
  instructor: { name: string | null; image?: string | null };
};

type Props = {
  initialCourses: CatalogCourse[];
  featuredCourses?: CatalogCourse[];
  categories?: string[];
  instructors?: string[];
  /** Total matches on the server for the initial (URL) filters. */
  initialTotal?: number;
  initialHasMore?: boolean;
  /** The curriculum type filter exists only while that catalogue is public. */
  showTypeFilter?: boolean;
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
  initialTotal,
  initialHasMore = false,
  showTypeFilter = false,
  eyebrow = 'اكتشف كورسك القادم',
  heading = <>البحث <span className="text-gold">المتقدم</span></>,
  description,
}: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [courses, setCourses] = useState(initialCourses);
  const [total, setTotal] = useState(initialTotal ?? initialCourses.length);
  const [hasMore, setHasMore] = useState(initialHasMore);
  const [page, setPage] = useState(1);
  const [loadingMore, setLoadingMore] = useState(false);
  const [loading, setLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<{ term: string; items: { type: string; label: string; href: string }[] }>({ term: '', items: [] });
  const [suggestOpen, setSuggestOpen] = useState(false);
  // The server already rendered the results for the URL's filters.
  const firstRun = useRef(true);
  const requestId = useRef(0);
  const [isMobileFiltersOpen, setIsMobileFiltersOpen] = useState(false);

  // Filters State
  const [q, setQ] = useState(searchParams.get('q') || '');
  const [category, setCategory] = useState(searchParams.get('category') || 'الكل');
  const [type, setType] = useState(searchParams.get('type') || 'الكل');
  const [price, setPrice] = useState(searchParams.get('price') || 'الكل');
  const [rating, setRating] = useState(searchParams.get('rating') || 'الكل');
  const [instructor, setInstructor] = useState(searchParams.get('instructor') || 'الكل');
  const [sort, setSort] = useState(searchParams.get('sort') || 'auto');

  const buildParams = () => {
    const params = new URLSearchParams();
    if (q.trim()) params.set('q', q.trim());
    if (category && category !== 'الكل') params.set('category', category);
    if (showTypeFilter && type && type !== 'الكل') params.set('type', type);
    if (price && price !== 'الكل') params.set('price', price);
    if (rating && rating !== 'الكل') params.set('rating', rating);
    if (instructor && instructor !== 'الكل') params.set('instructor', instructor);
    if (sort && sort !== 'auto') params.set('sort', sort);
    return params;
  };

  // Search when filters change (300ms debounce). Stale responses are ignored.
  useEffect(() => {
    if (firstRun.current) { firstRun.current = false; return; }
    const id = ++requestId.current;
    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const params = buildParams();
        const query = params.toString();
        // The URL always reflects the search, so back/forward and sharing keep it.
        router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
        const res = await fetch(`/api/courses/search?${query}`);
        if (res.ok && id === requestId.current) {
          const data = await res.json();
          setCourses(data.courses);
          setTotal(data.total ?? data.courses.length);
          setHasMore(Boolean(data.hasMore));
          setPage(1);
        }
      } catch (error) {
        console.error('Failed to fetch courses:', error);
      }
      if (id === requestId.current) setLoading(false);
    }, 300);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, category, type, price, rating, instructor, sort, router, pathname]);

  // Instant suggestions while typing.
  useEffect(() => {
    const term = q.trim();
    if (term.length < 2) return;
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/courses/suggest?q=${encodeURIComponent(term)}`, { signal: controller.signal });
        if (res.ok) setSuggestions({ term, items: (await res.json()).suggestions || [] });
      } catch { /* aborted or offline: no suggestions */ }
    }, 180);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [q]);

  const loadMore = async () => {
    setLoadingMore(true);
    try {
      const params = buildParams();
      params.set('page', String(page + 1));
      const res = await fetch(`/api/courses/search?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setCourses(current => [...current, ...data.courses.filter((c: CatalogCourse) => !current.some(x => x.id === c.id))]);
        setHasMore(Boolean(data.hasMore));
        setPage(page + 1);
      }
    } catch (error) {
      console.error('Failed to load more courses:', error);
    }
    setLoadingMore(false);
  };

  // Suggestions belong to the current text only (stale ones are never shown).
  const visibleSuggestions = suggestions.term === q.trim() && suggestions.term.length >= 2 ? suggestions.items : [];

  const activeFilters = [category, price, rating, instructor].filter(value => value !== 'الكل').length
    + (showTypeFilter && type !== 'الكل' ? 1 : 0) + (q.trim() ? 1 : 0);

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
    setSort('auto');
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

      {showTypeFilter && (
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
      )}

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

      <button type="button" onClick={clearFilters} className={`btn ${styles.clear}`} disabled={activeFilters === 0}>
        إعادة ضبط الفلاتر{activeFilters > 0 ? ` (${activeFilters})` : ''}
      </button>
    </div>
  );

  const showFeatured = featuredCourses.length > 0 && activeFilters === 0;

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
            onChange={e => { setQ(e.target.value); setSuggestOpen(true); }}
            onFocus={() => setSuggestOpen(true)}
            onBlur={() => setTimeout(() => setSuggestOpen(false), 150)}
            onKeyDown={e => { if (e.key === 'Escape' || e.key === 'Enter') setSuggestOpen(false); }}
            className={styles.searchInput}
            autoComplete="off"
            enterKeyHint="search"
            role="combobox"
            aria-expanded={suggestOpen && visibleSuggestions.length > 0}
            aria-controls="catalog-suggestions"
            aria-autocomplete="list"
          />
          {q ? (
            <button type="button" className={styles.clearSearch} onClick={() => setQ('')} aria-label="مسح البحث">
              <X size={18} aria-hidden="true" />
            </button>
          ) : null}
          {suggestOpen && visibleSuggestions.length > 0 ? (
            <ul id="catalog-suggestions" className={styles.suggestions} role="listbox" aria-label="اقتراحات البحث">
              {visibleSuggestions.map(item => (
                <li key={item.href} role="option" aria-selected="false">
                  <Link href={item.href} className={styles.suggestion} onMouseDown={e => e.preventDefault()} onClick={() => setSuggestOpen(false)}>
                    {item.type === 'category' ? <Tag size={15} aria-hidden="true" /> : <BookOpen size={15} aria-hidden="true" />}
                    <span className={styles.suggestionLabel}>{item.label}</span>
                    {item.type === 'category' ? <span className={styles.suggestionKind}>قسم</span> : null}
                  </Link>
                </li>
              ))}
            </ul>
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
                price={coursePriceLabel(course)}
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
                  عرض النتائج ({total})
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
                  <>وجدنا <strong className="num">{total}</strong> كورس</>
                )}
              </h2>
            </div>

            <div className={styles.sort}>
              <ArrowUpDown size={18} aria-hidden="true" />
              <label htmlFor="catalog-sort" className={styles.sortLabel}>ترتيب حسب:</label>
              <select id="catalog-sort" value={sort === 'auto' || (sort === 'relevance' && !q.trim()) ? (q.trim() ? 'relevance' : 'newest') : sort} onChange={e => setSort(e.target.value)} className={`input-field ${styles.sortSelect}`}>
                {q.trim() ? <option value="relevance">الأكثر صلة</option> : null}
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
              <p className={styles.emptyText}>
                {q.trim() ? <>لا توجد نتائج لـ «{q.trim()}». </> : null}
                جرّب كلمة أقصر أو تهجئة أخرى، أو أزل بعض الفلاتر.
              </p>
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
                      price={coursePriceLabel(course)}
                    />
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}
          {hasMore && !loading && courses.length > 0 ? (
            <div style={{ display: 'flex', justifyContent: 'center', marginTop: '2rem' }}>
              <button type="button" className="btn btn-outline" onClick={loadMore} disabled={loadingMore}>
                {loadingMore ? 'جاري التحميل...' : `عرض المزيد (${total - courses.length})`}
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
