'use client';

import { useState } from 'react';
import { Star, Clock, User, CheckCircle, PlayCircle, ShieldCheck, ChevronDown, Award, Infinity, Video, HelpCircle, BookOpen } from 'lucide-react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import ReviewButton from './ReviewButton';

export default function CourseDetailsClient({ course, isEnrolled }: { course: any, isEnrolled: boolean }) {
  const [activeChapter, setActiveChapter] = useState<string | null>(course.chapters[0]?.id || null);

  const faqs = [
    { q: 'متى يمكنني البدء في الكورس؟', a: 'يمكنك البدء فور إتمام عملية الشراء. جميع الدروس المسجلة ستكون متاحة لك مباشرة.' },
    { q: 'هل يمكنني استرداد أموالي إذا لم يعجبني الكورس؟', a: 'نعم، نحن نقدم ضمان استرداد الأموال خلال 14 يوماً إذا لم تكن راضياً بنسبة 100% عن المحتوى.' },
    { q: 'هل سأحصل على شهادة بعد الإتمام؟', a: 'بالتأكيد، عند إتمام جميع الدروس واجتياز الاختبارات القصيرة، ستحصل على شهادة معتمدة يمكن إضافتها للسيرة الذاتية.' },
    { q: 'هل الكورس متاح مدى الحياة؟', a: 'نعم، بمجرد شرائك للكورس ستحصل على وصول غير محدود مدى الحياة لجميع التحديثات والدروس المستقبلية الخاصة بهذا الكورس.' }
  ];

  return (
    <div style={{ minHeight: '100vh', background: '#050505', color: '#fff' }}>
      
      {/* Hero Section with Glassmorphism */}
      <div style={{ 
        position: 'relative', 
        padding: '6rem 5% 8rem', 
        background: course.thumbnail ? `url(${course.thumbnail}) center/cover fixed` : 'linear-gradient(135deg, #1e3a8a, #050505)',
        borderBottom: '1px solid rgba(255,255,255,0.05)'
      }}>
        <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', background: 'linear-gradient(to right, rgba(5,5,5,1) 30%, rgba(5,5,5,0.7) 100%)' }} />
        
        <div style={{ maxWidth: '1400px', margin: '0 auto', position: 'relative', zIndex: 1, display: 'flex', gap: '4rem', flexWrap: 'wrap' }}>
          {/* Main Info */}
          <motion.div initial={{ opacity: 0, x: -30 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.6 }} style={{ flex: '1 1 600px' }}>
            <div style={{ background: 'rgba(255,255,255,0.1)', padding: '0.4rem 1rem', borderRadius: '30px', display: 'inline-block', marginBottom: '1.5rem', fontWeight: 'bold', backdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.2)', color: 'var(--primary)' }}>
              {course.category}
            </div>
            
            <h1 style={{ fontSize: 'clamp(2.5rem, 4vw, 3.5rem)', fontWeight: 900, marginBottom: '1.5rem', lineHeight: 1.2 }}>
              {course.title}
            </h1>
            
            <p style={{ fontSize: '1.2rem', color: 'rgba(255,255,255,0.8)', marginBottom: '2rem', lineHeight: 1.8, maxWidth: '800px' }}>
              {course.description || 'وصف الكورس غير متوفر حالياً.'}
            </p>
            
            <div style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap', marginBottom: '2rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <div style={{ display: 'flex' }}>
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} size={18} fill={i < Math.round(course.rating) ? 'var(--warning)' : 'transparent'} color={i < Math.round(course.rating) ? 'var(--warning)' : 'rgba(255,255,255,0.3)'} />
                  ))}
                </div>
                <span style={{ fontSize: '1.1rem', fontWeight: 'bold', color: 'var(--warning)' }}>{course.rating.toFixed(1)}</span>
                <span style={{ color: 'rgba(255,255,255,0.5)', textDecoration: 'underline' }}>({course.reviews?.length || 0} تقييم)</span>
              </div>
              
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'rgba(255,255,255,0.8)' }}>
                <User size={18} color="var(--primary)" /> 
                المُدرب: <span style={{ fontWeight: 'bold', color: '#fff' }}>{(course.instructor as any)?.name}</span>
              </div>
            </div>
          </motion.div>
          
          {/* Floating Checkout Box */}
          <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.2 }} style={{ flex: '1 1 350px' }}>
            <div className="glass-card" style={{ padding: '2.5rem', borderRadius: '24px', border: '1px solid rgba(255,255,255,0.1)', position: 'sticky', top: '100px', background: 'rgba(15,15,15,0.8)', backdropFilter: 'blur(20px)', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)' }}>
              {/* Box Video Preview */}
              <div style={{ width: '100%', paddingTop: '56.25%', background: '#000', borderRadius: '16px', position: 'relative', overflow: 'hidden', marginBottom: '2rem', cursor: 'pointer' }} className="group">
                <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.4)', transition: 'background 0.3s' }}>
                  <PlayCircle size={64} color="var(--primary)" style={{ filter: 'drop-shadow(0 0 10px rgba(0,0,0,0.5))' }} />
                </div>
                <div style={{ position: 'absolute', bottom: '1rem', width: '100%', textAlign: 'center', fontWeight: 'bold' }}>
                  معاينة الكورس
                </div>
              </div>
              
              <h2 style={{ fontSize: '2.5rem', fontWeight: 900, marginBottom: '0.5rem', color: '#fff', textAlign: 'center' }}>
                 {course.priceSYP > 0 ? `${course.priceSYP.toLocaleString()} ل.س` : (course.price > 0 ? `$${course.price}` : 'مجاني')}
              </h2>
              <div style={{ textAlign: 'center', color: 'var(--success)', marginBottom: '2rem', fontWeight: 'bold' }}>ضمان استرداد الأموال لمدة 14 يوماً</div>

              {isEnrolled ? (
                 <Link href={`/courses/${course.id}/learn`} className="btn btn-solid" style={{ width: '100%', padding: '1.2rem', fontSize: '1.2rem', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem' }}>
                    <PlayCircle size={24} /> إكمال التعلم
                 </Link>
              ) : (
                <Link href={`/checkout?courseId=${course.id}`} className="btn btn-solid" style={{ width: '100%', padding: '1.2rem', fontSize: '1.2rem', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem' }}>
                  <ShieldCheck size={24} /> اشترك الآن وابدأ فوراً
                </Link>
              )}

              <div style={{ marginTop: '2rem' }}>
                <h4 style={{ fontWeight: 'bold', marginBottom: '1rem', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '0.5rem' }}>هذا الكورس يتضمن:</h4>
                <ul style={{ listStyle: 'none', padding: 0, display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <li style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', color: 'rgba(255,255,255,0.8)' }}>
                    <Video size={20} color="var(--primary)" /> 12 ساعة فيديو مسجل بجودة عالية
                  </li>
                  <li style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', color: 'rgba(255,255,255,0.8)' }}>
                    <Infinity size={20} color="var(--primary)" /> وصول غير محدود مدى الحياة
                  </li>
                  <li style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', color: 'rgba(255,255,255,0.8)' }}>
                    <Award size={20} color="var(--primary)" /> شهادة إتمام معتمدة
                  </li>
                </ul>
              </div>
            </div>
          </motion.div>
        </div>
      </div>

      <div style={{ maxWidth: '1400px', margin: '-4rem auto 0', padding: '0 5%', position: 'relative', zIndex: 2, display: 'flex', gap: '4rem', flexWrap: 'wrap' }}>
        
        {/* Main Content Area */}
        <div style={{ flex: '1 1 700px' }}>
          
          {/* Curriculum Section */}
          <div style={{ background: '#0a0a0a', padding: '3rem', borderRadius: '24px', border: '1px solid rgba(255,255,255,0.05)', marginBottom: '3rem' }}>
            <h2 style={{ fontSize: '2rem', fontWeight: 'bold', marginBottom: '2rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <BookOpen color="var(--primary)" /> منهج الكورس
            </h2>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {course.chapters?.length === 0 ? (
                <p style={{ color: 'rgba(255,255,255,0.5)' }}>لم يتم إضافة الدروس بعد.</p>
              ) : (
                course.chapters?.map((chapter: any) => (
                  <div key={chapter.id} style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '16px', overflow: 'hidden' }}>
                    <button 
                      onClick={() => setActiveChapter(activeChapter === chapter.id ? null : chapter.id)}
                      style={{ width: '100%', padding: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'transparent', border: 'none', color: '#fff', cursor: 'pointer', textAlign: 'right' }}
                    >
                      <h4 style={{ fontSize: '1.2rem', fontWeight: 'bold', margin: 0 }}>{chapter.title}</h4>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <span style={{ fontSize: '0.9rem', color: 'rgba(255,255,255,0.5)' }}>{chapter.lessons?.length || 0} دروس</span>
                        <ChevronDown size={20} style={{ transform: activeChapter === chapter.id ? 'rotate(180deg)' : 'rotate(0)', transition: 'transform 0.3s' }} />
                      </div>
                    </button>
                    
                    <AnimatePresence>
                      {activeChapter === chapter.id && (
                        <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} style={{ overflow: 'hidden' }}>
                          <div style={{ padding: '0 1.5rem 1.5rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                            {chapter.lessons?.map((lesson: any) => (
                              <div key={lesson.id} style={{ padding: '1rem', background: 'rgba(0,0,0,0.3)', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                <PlayCircle size={18} color="rgba(255,255,255,0.5)" />
                                <span style={{ flex: 1, color: 'rgba(255,255,255,0.8)' }}>{lesson.title}</span>
                                {lesson.isLive && <span style={{ background: 'var(--danger)', fontSize: '0.7rem', padding: '0.2rem 0.5rem', borderRadius: '4px', fontWeight: 'bold' }}>بث مباشر</span>}
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

          {/* Instructor Section */}
          <div style={{ background: '#0a0a0a', padding: '3rem', borderRadius: '24px', border: '1px solid rgba(255,255,255,0.05)', marginBottom: '3rem' }}>
            <h2 style={{ fontSize: '2rem', fontWeight: 'bold', marginBottom: '2rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <User color="var(--primary)" /> عن المدرب
            </h2>
            <div style={{ display: 'flex', gap: '2rem', alignItems: 'center', flexWrap: 'wrap' }}>
              <div style={{ width: '120px', height: '120px', borderRadius: '50%', background: 'rgba(255,255,255,0.1)', overflow: 'hidden' }}>
                 {(course.instructor as any)?.image ? (
                   <img src={(course.instructor as any).image} alt={(course.instructor as any).name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                 ) : (
                   <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><User size={48} color="rgba(255,255,255,0.5)" /></div>
                 )}
              </div>
              <div style={{ flex: 1 }}>
                <h3 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>{(course.instructor as any)?.name}</h3>
                <p style={{ color: 'rgba(255,255,255,0.7)', lineHeight: 1.6 }}>مدرب محترف ومهندس برمجيات ذو خبرة تفوق الـ 10 سنوات في بناء تطبيقات الويب واسعة النطاق لشركات عالمية. أهدافه دائمًا نقل المعرفة التقنية بأبسط صورة ممكنة.</p>
              </div>
            </div>
          </div>

          {/* FAQs Section */}
          <div style={{ background: '#0a0a0a', padding: '3rem', borderRadius: '24px', border: '1px solid rgba(255,255,255,0.05)', marginBottom: '3rem' }}>
            <h2 style={{ fontSize: '2rem', fontWeight: 'bold', marginBottom: '2rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <HelpCircle color="var(--primary)" /> الأسئلة الشائعة
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {faqs.map((faq, idx) => (
                <div key={idx} style={{ padding: '1.5rem', background: 'rgba(255,255,255,0.02)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
                  <h4 style={{ fontSize: '1.1rem', fontWeight: 'bold', marginBottom: '0.5rem', color: '#fff' }}>{faq.q}</h4>
                  <p style={{ color: 'rgba(255,255,255,0.6)', lineHeight: 1.6, margin: 0 }}>{faq.a}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Reviews Section */}
          <div style={{ background: '#0a0a0a', padding: '3rem', borderRadius: '24px', border: '1px solid rgba(255,255,255,0.05)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
              <h2 style={{ fontSize: '2rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0 }}>
                <Star color="var(--warning)" fill="var(--warning)" /> آراء الطلاب ({course.reviews?.length || 0})
              </h2>
              {isEnrolled && <ReviewButton courseId={course.id} />}
            </div>

            {course.reviews?.length === 0 ? (
              <p style={{ color: 'rgba(255,255,255,0.5)', textAlign: 'center', padding: '2rem' }}>لا توجد تقييمات حتى الآن. كن أول من يشارك رأيه بعد إتمام الكورس!</p>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1.5rem' }}>
                {course.reviews?.map((review: any) => (
                  <div key={review.id} style={{ background: 'rgba(255,255,255,0.02)', padding: '1.5rem', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.05)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
                        <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'rgba(255,255,255,0.1)', overflow: 'hidden' }}>
                          {review.user?.image ? (
                            <img src={review.user.image} alt={review.user.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          ) : (
                            <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><User size={20} color="rgba(255,255,255,0.5)" /></div>
                          )}
                        </div>
                        <div>
                          <h4 style={{ fontWeight: 'bold', fontSize: '1rem', marginBottom: '0.1rem' }}>{review.user?.name}</h4>
                          <span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)' }}>{new Date(review.createdAt).toLocaleDateString('ar-SA')}</span>
                        </div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '0.2rem', marginBottom: '0.8rem' }}>
                      {[...Array(5)].map((_, i) => (
                        <Star key={i} size={14} fill={i < review.rating ? 'var(--warning)' : 'transparent'} color={i < review.rating ? 'var(--warning)' : 'rgba(255,255,255,0.2)'} />
                      ))}
                    </div>
                    <p style={{ color: 'rgba(255,255,255,0.8)', lineHeight: 1.6, fontSize: '0.95rem' }}>"{review.comment}"</p>
                  </div>
                ))}
              </div>
            )}
          </div>
          
        </div>

        {/* Dummy sidebar placeholder to maintain gap in flex */}
        <div style={{ flex: '1 1 350px' }}></div>
      </div>
    </div>
  );
}
