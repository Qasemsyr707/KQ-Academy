'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Map, Code, TrendingUp, BookOpen, CheckCircle, Lock, PlayCircle, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';

const iconMap: Record<string, any> = {
  Code: Code,
  TrendingUp: TrendingUp,
  Map: Map,
};

export default function CareerMappingPage() {
  const [paths, setPaths] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPath, setSelectedPath] = useState<any | null>(null);

  useEffect(() => {
    fetchPaths();
  }, []);

  const fetchPaths = async () => {
    try {
      const res = await fetch('/api/career-paths');
      if (res.ok) {
        const data = await res.json();
        setPaths(data);
      }
    } catch (e) {
      console.error('Failed to fetch career paths', e);
    }
    setLoading(false);
  };

  return (
    <div style={{ minHeight: '100vh', background: '#050505', color: '#fff', padding: '4rem 2rem', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '4rem' }}>
          <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring' }} style={{ width: '80px', height: '80px', background: 'rgba(203, 161, 83, 0.1)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem auto' }}>
            <Map size={40} color="var(--primary)" />
          </motion.div>
          <h1 style={{ fontSize: '3rem', fontWeight: 'bold', marginBottom: '1rem', background: 'linear-gradient(to right, #fff, var(--primary))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            الخرائط المهنية
          </h1>
          <p style={{ fontSize: '1.2rem', color: 'rgba(255,255,255,0.6)', maxWidth: '600px', margin: '0 auto' }}>
            اختر مسارك المهني وابدأ رحلتك التعليمية بخطوات واضحة ومرتبة لتصل إلى هدفك بكل ثقة.
          </p>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '4rem', color: 'rgba(255,255,255,0.5)' }}>جاري تحميل المسارات...</div>
        ) : (
          <AnimatePresence mode="wait">
            {!selectedPath ? (
              <motion.div 
                key="list"
                initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
                style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '2rem' }}
              >
                {paths.map((path) => {
                  const IconComponent = iconMap[path.icon] || Map;
                  return (
                    <motion.div 
                      whileHover={{ scale: 1.03 }}
                      key={path.id} 
                      onClick={() => setSelectedPath(path)}
                      style={{ background: '#111', padding: '2rem', borderRadius: '24px', border: '1px solid rgba(255,255,255,0.05)', cursor: 'pointer', position: 'relative', overflow: 'hidden' }}
                    >
                      <div style={{ position: 'absolute', top: 0, right: 0, width: '100px', height: '100px', background: 'var(--primary)', filter: 'blur(80px)', opacity: 0.2 }} />
                      
                      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
                        <div style={{ width: '60px', height: '60px', background: 'rgba(203, 161, 83, 0.1)', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <IconComponent size={32} color="var(--primary)" />
                        </div>
                        <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>{path.title}</h2>
                      </div>
                      
                      <p style={{ color: 'rgba(255,255,255,0.6)', marginBottom: '2rem', lineHeight: 1.6 }}>{path.description}</p>
                      
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '1.5rem' }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'rgba(255,255,255,0.8)' }}>
                          <BookOpen size={18} /> {path.courses.length} كورسات
                        </span>
                        <span style={{ color: 'var(--primary)', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          عرض المسار <ArrowLeft size={16} />
                        </span>
                      </div>
                    </motion.div>
                  );
                })}
              </motion.div>
            ) : (
              <motion.div 
                key="detail"
                initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
              >
                <button onClick={() => setSelectedPath(null)} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'none', border: 'none', color: 'rgba(255,255,255,0.6)', cursor: 'pointer', marginBottom: '2rem', fontSize: '1.1rem' }}>
                   العودة للمسارات
                </button>

                <div style={{ background: '#111', padding: '3rem', borderRadius: '24px', border: '1px solid rgba(255,255,255,0.05)', marginBottom: '2rem' }}>
                  <h2 style={{ fontSize: '2.5rem', fontWeight: 'bold', marginBottom: '1rem' }}>{selectedPath.title}</h2>
                  <p style={{ fontSize: '1.2rem', color: 'rgba(255,255,255,0.6)', maxWidth: '800px' }}>{selectedPath.description}</p>
                </div>

                {/* Roadmap Timeline */}
                <div style={{ position: 'relative', padding: '2rem 0' }}>
                  {/* Timeline vertical line */}
                  <div style={{ position: 'absolute', top: 0, bottom: 0, right: '50px', width: '4px', background: 'rgba(255,255,255,0.1)', borderRadius: '2px' }} />

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '3rem' }}>
                    {selectedPath.courses.map((item: any, index: number) => {
                      const course = item.course;
                      const isFirst = index === 0;
                      return (
                        <div key={course.id} style={{ display: 'flex', gap: '2rem', position: 'relative' }}>
                          {/* Timeline Node */}
                          <div style={{ zIndex: 2, width: '40px', height: '40px', borderRadius: '50%', background: isFirst ? 'var(--primary)' : '#222', border: isFirst ? 'none' : '2px solid rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginRight: '32px' }}>
                            {isFirst ? <PlayCircle size={24} color="#000" /> : <Lock size={20} color="rgba(255,255,255,0.5)" />}
                          </div>

                          {/* Course Card */}
                          <div style={{ flex: 1, background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '16px', overflow: 'hidden', display: 'flex', transition: 'all 0.3s' }} className="hover:bg-white/5">
                            {course.thumbnail && (
                              <div style={{ width: '250px', position: 'relative' }}>
                                <Image src={course.thumbnail} alt={course.title} fill style={{ objectFit: 'cover' }} />
                                {!isFirst && (
                                  <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <Lock size={32} color="#fff" />
                                  </div>
                                )}
                              </div>
                            )}
                            <div style={{ padding: '2rem', flex: 1 }}>
                              <span style={{ display: 'inline-block', background: 'rgba(203, 161, 83, 0.1)', color: 'var(--primary)', padding: '0.3rem 0.8rem', borderRadius: '20px', fontSize: '0.8rem', fontWeight: 'bold', marginBottom: '1rem' }}>الخطوة {index + 1}</span>
                              <h3 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '1rem' }}>{course.title}</h3>
                              <p style={{ color: 'rgba(255,255,255,0.6)', marginBottom: '1.5rem' }}>{course.description}</p>
                              
                              <Link href={`/courses/${course.id}`} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', background: isFirst ? 'var(--primary)' : 'rgba(255,255,255,0.1)', color: isFirst ? '#000' : '#fff', padding: '0.8rem 2rem', borderRadius: '8px', fontWeight: 'bold', textDecoration: 'none' }}>
                                {isFirst ? 'ابدأ الآن' : 'عرض التفاصيل'}
                              </Link>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        )}
      </div>

      <style jsx global>{`
        .hover\\:bg-white\\/5:hover { background-color: rgba(255,255,255,0.05) !important; }
      `}</style>
    </div>
  );
}
