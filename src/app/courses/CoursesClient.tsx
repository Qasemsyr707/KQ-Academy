'use client';

import { motion } from 'framer-motion';
import { Search, Filter, Star, Clock, User, ChevronLeft } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';

export default function CoursesClient({ initialCourses }: { initialCourses: any[] }) {
  const [activeCategory, setActiveCategory] = useState('الكل');

  const categories = ['الكل', 'برمجة وتطوير', 'ذكاء اصطناعي', 'إدارة أعمال', 'تصميم وإبداع', 'تسويق رقمي'];

  const filteredCourses = activeCategory === 'الكل' ? initialCourses : initialCourses.filter(c => c.category === activeCategory);

  return (
    <div className="container" style={{ padding: '2rem 5%' }}>
      {/* Header & Search */}
      <motion.div 
        style={{ textAlign: 'center', marginBottom: '3rem' }}
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <h1 style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>استكشف <span style={{ color: 'var(--primary)' }}>مستقبلك</span></h1>
        <p style={{ opacity: 0.8, fontSize: '1.1rem', maxWidth: '600px', margin: '0 auto 2rem auto' }}>
          انضم إلى آلاف الطلاب في سوريا واكتسب مهارات سوق العمل الحقيقية مع أفضل الخبراء.
        </p>

        <div style={{ display: 'flex', gap: '1rem', maxWidth: '700px', margin: '0 auto' }}>
          <div style={{ flex: 1, position: 'relative' }}>
            <Search size={20} style={{ position: 'absolute', right: '1rem', top: '50%', transform: 'translateY(-50%)', opacity: 0.5 }} />
            <input 
              type="text" 
              placeholder="عن ماذا تبحث اليوم؟ (مثال: برمجة، تسويق، تصميم)..." 
              style={{ width: '100%', padding: '1rem 3rem 1rem 1rem', borderRadius: '12px', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-light)', color: '#fff', fontSize: '1rem' }}
            />
          </div>
          <button className="btn btn-solid" style={{ padding: '0 2rem' }}>بحث</button>
        </div>
      </motion.div>

      {/* Categories */}
      <motion.div 
        style={{ display: 'flex', gap: '1rem', overflowX: 'auto', paddingBottom: '1rem', marginBottom: '2rem' }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', opacity: 0.8, marginLeft: '1rem' }}>
          <Filter size={18} /> التصنيفات:
        </div>
        {categories.map((cat, idx) => (
          <button 
            key={idx}
            onClick={() => setActiveCategory(cat)}
            style={{ 
              background: activeCategory === cat ? 'var(--primary)' : 'rgba(255,255,255,0.05)',
              color: activeCategory === cat ? '#000' : '#fff',
              border: `1px solid ${activeCategory === cat ? 'var(--primary)' : 'var(--border-light)'}`,
              padding: '0.5rem 1.5rem',
              borderRadius: '20px',
              cursor: 'pointer',
              fontWeight: activeCategory === cat ? 600 : 400,
              whiteSpace: 'nowrap',
              transition: 'all 0.3s'
            }}
          >
            {cat}
          </button>
        ))}
      </motion.div>

      {/* Course Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '2rem' }}>
        {filteredCourses.map((course, idx) => (
          <motion.div 
            key={course.id}
            className="glass-card"
            style={{ padding: '0', overflow: 'hidden', position: 'relative', display: 'flex', flexDirection: 'column' }}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 * idx }}
          >
            {/* Course Thumbnail placeholder */}
            <div style={{ height: '180px', background: course.thumbnail || course.image || 'linear-gradient(135deg, #1e3a8a 0%, #0f172a 100%)', position: 'relative' }}>
              {course.featured && (
                <span style={{ position: 'absolute', top: '1rem', right: '1rem', background: 'var(--primary)', color: '#000', padding: '0.2rem 0.8rem', borderRadius: '4px', fontSize: '0.8rem', fontWeight: 'bold' }}>
                  الأكثر مبيعاً 🔥
                </span>
              )}
            </div>

            <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', flex: 1 }}>
              <span style={{ color: 'var(--primary)', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.5rem' }}>{course.category}</span>
              <h3 style={{ fontSize: '1.2rem', marginBottom: '1rem', lineHeight: '1.4' }}>{course.title}</h3>
              
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', opacity: 0.8, fontSize: '0.9rem', marginBottom: '1.5rem' }}>
                <User size={16} /> {course.instructor?.name || course.instructor || 'مدرب'}
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.9rem', marginBottom: '1.5rem', paddingBottom: '1.5rem', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', color: 'var(--warning)' }}>
                  <Star size={16} fill="var(--warning)" /> <span style={{ fontWeight: 600 }}>{course.rating}</span> <span style={{ opacity: 0.5, color: '#fff' }}>({course.students || 0})</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', opacity: 0.8 }}>
                  <Clock size={16} /> {course.duration || 'غير محدد'}
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'auto' }}>
                <span style={{ fontSize: '1.3rem', fontWeight: 'bold' }}>{course.price.toLocaleString()} SYP</span>
                <Link href="/checkout" style={{ background: 'rgba(255,255,255,0.1)', padding: '0.5rem 1rem', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '0.3rem', transition: 'background 0.3s' }} className="hover:bg-primary hover:text-black">
                  شراء <ChevronLeft size={16} />
                </Link>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
      
      {filteredCourses.length === 0 && (
        <div style={{ textAlign: 'center', padding: '4rem', opacity: 0.5 }}>
          <p>عذراً، لا يوجد دورات متاحة في هذا التصنيف حالياً.</p>
        </div>
      )}
    </div>
  );
}
