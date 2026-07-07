'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Filter, BookOpen, Star, User, ChevronRight, PlayCircle, Clock } from 'lucide-react';
import Link from 'next/link';

export default function CoursesClient({ initialCourses }: { initialCourses: any[] }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [activeCategory, setActiveCategory] = useState('الكل');

  const categories = ['الكل', ...Array.from(new Set(initialCourses.map(c => c.category)))];

  const filteredCourses = initialCourses.filter(course => {
    const matchesSearch = course.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          (course.description && course.description.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesCategory = activeCategory === 'الكل' || course.category === activeCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div style={{ minHeight: '100vh', background: '#050505', color: '#fff', paddingBottom: '5rem' }}>
      
      {/* Hero Section */}
      <div style={{ 
        background: 'radial-gradient(circle at top right, rgba(203,161,83,0.15) 0%, transparent 60%)', 
        padding: '6rem 5% 4rem', 
        textAlign: 'center',
        borderBottom: '1px solid rgba(255,255,255,0.05)'
      }}>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
          <h1 style={{ fontSize: 'clamp(2.5rem, 5vw, 4rem)', fontWeight: 'bold', marginBottom: '1.5rem', lineHeight: 1.2 }}>
            اكتشف شغفك مع <span style={{ background: 'linear-gradient(to right, #fff, var(--primary))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>أفضل الكورسات</span>
          </h1>
          <p style={{ fontSize: '1.2rem', color: 'rgba(255,255,255,0.7)', maxWidth: '700px', margin: '0 auto 3rem' }}>
            منصة تعليمية متكاملة توفر لك أحدث المناهج والكورسات المهنية المصممة خصيصاً لسوق العمل بأعلى جودة.
          </p>

          {/* Search Bar */}
          <div style={{ 
            display: 'flex', alignItems: 'center', background: 'rgba(255,255,255,0.05)', 
            maxWidth: '600px', margin: '0 auto', padding: '0.5rem', borderRadius: '20px', 
            border: '1px solid rgba(255,255,255,0.1)', backdropFilter: 'blur(10px)'
          }}>
            <div style={{ padding: '0 1rem', color: 'rgba(255,255,255,0.5)' }}>
              <Search size={24} />
            </div>
            <input 
              type="text" 
              placeholder="ابحث عن كورس، مدرب، أو تقنية..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{ 
                flex: 1, background: 'transparent', border: 'none', color: '#fff', 
                fontSize: '1.1rem', padding: '1rem', outline: 'none'
              }} 
            />
          </div>
        </motion.div>
      </div>

      <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '3rem 5%' }}>
        {/* Filters */}
        <div style={{ display: 'flex', gap: '1rem', marginBottom: '3rem', overflowX: 'auto', paddingBottom: '1rem' }}>
          {categories.map((cat, idx) => (
            <button
              key={idx}
              onClick={() => setActiveCategory(cat)}
              style={{
                padding: '0.8rem 1.5rem',
                borderRadius: '30px',
                border: `1px solid ${activeCategory === cat ? 'var(--primary)' : 'rgba(255,255,255,0.1)'}`,
                background: activeCategory === cat ? 'var(--primary)' : 'rgba(255,255,255,0.02)',
                color: activeCategory === cat ? '#000' : '#fff',
                fontWeight: 'bold',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                transition: 'all 0.3s'
              }}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Courses Grid */}
        {filteredCourses.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '5rem', background: 'rgba(255,255,255,0.02)', borderRadius: '24px', border: '1px dashed rgba(255,255,255,0.1)' }}>
            <BookOpen size={64} color="rgba(255,255,255,0.2)" style={{ margin: '0 auto 1.5rem auto' }} />
            <h3 style={{ fontSize: '1.8rem', marginBottom: '1rem' }}>لم نجد أي كورسات تطابق بحثك</h3>
            <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '1.1rem' }}>جرب البحث بكلمات أخرى أو تصفح الأقسام المختلفة.</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: '2.5rem' }}>
            <AnimatePresence>
              {filteredCourses.map((course, idx) => (
                <motion.div
                  key={course.id}
                  layout
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ duration: 0.4, delay: idx * 0.05 }}
                  className="glass-card"
                  style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden', padding: 0, cursor: 'pointer', borderRadius: '24px' }}
                >
                  <Link href={`/courses/${course.id}`} style={{ textDecoration: 'none', display: 'flex', flexDirection: 'column', height: '100%' }}>
                    {/* Thumbnail */}
                    <div style={{ width: '100%', paddingTop: '56.25%', background: course.thumbnail ? `url(${course.thumbnail}) center/cover` : 'linear-gradient(45deg, #1e3a8a, #0f172a)', position: 'relative' }}>
                      <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', background: 'linear-gradient(to top, rgba(0,0,0,0.8), transparent)', opacity: 0.6, transition: 'opacity 0.3s' }} className="thumb-overlay" />
                      
                      <div style={{ position: 'absolute', top: '1.2rem', right: '1.2rem', background: 'rgba(10,10,10,0.8)', padding: '0.4rem 1rem', borderRadius: '30px', fontSize: '0.85rem', fontWeight: 'bold', backdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.1)', color: 'var(--primary)' }}>
                        {course.category}
                      </div>

                      <div style={{ position: 'absolute', bottom: '1.2rem', left: '1.2rem', display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(10,10,10,0.8)', padding: '0.4rem 0.8rem', borderRadius: '12px', fontSize: '0.85rem', backdropFilter: 'blur(10px)' }}>
                        <Clock size={14} color="#a1a1aa" />
                        <span style={{ color: '#fff' }}>12 ساعة</span>
                      </div>
                    </div>
                    
                    {/* Content */}
                    <div style={{ padding: '2rem', display: 'flex', flexDirection: 'column', flex: 1, background: 'rgba(25,25,25,0.3)' }}>
                      <h3 style={{ fontSize: '1.4rem', fontWeight: 'bold', marginBottom: '1rem', lineHeight: 1.4, color: '#fff' }}>
                        {course.title}
                      </h3>
                      
                      <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.95rem', marginBottom: '1.5rem', flex: 1, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', lineHeight: 1.6 }}>
                        {course.description || 'كورس احترافي يقدم لك المهارات اللازمة للإبداع في هذا المجال.'}
                      </p>
                      
                      {/* Stats */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', paddingBottom: '1.5rem', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                          <div style={{ width: '30px', height: '30px', borderRadius: '50%', background: 'rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                            {course.instructor.image ? (
                              <img src={course.instructor.image} alt={course.instructor.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            ) : (
                              <User size={16} color="var(--primary)" />
                            )}
                          </div>
                          <span style={{ fontSize: '0.9rem', color: 'rgba(255,255,255,0.9)' }}>{course.instructor.name}</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', background: 'rgba(245,158,11,0.1)', padding: '0.3rem 0.6rem', borderRadius: '8px' }}>
                          <Star size={14} color="var(--warning)" fill="var(--warning)" /> 
                          <span style={{ fontWeight: 'bold', color: 'var(--warning)', fontSize: '0.9rem' }}>{course.rating.toFixed(1)}</span>
                          <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.8rem' }}>({course._count.reviews})</span>
                        </div>
                      </div>

                      {/* Footer & Price */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '1.5rem', fontWeight: 900, color: '#fff' }}>
                          {course.priceSYP > 0 ? (
                            <>{course.priceSYP.toLocaleString()} <span style={{ fontSize: '0.9rem', color: 'rgba(255,255,255,0.5)', fontWeight: 'normal' }}>ل.س</span></>
                          ) : course.price > 0 ? (
                            <>${course.price}</>
                          ) : (
                            <span style={{ color: 'var(--success)' }}>مجاني</span>
                          )}
                        </span>
                        
                        <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.3s' }} className="arrow-btn">
                          <ChevronRight size={20} color="var(--primary)" style={{ transform: 'rotate(180deg)' }} />
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

      <style dangerouslySetInnerHTML={{__html: `
        .glass-card:hover .thumb-overlay { opacity: 0.3 !important; }
        .glass-card:hover .arrow-btn { background: var(--primary) !important; }
        .glass-card:hover .arrow-btn svg { stroke: #000 !important; }
      `}} />
    </div>
  );
}
