import styles from './Skeletons.module.css';

/** Placeholder grid that matches CourseCard's geometry (no layout shift on swap). */
export function CourseGridSkeleton({ count = 8 }: { count?: number }) {
  return (
    <div className={styles.grid} aria-hidden="true">
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className={styles.card}>
          <div className={`kq-skeleton ${styles.media}`} />
          <div className={styles.body}>
            <div className={`kq-skeleton ${styles.line}`} style={{ width: '92%' }} />
            <div className={`kq-skeleton ${styles.line}`} style={{ width: '70%' }} />
            <div className={styles.meta}>
              <div className={`kq-skeleton ${styles.avatar}`} />
              <div className={`kq-skeleton ${styles.line}`} style={{ width: '40%', margin: 0 }} />
            </div>
            <div className={styles.footer}>
              <div className={`kq-skeleton ${styles.line}`} style={{ width: '30%', height: 16, margin: 0 }} />
              <div className={`kq-skeleton ${styles.pill}`} />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

/** Page-level loading state for the catalogue route. */
export function CatalogLoading() {
  return (
    <div className={styles.page} role="status" aria-live="polite">
      <span className="sr-only">جارٍ تحميل الكورسات...</span>
      <div className={styles.hero}>
        <div className={`kq-skeleton ${styles.eyebrow}`} />
        <div className={`kq-skeleton ${styles.title}`} />
        <div className={`kq-skeleton ${styles.search}`} />
      </div>
      <div className="kq-container" style={{ marginTop: '2.5rem' }}>
        <CourseGridSkeleton />
      </div>
    </div>
  );
}

/** Loading state for a course details page. */
export function CourseDetailsLoading() {
  return (
    <div className={`kq-container ${styles.details}`} role="status" aria-live="polite">
      <span className="sr-only">جارٍ تحميل تفاصيل الكورس...</span>
      <div className={styles.detailsMain}>
        <div className={`kq-skeleton ${styles.line}`} style={{ width: 140 }} />
        <div className={`kq-skeleton ${styles.title}`} style={{ width: '85%', marginInline: 0 }} />
        <div className={`kq-skeleton ${styles.line}`} style={{ width: '95%' }} />
        <div className={`kq-skeleton ${styles.line}`} style={{ width: '75%' }} />
        <div className={`kq-skeleton ${styles.block}`} />
      </div>
      <div className={`kq-skeleton ${styles.detailsAside}`} />
    </div>
  );
}
