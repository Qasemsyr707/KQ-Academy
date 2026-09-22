'use client';

import { useState, useMemo, useEffect } from 'react';
import { Star, Clock, User, CheckCircle, PlayCircle, ShieldCheck, ChevronDown, Award, Infinity, Video, HelpCircle, BookOpen, Globe, Calendar, Check, Subtitles, MonitorSmartphone, FileText, Share, Gift } from 'lucide-react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import ReviewButton from './ReviewButton';

// Utility to generate a consistent random number based on a string (course id)
function generateRandomNumber(id: string, min: number, max: number) {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = id.charCodeAt(i) + ((hash << 5) - hash);
  }
  const random = Math.abs(Math.sin(hash));
  return Math.floor(random * (max - min + 1)) + min;
}

export default function CourseDetailsClient({ course, isEnrolled }: { course: any, isEnrolled: boolean }) {
  const [activeChapter, setActiveChapter] = useState<string | null>(course.chapters[0]?.id || null);
  const [previewLessonVideo, setPreviewLessonVideo] = useState<string | null>(null);

  // Generate consistent pseudo-random metrics based on course ID so it doesn't look static
  const studentsCount = useMemo(() => generateRandomNumber(course.id || 'default', 850, 25000), [course.id]);
  const ratingCount = useMemo(() => generateRandomNumber(course.id || 'default', 150, Math.floor(studentsCount * 0.3)), [course.id, studentsCount]);

  const whatYouWillLearn = course.learningObjectives || [
    'احتراف كتابة الأكواد البرمجية بأفضل الممارسات العالمية',
    'بناء مشاريع عملية حقيقية خطوة بخطوة',
    'فهم الخوارزميات المتقدمة وهيكلة البيانات',
    'التعامل مع قواعد البيانات وربطها بالتطبيق',
    'تحليل المشاكل البرمجية وإيجاد حلول فعالة لها',
    'تطوير الواجهات الأمامية والخلفية باحترافية'
  ];

  const requirements = course.requirements || [
    'جهاز كمبيوتر (ويندوز، ماك، أو لينكس) مع اتصال بالإنترنت.',
    'شغف ورغبة حقيقية في تعلم البرمجة.',
    'لا يشترط وجود أي خبرة مسبقة في البرمجة، سنبدأ من الصفر!'
  ];

  const totalLectures = course.chapters?.reduce((acc: number, chap: any) => acc + (chap.lessons?.length || 0), 0) || 0;
  const totalSections = course.chapters?.length || 0;

  return (
    <div style={{ minHeight: '100vh', background: '#1c1d1f', color: '#fff', paddingBottom: '4rem', position: 'relative' }}>
      
      {/* Absolute Dark Header Background */}
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '400px', background: '#1c1d1f', borderBottom: '1px solid rgba(255,255,255,0.1)', zIndex: 0 }}></div>

      <div style={{ maxWidth: '1200px', margin: '0 auto', position: 'relative', zIndex: 1, display: 'flex', gap: '3rem', padding: '2rem 2rem 0' }} className="course-layout-container">
        
        {/* Main Content Area (Header + Body) */}
        <div style={{ flex: '1 1 0', minWidth: 0 }}>
          
          {/* Header Content */}
          <div style={{ marginBottom: '3rem', minHeight: '300px' }}>
            <div style={{ color: '#c0c4fc', fontWeight: 'bold', fontSize: '0.9rem', marginBottom: '1.5rem', display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              <Link href="/courses" style={{ color: '#c0c4fc', textDecoration: 'none' }}>الدورات</Link>
              <ChevronDown size={14} style={{ transform: 'rotate(90deg)' }} />
              <span>{course.category}</span>
            </div>
            
            <h1 style={{ fontSize: 'clamp(2rem, 3vw, 2.5rem)', fontWeight: 800, marginBottom: '1rem', lineHeight: 1.2 }}>
              {course.title}
            </h1>
            
            <p style={{ fontSize: '1.1rem', color: '#fff', marginBottom: '1.5rem', maxWidth: '800px', lineHeight: 1.6 }}>
              {course.description?.substring(0, 200) || 'دورة شاملة تأخذك من الصفر وحتى الاحتراف مع تطبيقات عملية حديثة ومتطورة.'}...
            </p>
            
            <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center', marginBottom: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', background: '#eceb98', color: '#3d3c0a', padding: '0.2rem 0.6rem', borderRadius: '2px', fontWeight: 'bold', fontSize: '0.85rem' }}>
                الأكثر مبيعاً
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                <span style={{ fontSize: '1.1rem', fontWeight: 'bold', color: '#f69c08' }}>{course.rating.toFixed(1)}</span>
                <div style={{ display: 'flex' }}>
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} size={14} fill={i < Math.round(course.rating) ? '#f69c08' : 'transparent'} color={i < Math.round(course.rating) ? '#f69c08' : 'rgba(255,255,255,0.3)'} />
                  ))}
                </div>
                <a href="#reviews" style={{ color: '#c0c4fc', textDecoration: 'underline', fontSize: '0.95rem', marginLight: '0.2rem' }}>
                  ({ratingCount.toLocaleString()} التقييمات)
                </a>
              </div>
              <div style={{ fontSize: '0.95rem', color: '#fff' }}>
                {studentsCount.toLocaleString()} من الطلاب
              </div>
            </div>
            
            <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap', fontSize: '0.95rem', color: '#fff', marginBottom: '1rem' }}>
              <div>المُحاضر: <a href="#instructor" style={{ color: '#c0c4fc', textDecoration: 'underline' }}>{(course.instructor as any)?.name}</a></div>
            </div>
            
            <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap', fontSize: '0.9rem', color: '#fff' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <Calendar size={16} /> تاريخ آخر تحديث {new Date().toLocaleDateString('ar-SA', { month: 'long', year: 'numeric' })}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <Globe size={16} /> العربية
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <Subtitles size={16} /> الإنجليزية [تلقائي]
              </div>
            </div>
          </div>

          {/* Body Content */}
          <div style={{ paddingTop: '2rem' }}>
            
            {/* What you'll learn (ما ستتعلمه) */}
            <div style={{ border: '1px solid rgba(255,255,255,0.2)', padding: '1.5rem', borderRadius: '4px', marginBottom: '3rem' }}>
              <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '1.5rem' }}>ما ستتعلمه</h2>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1rem' }}>
                {whatYouWillLearn.map((item: string, idx: number) => (
                  <div key={idx} style={{ display: 'flex', alignItems: 'flex-start', gap: '0.8rem' }}>
                    <Check size={18} color="#fff" style={{ flexShrink: 0, marginTop: '0.2rem' }} />
                    <span style={{ fontSize: '0.95rem', color: '#d1d7dc', lineHeight: 1.5 }}>{item}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Course Content */}
            <div style={{ marginBottom: '3rem' }}>
              <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '1rem' }}>محتوى الدورة</h2>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: '#d1d7dc', fontSize: '0.95rem', marginBottom: '1rem' }}>
                <div>{totalSections} من الأقسام • {totalLectures} من المحاضرات</div>
              </div>
              
              <div style={{ border: '1px solid rgba(255,255,255,0.2)', borderRadius: '4px', overflow: 'hidden' }}>
                {course.chapters?.length === 0 ? (
                  <p style={{ padding: '1.5rem', color: 'rgba(255,255,255,0.5)' }}>لم يتم إضافة الدروس بعد.</p>
                ) : (
                  course.chapters?.map((chapter: any, index: number) => (
                    <div key={chapter.id} style={{ borderBottom: index < course.chapters.length - 1 ? '1px solid rgba(255,255,255,0.2)' : 'none', background: activeChapter === chapter.id ? 'rgba(255,255,255,0.03)' : 'transparent' }}>
                      <button 
                        onClick={() => setActiveChapter(activeChapter === chapter.id ? null : chapter.id)}
                        style={{ width: '100%', padding: '1.2rem 1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.05)', border: 'none', color: '#fff', cursor: 'pointer', textAlign: 'right' }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                          <ChevronDown size={18} style={{ transform: activeChapter === chapter.id ? 'rotate(180deg)' : 'rotate(0)', transition: 'transform 0.2s' }} />
                          <h4 style={{ fontSize: '1.05rem', fontWeight: 'bold', margin: 0 }}>{chapter.title}</h4>
                        </div>
                        <span style={{ fontSize: '0.9rem', color: '#d1d7dc' }}>{chapter.lessons?.length || 0} من المحاضرات</span>
                      </button>
                      
                      <AnimatePresence>
                        {activeChapter === chapter.id && (
                          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} style={{ overflow: 'hidden' }}>
                            <div style={{ padding: '0.5rem 1.5rem 1.5rem' }}>
                              {chapter.lessons?.map((lesson: any) => (
                                <div 
                                  key={lesson.id} 
                                  style={{ 
                                    padding: '0.8rem 0', 
                                    display: 'flex', 
                                    alignItems: 'center', 
                                    gap: '1rem',
                                    borderBottom: '1px solid rgba(255,255,255,0.05)'
                                  }}
                                >
                                  <PlayCircle size={16} color={chapter.isFree ? "#a435f0" : "#d1d7dc"} />
                                  <span style={{ flex: 1, color: chapter.isFree ? '#a435f0' : '#d1d7dc', fontSize: '0.95rem', cursor: chapter.isFree ? 'pointer' : 'default', textDecoration: chapter.isFree ? 'underline' : 'none' }} onClick={() => {
                                    if (chapter.isFree && lesson.videoUrl) {
                                      setPreviewLessonVideo(lesson.videoUrl);
                                    }
                                  }}>
                                    {lesson.title}
                                  </span>
                                  {chapter.isFree && <span style={{ fontSize: '0.8rem', color: '#fff', background: '#a435f0', padding: '0.1rem 0.5rem', borderRadius: '4px' }}>معاينة مجانية</span>}
                                </div>
                              ))}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Requirements (متطلبات) */}
            <div style={{ marginBottom: '3rem' }}>
              <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '1rem' }}>المتطلبات</h2>
              <ul style={{ listStyleType: 'disc', paddingRight: '1.5rem', color: '#d1d7dc', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {requirements.map((req: string, idx: number) => (
                  <li key={idx} style={{ fontSize: '0.95rem', lineHeight: 1.6 }}>{req}</li>
                ))}
              </ul>
            </div>

            {/* Description (الوصف) */}
            <div style={{ marginBottom: '3rem' }}>
              <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '1rem' }}>الوصف</h2>
              <div style={{ color: '#d1d7dc', fontSize: '0.95rem', lineHeight: 1.8, whiteSpace: 'pre-wrap' }}>
                {course.description || 'وصف الكورس غير متوفر حالياً.'}
              </div>
            </div>

            {/* Instructor */}
            <div id="instructor" style={{ marginBottom: '3rem' }}>
              <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '1.5rem' }}>محاضر</h2>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 'bold', color: '#c0c4fc', marginBottom: '0.3rem', textDecoration: 'underline' }}>{(course.instructor as any)?.name}</h3>
              <div style={{ color: '#d1d7dc', fontSize: '1rem', marginBottom: '1rem' }}>خبير ومدرب تقني</div>
              
              <div style={{ display: 'flex', gap: '1.5rem', marginBottom: '1rem' }}>
                <div style={{ width: '120px', height: '120px', borderRadius: '50%', background: 'rgba(255,255,255,0.1)', overflow: 'hidden', flexShrink: 0 }}>
                   {(course.instructor as any)?.image ? (
                     <img src={(course.instructor as any).image} alt={(course.instructor as any).name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                   ) : (
                     <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><User size={40} color="rgba(255,255,255,0.5)" /></div>
                   )}
                </div>
                <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '0.5rem', color: '#d1d7dc', fontSize: '0.95rem' }}>
                  <li style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}><Star size={16} color="#d1d7dc" /> {course.rating.toFixed(1)} تقييم المحاضر</li>
                  <li style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}><Award size={16} color="#d1d7dc" /> {Math.floor(ratingCount * 3.5).toLocaleString()} من التقييمات</li>
                  <li style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}><User size={16} color="#d1d7dc" /> {(studentsCount * 5).toLocaleString()} من الطلاب</li>
                  <li style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}><PlayCircle size={16} color="#d1d7dc" /> 12 من الدورات</li>
                </ul>
              </div>
              
              <p style={{ color: '#d1d7dc', lineHeight: 1.7, fontSize: '0.95rem', whiteSpace: 'pre-wrap' }}>
                {(course.instructor as any)?.bio || 'هذا المدرب لم يقم بإضافة نبذة شخصية بعد. ولكنه يعتبر من أفضل الخبراء في هذا المجال ويقدم محتوى عالي الجودة لطلابه.'}
              </p>
            </div>

            {/* Reviews */}
            <div id="reviews" style={{ marginBottom: '3rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Star color="#f69c08" fill="#f69c08" size={24} /> {course.rating.toFixed(1)} تقييمات الدورة • {(course.reviews?.length || 0)} من التقييمات
                </h2>
                {isEnrolled && <ReviewButton courseId={course.id} />}
              </div>

              {course.reviews?.length === 0 ? (
                <p style={{ color: '#d1d7dc' }}>لا توجد تقييمات حتى الآن. كن أول من يشارك رأيه بعد إتمام الكورس!</p>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1.5rem' }}>
                  {course.reviews?.map((review: any) => (
                    <div key={review.id} style={{ borderTop: '1px solid rgba(255,255,255,0.2)', paddingTop: '1.5rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
                        <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: '#2d2f31', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem', fontWeight: 'bold' }}>
                          {review.user?.image ? (
                            <img src={review.user.image} alt={review.user.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          ) : (
                            (review.user?.name || 'U').charAt(0).toUpperCase()
                          )}
                        </div>
                        <div>
                          <h4 style={{ fontWeight: 'bold', fontSize: '1rem', margin: 0 }}>{review.user?.name}</h4>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.2rem' }}>
                            <div style={{ display: 'flex' }}>
                              {[...Array(5)].map((_, i) => (
                                <Star key={i} size={12} fill={i < review.rating ? '#f69c08' : 'transparent'} color={i < review.rating ? '#f69c08' : 'rgba(255,255,255,0.2)'} />
                              ))}
                            </div>
                            <span style={{ fontSize: '0.75rem', color: '#a1a7b3' }}>منذ {Math.floor(Math.random() * 11) + 1} من الشهور</span>
                          </div>
                        </div>
                      </div>
                      <p style={{ color: '#d1d7dc', lineHeight: 1.6, fontSize: '0.95rem' }}>{review.comment}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
            
          </div>
        </div>
        
        {/* Sticky Floating Sidebar */}
        <div className="floating-sidebar" style={{ width: '380px', flexShrink: 0, zIndex: 10 }}>
          <div style={{ position: 'sticky', top: '2rem', background: '#1c1d1f', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '4px', overflow: 'hidden', boxShadow: '0 4px 15px rgba(0,0,0,0.5)' }}>
            
            {/* Box Video Preview */}
            {course.previewVideoUrl ? (
              <div style={{ width: '100%', paddingTop: '56.25%', background: '#000', position: 'relative' }}>
                {course.previewVideoUrl.includes('iframe.mediadelivery.net') ? (
                  <iframe
                    src={course.previewVideoUrl}
                    loading="lazy"
                    style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', border: 'none' }}
                    allow="accelerometer;gyroscope;autoplay;encrypted-media;picture-in-picture;"
                    allowFullScreen={true}
                  ></iframe>
                ) : (
                  <video 
                    src={course.previewVideoUrl} 
                    controls 
                    style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }}
                  />
                )}
              </div>
            ) : (
              <div style={{ width: '100%', paddingTop: '56.25%', background: '#000', position: 'relative', cursor: 'pointer', borderBottom: '1px solid rgba(255,255,255,0.1)' }} className="group">
                <img src={course.thumbnail} alt={course.title} style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', objectFit: 'cover', opacity: 0.7 }} />
                <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.4)' }}>
                  <PlayCircle size={64} color="#fff" />
                  <div style={{ fontWeight: 'bold', color: '#fff', marginTop: '0.5rem', background: 'rgba(0,0,0,0.7)', padding: '0.2rem 1rem', borderRadius: '20px' }}>
                    معاينة هذه الدورة
                  </div>
                </div>
              </div>
            )}
            
            <div style={{ padding: '1.5rem' }}>
              <div style={{ fontSize: '2rem', fontWeight: 800, marginBottom: '1rem', color: '#fff' }}>
                 {course.priceSYP > 0 ? `${course.priceSYP.toLocaleString()} ل.س` : (course.price > 0 ? `$${course.price}` : 'مجاني')}
              </div>

              {isEnrolled ? (
                 <Link href={`/courses/${course.id}/learn`} style={{ width: '100%', padding: '1rem', fontSize: '1rem', fontWeight: 'bold', display: 'flex', justifyContent: 'center', alignItems: 'center', background: '#a435f0', color: '#fff', border: 'none', cursor: 'pointer', marginBottom: '1rem' }}>
                    إكمال التعلم
                 </Link>
              ) : (
                <>
                  <Link href={`/checkout?courseId=${course.id}`} style={{ width: '100%', padding: '1rem', fontSize: '1rem', fontWeight: 'bold', display: 'flex', justifyContent: 'center', alignItems: 'center', background: '#a435f0', color: '#fff', border: 'none', cursor: 'pointer', marginBottom: '0.5rem', textDecoration: 'none' }}>
                    إضافة إلى السلة
                  </Link>
                  <Link href={`/checkout?courseId=${course.id}`} style={{ width: '100%', padding: '1rem', fontSize: '1rem', fontWeight: 'bold', display: 'flex', justifyContent: 'center', alignItems: 'center', background: 'transparent', color: '#fff', border: '1px solid #fff', cursor: 'pointer', marginBottom: '1rem', textDecoration: 'none' }}>
                    اشترِ الآن
                  </Link>
                  <p style={{ textAlign: 'center', fontSize: '0.75rem', color: '#d1d7dc', marginBottom: '1.5rem' }}>
                    ضمان استرداد الأموال لمدة 30 يومًا
                  </p>
                </>
              )}

              <div>
                <h4 style={{ fontWeight: 'bold', marginBottom: '1rem', fontSize: '1rem' }}>تتضمن هذه الدورة ما يأتي:</h4>
                <ul style={{ listStyle: 'none', padding: 0, display: 'flex', flexDirection: 'column', gap: '0.8rem', fontSize: '0.9rem', color: '#d1d7dc' }}>
                  {course.includes && Array.isArray(course.includes) && course.includes.length > 0 ? (
                    course.includes.map((feature: string, idx: number) => (
                      <li key={idx} style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <Check size={16} color="#d1d7dc" /> {feature}
                      </li>
                    ))
                  ) : (
                    <>
                      <li style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <MonitorSmartphone size={16} /> فيديو متوفر عند الطلب مدته 40.5 من الساعات
                      </li>
                      <li style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <FileText size={16} /> 22 تمارين برمجة
                      </li>
                      <li style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <Infinity size={16} /> الوصول الكامل مدى الحياة
                      </li>
                      <li style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <MonitorSmartphone size={16} /> إمكانية وصول عبر الهاتف المحمول والتلفزيون
                      </li>
                      <li style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <Award size={16} /> شهادة إكمال
                      </li>
                    </>
                  )}
                </ul>
              </div>
              
              {!isEnrolled && (
                <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '1.5rem', justifyContent: 'space-around' }}>
                  <button style={{ background: 'transparent', border: 'none', color: '#fff', fontWeight: 'bold', textDecoration: 'underline', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.9rem' }}>مشاركة</button>
                  <button style={{ background: 'transparent', border: 'none', color: '#fff', fontWeight: 'bold', textDecoration: 'underline', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.9rem' }}>إهداء هذه الدورة</button>
                  <button style={{ background: 'transparent', border: 'none', color: '#fff', fontWeight: 'bold', textDecoration: 'underline', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.9rem' }}>تطبيق الكوبون</button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Free Lesson Preview Modal */}
      {previewLessonVideo && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.9)', zIndex: 1000, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ width: '100%', maxWidth: '900px', padding: '1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '1rem' }}>
              <button onClick={() => setPreviewLessonVideo(null)} style={{ background: 'rgba(255,255,255,0.1)', border: 'none', color: '#fff', padding: '0.5rem 1rem', borderRadius: '4px', cursor: 'pointer' }}>
                إغلاق (X)
              </button>
            </div>
            <div style={{ width: '100%', paddingTop: '56.25%', position: 'relative', background: '#000', overflow: 'hidden' }}>
              {previewLessonVideo.includes('iframe.mediadelivery.net') ? (
                <iframe
                  src={previewLessonVideo}
                  loading="lazy"
                  style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', border: 'none' }}
                  allow="accelerometer;gyroscope;autoplay;encrypted-media;picture-in-picture;"
                  allowFullScreen={true}
                ></iframe>
              ) : (
                <video 
                  src={previewLessonVideo} 
                  controls 
                  autoPlay
                  style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }}
                />
              )}
            </div>
          </div>
        </div>
      )}

      <style dangerouslySetInnerHTML={{__html: `
        /* Mobile Specific adjustments */
        @media (max-width: 900px) {
          .course-layout-container {
            flex-direction: column !important;
            padding: 1rem !important;
          }
          .floating-sidebar {
            width: 100% !important;
            order: -1;
          }
        }
      `}} />
    </div>
  );
}
