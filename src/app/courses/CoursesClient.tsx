'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Filter, BookOpen, Star, User, Clock, X, SlidersHorizontal, ArrowUpDown } from 'lucide-react';
import Link from 'next/link';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';

export default function CoursesClient({ initialCourses, categories, instructors }: { initialCourses: any[], categories: string[], instructors: string[] }) {
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

  // Trigger search when filters change
  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      fetchCourses();
    }, 400); // 400ms debounce
    return () => clearTimeout(delayDebounceFn);
  }, [q, category, type, price, rating, instructor, sort]);

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

  const clearFilters = () => {
    setQ('');
    setCategory('الكل');
    setType('الكل');
    setPrice('الكل');
    setRating('الكل');
    setInstructor('الكل');
    setSort('newest');
  };

  const SidebarContent = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      <div>
        <h3 style={{ fontSize: '1.1rem', fontWeight: 'bold', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <BookOpen size={18} color="var(--primary)" /> القسم
        </h3>
        <select value={category} onChange={e => setCategory(e.target.value)} className="input-field" style={{ padding: '0.8rem', cursor: 'pointer' }}>
          <option value="الكل">جميع الأقسام</option>
          {categories.map((c, i) => <option key={i} value={c}>{c}</option>)}
        </select>
      </div>

      <div>
        <h3 style={{ fontSize: '1.1rem', fontWeight: 'bold', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <User size={18} color="var(--primary)" /> المدرب
        </h3>
        <select value={instructor} onChange={e => setInstructor(e.target.value)} className="input-field" style={{ padding: '0.8rem', cursor: 'pointer' }}>
          <option value="الكل">جميع المدربين</option>
          {instructors.map((ins, i) => <option key={i} value={ins}>{ins}</option>)}
        </select>
      </div>

      <div>
        <h3 style={{ fontSize: '1.1rem', fontWeight: 'bold', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Filter size={18} color="var(--primary)" /> نوع الكورس
        </h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
          {['الكل', 'SKILL', 'CURRICULUM'].map((t) => (
            <label key={t} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
              <input type="radio" name="type" checked={type === t} onChange={() => setType(t)} style={{ accentColor: 'var(--primary)', width: '18px', height: '18px' }} />
              <span style={{ color: type === t ? '#fff' : 'rgba(255,255,255,0.7)', fontSize: '0.95rem' }}>
                {t === 'الكل' ? 'الجميع' : t === 'SKILL' ? 'كورس مهاري عام' : 'منهاج دراسي'}
              </span>
            </label>
          ))}
        </div>
      </div>

      <div>
        <h3 style={{ fontSize: '1.1rem', fontWeight: 'bold', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
           التسعير
        </h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
          {['الكل', 'free', 'paid'].map((p) => (
            <label key={p} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
              <input type="radio" name="price" checked={price === p} onChange={() => setPrice(p)} style={{ accentColor: 'var(--primary)', width: '18px', height: '18px' }} />
              <span style={{ color: price === p ? '#fff' : 'rgba(255,255,255,0.7)', fontSize: '0.95rem' }}>
                {p === 'الكل' ? 'الجميع' : p === 'free' ? 'مجاني' : 'مدفوع'}
              </span>
            </label>
          ))}
        </div>
      </div>

      <div>
        <h3 style={{ fontSize: '1.1rem', fontWeight: 'bold', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Star size={18} color="var(--primary)" /> التقييم
        </h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
          {['الكل', '4.5', '4.0', '3.5'].map((r) => (
            <label key={r} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
              <input type="radio" name="rating" checked={rating === r} onChange={() => setRating(r)} style={{ accentColor: 'var(--primary)', width: '18px', height: '18px' }} />
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', color: rating === r ? '#fff' : 'rgba(255,255,255,0.7)', fontSize: '0.95rem' }}>
                {r === 'الكل' ? 'أي تقييم' : <><Star size={14} fill="var(--warning)" color="var(--warning)" /> {r} فما فوق</>}
              </span>
            </label>
          ))}
        </div>
      </div>
      
      <button onClick={clearFilters} className="btn" style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', border: '1px solid rgba(239, 68, 68, 0.2)', padding: '0.8rem', width: '100%' }}>
        مسح جميع الفلاتر
      </button>
    </div>
  );

  return (
    <div style={{ minHeight: '100vh', background: '#050505', color: '#fff', paddingBottom: '5rem' }}>
      
      {/* Search Header */}
      <div style={{ background: 'linear-gradient(to bottom, rgba(203,161,83,0.1) 0%, transparent 100%)', borderBottom: '1px solid rgba(255,255,255,0.05)', padding: '3rem 5% 2rem', textAlign: 'center' }}>
        <h1 style={{ fontSize: '2.5rem', fontWeight: 'bold', marginBottom: '1.5rem' }}>
          البحث <span style={{ color: 'var(--primary)' }}>المتقدم</span>
        </h1>
        <div style={{ 
          display: 'flex', alignItems: 'center', background: 'rgba(0,0,0,0.5)', 
          maxWidth: '700px', margin: '0 auto', padding: '0.5rem', borderRadius: '30px', 
          border: '1px solid rgba(255,255,255,0.1)', backdropFilter: 'blur(10px)'
        }}>
          <div style={{ padding: '0 1rem', color: 'rgba(255,255,255,0.5)' }}>
            <Search size={24} />
          </div>
          <input 
            type="text" 
            placeholder="ابحث عن كورس، مدرب، أو مهارة..." 
            value={q}
            onChange={(e) => setQ(e.target.value)}
            style={{ 
              flex: 1, background: 'transparent', border: 'none', color: '#fff', 
              fontSize: '1.1rem', padding: '1rem 1rem 1rem 0', outline: 'none'
            }} 
          />
        </div>
      </div>

      <div style={{ maxWidth: '1400px', margin: '2rem auto', padding: '0 5%', display: 'flex', gap: '2rem', alignItems: 'flex-start' }}>
        
        {/* Desktop Sidebar */}
        <aside style={{ width: '280px', flexShrink: 0, background: 'rgba(255,255,255,0.02)', padding: '1.5rem', borderRadius: '24px', border: '1px solid rgba(255,255,255,0.05)', position: 'sticky', top: '100px' }} className="hide-on-mobile">
          <SidebarContent />
        </aside>

        {/* Mobile Filters Modal */}
        {isMobileFiltersOpen && (
          <div style={{ position: 'fixed', inset: 0, zIndex: 1000, display: 'flex' }} className="show-on-mobile">
            <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.8)' }} onClick={() => setIsMobileFiltersOpen(false)}></div>
            <motion.div 
              initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
              style={{ position: 'relative', background: '#0a0a0a', width: '85%', maxWidth: '350px', height: '100%', overflowY: 'auto', padding: '2rem', borderLeft: '1px solid rgba(255,255,255,0.1)' }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                <h2 style={{ fontSize: '1.3rem', fontWeight: 'bold' }}>الفلاتر المتقدمة</h2>
                <button onClick={() => setIsMobileFiltersOpen(false)} style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer' }}><X size={24} /></button>
              </div>
              <SidebarContent />
            </motion.div>
          </div>
        )}

        {/* Main Content Area */}
        <div style={{ flex: 1, width: '100%' }}>
          
          {/* Top Bar: Results count & Sort */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <button className="btn show-on-mobile" onClick={() => setIsMobileFiltersOpen(true)} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.6rem 1rem' }}>
                <SlidersHorizontal size={18} /> الفلاتر
              </button>
              <h2 style={{ fontSize: '1.2rem', fontWeight: 'bold', color: 'rgba(255,255,255,0.8)' }}>
                {loading ? 'جاري البحث...' : `وجدنا ${courses.length} كورس`}
              </h2>
            </div>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <ArrowUpDown size={18} color="rgba(255,255,255,0.5)" />
              <span style={{ color: 'rgba(255,255,255,0.5)' }}>ترتيب حسب:</span>
              <select value={sort} onChange={e => setSort(e.target.value)} className="input-field" style={{ padding: '0.6rem 1rem', width: 'auto', background: 'rgba(255,255,255,0.02)', border: 'none', fontWeight: 'bold' }}>
                <option value="newest">الأحدث إضافة</option>
                <option value="rating">الأعلى تقييماً</option>
                <option value="price_asc">السعر: الأقل للأعلى</option>
                <option value="price_desc">السعر: الأعلى للأقل</option>
              </select>
            </div>
          </div>

          {/* Courses Grid */}
          {courses.length === 0 && !loading ? (
            <div style={{ textAlign: 'center', padding: '5rem 2rem', background: 'rgba(255,255,255,0.02)', borderRadius: '24px', border: '1px dashed rgba(255,255,255,0.1)' }}>
              <BookOpen size={64} color="rgba(255,255,255,0.2)" style={{ margin: '0 auto 1.5rem auto' }} />
              <h3 style={{ fontSize: '1.8rem', marginBottom: '1rem' }}>لم نجد أي كورسات تطابق بحثك</h3>
              <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '1.1rem' }}>جرب تخفيف الفلاتر أو تغيير مصطلحات البحث.</p>
              <button onClick={clearFilters} className="btn btn-solid" style={{ marginTop: '1.5rem' }}>إظهار كل الكورسات</button>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1.5rem', opacity: loading ? 0.5 : 1, transition: 'opacity 0.3s' }}>
              <AnimatePresence>
                {courses.map((course, idx) => (
                  <motion.div
                    key={course.id}
                    layout
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    transition={{ duration: 0.3, delay: idx * 0.05 }}
                    className="glass-card"
                    style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden', padding: 0, cursor: 'pointer', borderRadius: '16px' }}
                  >
                    <Link href={`/courses/${course.id}`} style={{ textDecoration: 'none', display: 'flex', flexDirection: 'column', height: '100%' }}>
                      <div style={{ width: '100%', paddingTop: '56.25%', background: course.thumbnail ? `url(${course.thumbnail}) center/cover` : 'linear-gradient(45deg, #1e3a8a, #0f172a)', position: 'relative' }}>
                        <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', background: 'linear-gradient(to top, rgba(0,0,0,0.8), transparent)', opacity: 0.6 }} className="thumb-overlay" />
                        <div style={{ position: 'absolute', top: '1rem', right: '1rem', background: 'rgba(10,10,10,0.8)', padding: '0.3rem 0.8rem', borderRadius: '30px', fontSize: '0.8rem', fontWeight: 'bold', backdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.1)', color: 'var(--primary)' }}>
                          {course.category}
                        </div>
                      </div>
                      
                      <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', flex: 1, background: 'rgba(25,25,25,0.3)' }}>
                        <h3 style={{ fontSize: '1.2rem', fontWeight: 'bold', marginBottom: '0.8rem', lineHeight: 1.4, color: '#fff' }}>
                          {course.title}
                        </h3>
                        
                        <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.9rem', marginBottom: '1.5rem', flex: 1, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', lineHeight: 1.6 }}>
                          {course.description}
                        </p>
                        
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', paddingBottom: '1rem', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: 'rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                              {course.instructor.image ? (
                                <img src={course.instructor.image} alt={course.instructor.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                              ) : (
                                <User size={14} color="var(--primary)" />
                              )}
                            </div>
                            <span style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.8)' }}>{course.instructor.name}</span>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', background: 'rgba(245,158,11,0.1)', padding: '0.2rem 0.5rem', borderRadius: '6px' }}>
                            <Star size={12} color="var(--warning)" fill="var(--warning)" /> 
                            <span style={{ fontWeight: 'bold', color: 'var(--warning)', fontSize: '0.85rem' }}>{course.rating.toFixed(1)}</span>
                          </div>
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div>
                            {course.priceSYP > 0 ? (
                              <div style={{ display: 'flex', flexDirection: 'column' }}>
                                <span style={{ fontSize: '1.2rem', fontWeight: 'bold', color: 'var(--primary)' }}>{course.priceSYP.toLocaleString()} ل.س</span>
                              </div>
                            ) : (
                              <span style={{ fontSize: '1.2rem', fontWeight: 'bold', color: '#10b981' }}>مجاني بالكامل</span>
                            )}
                          </div>
                          <div style={{ color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.9rem', fontWeight: 'bold' }}>
                            التفاصيل <ChevronRight size={16} />
                          </div>
                        </div>
                      </div>
                    </Link>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}
        </div>
      </div>
      
      {/* Mobile styles logic */}
      <style dangerouslySetInnerHTML={{__html: `
        @media (max-width: 900px) {
          .hide-on-mobile { display: none !important; }
          .courses-grid { grid-template-columns: 1fr !important; }
        }
        @media (min-width: 901px) {
          .show-on-mobile { display: none !important; }
        }
      `}} />
    </div>
  );
}
