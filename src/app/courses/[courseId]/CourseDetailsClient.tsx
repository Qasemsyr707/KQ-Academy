'use client';

import { useState, useMemo, useEffect, useRef } from 'react';
import { Star, User, PlayCircle, ChevronDown, Award, Infinity as InfinityIcon, BookOpen, Globe, Calendar, Check, Subtitles, MonitorSmartphone, FileText, X, ChevronLeft, Users } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import { formatDistanceToNow } from 'date-fns';
import { ar } from 'date-fns/locale';
import ReviewButton from './ReviewButton';
import { LessonMediaPlayer } from '@/components/LessonMediaPlayer';
import { backdrop, collapse, modal } from '@/lib/motion';
import styles from './CourseDetails.module.css';
import { formatNumber } from '@/lib/format';

// Utility to generate a consistent random number based on a string (course id)
function generateRandomNumber(id: string, min: number, max: number) {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = id.charCodeAt(i) + ((hash << 5) - hash);
  }
  const random = Math.abs(Math.sin(hash));
  return Math.floor(random * (max - min + 1)) + min;
}

type Lesson = { id: string; title: string; isLive?: boolean; hasVideo?: boolean };
type Chapter = { id: string; title: string; isFree?: boolean; lessons?: Lesson[] };
type Review = {
  id: string;
  rating: number;
  comment?: string | null;
  createdAt?: string | Date | null;
  user?: { name?: string | null; image?: string | null } | null;
};
type CourseDetails = {
  id: string;
  title: string;
  description?: string | null;
  category?: string | null;
  thumbnail?: string | null;
  previewVideoUrl?: string | null;
  price: number;
  priceSYP: number;
  rating: number;
  includes?: unknown;
  requirements?: string[];
  updatedAt?: string | Date | null;
  instructor?: { name?: string | null; image?: string | null; bio?: string | null } | null;
  reviews?: Review[];
  chapters?: Chapter[];
};

function Stars({ value, size = 14 }: { value: number; size?: number }) {
  return (
    <span className={styles.stars} aria-hidden="true">
      {[0, 1, 2, 3, 4].map(i => (
        <Star key={i} size={size} fill={i < Math.round(value) ? 'currentColor' : 'transparent'} color={i < Math.round(value) ? 'currentColor' : 'rgba(255,255,255,0.25)'} />
      ))}
    </span>
  );
}

function reviewAge(createdAt: Review['createdAt']) {
  if (!createdAt) return null;
  const date = new Date(createdAt);
  if (Number.isNaN(date.getTime())) return null;
  return formatDistanceToNow(date, { addSuffix: true, locale: ar });
}

export default function CourseDetailsClient({ course, isEnrolled }: { course: CourseDetails; isEnrolled: boolean }) {
  const chapters = course.chapters ?? [];
  const reviews = course.reviews ?? [];
  const [activeChapter, setActiveChapter] = useState<string | null>(chapters[0]?.id || null);
  const [previewLesson, setPreviewLesson] = useState<{ id: string; title: string } | null>(null);
  const closePreviewRef = useRef<HTMLButtonElement>(null);

  // Generate consistent pseudo-random metrics based on course ID so it doesn't look static
  const studentsCount = useMemo(() => generateRandomNumber(course.id || 'default', 850, 25000), [course.id]);
  const actualReviewsCount = reviews.length;

  const requirements = course.requirements || [];

  const totalLectures = chapters.reduce((acc, chap) => acc + (chap.lessons?.length || 0), 0);
  const totalSections = chapters.length;

  const updatedAt = course.updatedAt ? new Date(course.updatedAt) : null;
  const instructorName = course.instructor?.name;

  const includes = Array.isArray(course.includes)
    ? (course.includes as unknown[])
        .filter((f): f is string => typeof f === 'string')
        .flatMap(f => f.split(/◾|▪|•/))
        .map(f => f.trim())
        .filter(Boolean)
    : [];

  // Preview modal: Escape closes, focus moves to the close button, page scroll locks.
  useEffect(() => {
    if (!previewLesson) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setPreviewLesson(null);
    };
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    document.addEventListener('keydown', onKey);
    closePreviewRef.current?.focus();
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = previousOverflow;
    };
  }, [previewLesson]);

  const priceLabel = course.priceSYP > 0
    ? `${formatNumber(course.priceSYP)} ل.س`
    : (course.price > 0 ? `$${course.price}` : 'مجاني');

  return (
    <div className={styles.page}>
      <div className={styles.layout}>
        {/* ----- Header ----- */}
        <header className={styles.header}>
          <nav className={styles.breadcrumb} aria-label="مسار التنقل" data-enter="fade">
            <Link href="/courses">الدورات</Link>
            <ChevronLeft size={14} aria-hidden="true" />
            <span>{course.category}</span>
          </nav>

          <h1 className={styles.title} data-enter="" style={{ '--enter-i': 1 } as React.CSSProperties}>
            {course.title}
          </h1>

          <p className={styles.excerpt} data-enter="" style={{ '--enter-i': 2 } as React.CSSProperties}>
            {course.description?.substring(0, 200) || 'دورة شاملة تأخذك من الصفر وحتى الاحتراف مع تطبيقات عملية حديثة ومتطورة.'}...
          </p>

          <div className={styles.facts} data-enter="" style={{ '--enter-i': 3 } as React.CSSProperties}>
            <span className={styles.bestseller}>الأكثر مبيعاً</span>
            <span className={styles.ratingInline}>
              <span className={styles.ratingValue}>{course.rating.toFixed(1)}</span>
              <Stars value={course.rating} />
              <a href="#reviews" className={styles.factLink}>
                ({formatNumber(actualReviewsCount)} التقييمات)
              </a>
            </span>
            <span className={styles.factText}>
              <span className="num">{formatNumber(studentsCount)}</span> من الطلاب
            </span>
            <span className={styles.factText}>
              المُحاضر: <a href="#instructor" className={styles.factLink}>{instructorName}</a>
            </span>
          </div>

          <div className={styles.metaRow} data-enter="fade" style={{ '--enter-i': 4 } as React.CSSProperties}>
            {updatedAt && !Number.isNaN(updatedAt.getTime()) ? (
              <span className={styles.metaChip}>
                <Calendar size={15} aria-hidden="true" /> تاريخ آخر تحديث {updatedAt.toLocaleDateString('ar-SA', { month: 'long', year: 'numeric', timeZone: 'UTC' })}
              </span>
            ) : null}
            <span className={styles.metaChip}><Globe size={15} aria-hidden="true" /> العربية</span>
            <span className={styles.metaChip}><Subtitles size={15} aria-hidden="true" /> الإنجليزية [تلقائي]</span>
          </div>
        </header>

        {/* ----- Purchase card ----- */}
        <aside className={styles.aside} aria-label="الاشتراك في الدورة">
          <div className={styles.purchase} data-enter="scale" style={{ '--enter-i': 2 } as React.CSSProperties}>
            <div className={styles.preview}>
              {course.previewVideoUrl ? (
                <LessonMediaPlayer directUrl={course.previewVideoUrl} title={course.title} />
              ) : (
                <>
                  {course.thumbnail ? (
                    <Image src={course.thumbnail} alt="" fill unoptimized sizes="370px" className={styles.previewImage} loading="eager" />
                  ) : null}
                  <div className={styles.previewOverlay}>
                    <span className={styles.previewPlay} aria-hidden="true"><PlayCircle size={34} /></span>
                    <span className={styles.previewLabel}>معاينة هذه الدورة</span>
                  </div>
                </>
              )}
            </div>

            <div className={styles.purchaseBody}>
              <div className={`${styles.price} ${priceLabel === 'مجاني' ? styles.priceFree : ''}`}>{priceLabel}</div>

              {isEnrolled ? (
                <div className={styles.actions}>
                  <Link href={`/courses/${course.id}/learn`} className="btn btn-solid btn-lg">
                    إكمال التعلم
                  </Link>
                </div>
              ) : (
                <>
                  <div className={styles.actions}>
                    <Link href={`/checkout?courseId=${course.id}`} className="btn btn-solid btn-lg">
                      إضافة إلى السلة
                    </Link>
                    <Link href={`/checkout?courseId=${course.id}`} className="btn btn-outline btn-lg">
                      اشترِ الآن
                    </Link>
                  </div>
                  <p className={styles.guarantee}>ضمان استرداد الأموال لمدة 30 يومًا</p>
                </>
              )}

              <div>
                <h2 className={styles.includesTitle} style={{ marginBottom: '0.85rem' }}>تتضمن هذه الدورة ما يأتي:</h2>
                <ul className={styles.includes}>
                  {includes.length > 0 ? (
                    includes.map((feature, idx) => (
                      <li key={idx}>
                        <Check size={16} aria-hidden="true" />
                        <span>{feature}</span>
                      </li>
                    ))
                  ) : (
                    <>
                      <li><MonitorSmartphone size={16} aria-hidden="true" /><span>فيديو متوفر عند الطلب مدته 40.5 من الساعات</span></li>
                      <li><FileText size={16} aria-hidden="true" /><span>22 تمارين برمجة</span></li>
                      <li><InfinityIcon size={16} aria-hidden="true" /><span>الوصول الكامل مدى الحياة</span></li>
                      <li><MonitorSmartphone size={16} aria-hidden="true" /><span>إمكانية وصول عبر الهاتف المحمول والتلفزيون</span></li>
                      <li><Award size={16} aria-hidden="true" /><span>شهادة إكمال</span></li>
                    </>
                  )}
                </ul>
              </div>

              {!isEnrolled && (
                <div className={styles.secondaryActions}>
                  <button type="button" className={styles.textButton}>مشاركة</button>
                  <button type="button" className={styles.textButton}>إهداء هذه الدورة</button>
                  <button type="button" className={styles.textButton}>تطبيق الكوبون</button>
                </div>
              )}
            </div>
          </div>
        </aside>

        {/* ----- Content ----- */}
        <div className={`${styles.content} kq-section-light`}>
          {/* Course Content */}
          <section className={styles.block} aria-labelledby="course-content-title" data-reveal="">
            <h2 id="course-content-title" className={styles.blockTitle}>محتوى الدورة</h2>
            <p className={styles.blockSub}>
              <span className="num">{totalSections}</span> من الأقسام • <span className="num">{totalLectures}</span> من المحاضرات
            </p>

            <div className={styles.accordion}>
              {chapters.length === 0 ? (
                <p className={styles.emptyText}>لم يتم إضافة الدروس بعد.</p>
              ) : (
                chapters.map(chapter => {
                  const open = activeChapter === chapter.id;
                  const panelId = `chapter-panel-${chapter.id}`;
                  return (
                    <div key={chapter.id} className={styles.chapter}>
                      <button
                        type="button"
                        className={styles.chapterButton}
                        onClick={() => setActiveChapter(open ? null : chapter.id)}
                        aria-expanded={open}
                        aria-controls={panelId}
                      >
                        <span className={styles.chapterTitle}>
                          <span className={styles.chapterChevron} aria-hidden="true"><ChevronDown size={16} /></span>
                          {chapter.title}
                        </span>
                        <span className={styles.chapterCount}>{chapter.lessons?.length || 0} من المحاضرات</span>
                      </button>

                      <AnimatePresence initial={false}>
                        {open && (
                          <motion.div
                            id={panelId}
                            key="panel"
                            variants={collapse}
                            initial="collapsed"
                            animate="open"
                            exit="collapsed"
                            style={{ overflow: 'hidden' }}
                          >
                            <ul className={styles.lessons}>
                              {chapter.lessons?.map(lesson => {
                                const canPreview = chapter.isFree && lesson.hasVideo && !lesson.isLive;
                                return (
                                  <li key={lesson.id} className={`${styles.lesson} ${chapter.isFree ? styles.lessonPreview : ''}`}>
                                    <PlayCircle size={17} aria-hidden="true" />
                                    <span className={styles.lessonTitle}>
                                      {canPreview ? (
                                        <button type="button" className={styles.lessonButton} onClick={() => setPreviewLesson({ id: lesson.id, title: lesson.title })}>
                                          {lesson.title}
                                        </button>
                                      ) : (
                                        lesson.title
                                      )}
                                    </span>
                                    {chapter.isFree && <span className={styles.freeBadge}>معاينة مجانية</span>}
                                  </li>
                                );
                              })}
                            </ul>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  );
                })
              )}
            </div>
          </section>

          {/* Requirements */}
          {requirements.length > 0 && (
            <section className={styles.block} aria-labelledby="requirements-title" data-reveal="">
              <h2 id="requirements-title" className={styles.blockTitle}>المتطلبات</h2>
              <ul className={styles.list}>
                {requirements.map((req, idx) => (
                  <li key={idx}>{req}</li>
                ))}
              </ul>
            </section>
          )}

          {/* Description */}
          <section className={styles.block} aria-labelledby="description-title" data-reveal="">
            <h2 id="description-title" className={styles.blockTitle}>الوصف</h2>
            <div className={styles.prose}>
              {course.description || 'وصف الكورس غير متوفر حالياً.'}
            </div>
          </section>

          {/* Instructor */}
          <section id="instructor" className={styles.block} aria-labelledby="instructor-title" data-reveal="">
            <h2 id="instructor-title" className={styles.blockTitle}>محاضر</h2>
            <div className={styles.instructorCard}>
              <div className={styles.instructorTop}>
                <div className={styles.instructorPhoto}>
                  {course.instructor?.image ? (
                    <Image src={course.instructor.image} alt={instructorName || ''} fill unoptimized sizes="96px" />
                  ) : (
                    <User size={40} aria-hidden="true" />
                  )}
                </div>
                <div>
                  <h3 className={styles.instructorName}>{instructorName}</h3>
                  <p className={styles.instructorRole}>خبير ومدرب تقني</p>
                </div>
              </div>
              <ul className={styles.instructorStats}>
                <li><Star size={16} aria-hidden="true" /> {course.rating.toFixed(1)} تقييم المحاضر</li>
                <li><Award size={16} aria-hidden="true" /> {formatNumber(actualReviewsCount)} من التقييمات</li>
                <li><Users size={16} aria-hidden="true" /> {formatNumber(studentsCount * 5)} من الطلاب</li>
                <li><BookOpen size={16} aria-hidden="true" /> 12 من الدورات</li>
              </ul>
              <p className={styles.prose}>
                {course.instructor?.bio || 'هذا المدرب لم يقم بإضافة نبذة شخصية بعد. ولكنه يعتبر من أفضل الخبراء في هذا المجال ويقدم محتوى عالي الجودة لطلابه.'}
              </p>
            </div>
          </section>

          {/* Reviews */}
          <section id="reviews" className={styles.block} aria-labelledby="reviews-title" data-reveal="">
            <div className={styles.reviewsHeader}>
              <h2 id="reviews-title" className={styles.blockTitle}>
                <Star color="var(--warning)" fill="var(--warning)" size={22} aria-hidden="true" />
                {course.rating.toFixed(1)} تقييمات الدورة • {reviews.length} من التقييمات
              </h2>
              {isEnrolled && <ReviewButton courseId={course.id} />}
            </div>

            {reviews.length === 0 ? (
              <p className={styles.blockSub}>لا توجد تقييمات حتى الآن. كن أول من يشارك رأيه بعد إتمام الكورس!</p>
            ) : (
              <div className={styles.reviews}>
                {reviews.map(review => {
                  const age = reviewAge(review.createdAt);
                  return (
                    <article key={review.id} className={styles.review}>
                      <div className={styles.reviewHead}>
                        <div className={styles.reviewAvatar}>
                          {review.user?.image ? (
                            <Image src={review.user.image} alt="" fill unoptimized sizes="44px" />
                          ) : (
                            <span aria-hidden="true">{(review.user?.name || 'U').charAt(0).toUpperCase()}</span>
                          )}
                        </div>
                        <div>
                          <h3 className={styles.reviewName}>{review.user?.name}</h3>
                          <div className={styles.reviewMeta}>
                            <Stars value={review.rating} size={12} />
                            <span className="sr-only">{review.rating} من 5</span>
                            {age ? <span className={styles.reviewDate}>{age}</span> : null}
                          </div>
                        </div>
                      </div>
                      <p className={styles.reviewText}>{review.comment}</p>
                    </article>
                  );
                })}
              </div>
            )}
          </section>
        </div>
      </div>

      {/* Free Lesson Preview Modal */}
      <AnimatePresence>
        {previewLesson && (
          <div className={styles.modalRoot} role="dialog" aria-modal="true" aria-labelledby="preview-title">
            <motion.div className={styles.modalBackdrop} variants={backdrop} initial="hidden" animate="visible" exit="exit" onClick={() => setPreviewLesson(null)} />
            <motion.div className={styles.modal} variants={modal} initial="hidden" animate="visible" exit="exit">
              <div className={styles.modalBar}>
                <h2 id="preview-title" className={styles.modalTitle}>{previewLesson.title}</h2>
                <button ref={closePreviewRef} type="button" onClick={() => setPreviewLesson(null)} className={styles.modalClose}>
                  <X size={18} aria-hidden="true" /> إغلاق
                </button>
              </div>
              <div className={styles.modalPlayer}>
                <LessonMediaPlayer lessonId={previewLesson.id} title={previewLesson.title} />
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
