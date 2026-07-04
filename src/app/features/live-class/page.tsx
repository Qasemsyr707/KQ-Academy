'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Video, Calendar, Clock, User, ChevronRight, PlayCircle, Users } from 'lucide-react';
import Link from 'next/link';

const mockLiveClasses = [
  {
    id: 1,
    title: 'مراجعة نهائية - مادة الفيزياء',
    instructor: 'د. خالد محمد',
    date: 'غداً، 8:00 مساءً',
    status: 'UPCOMING',
    students: 150,
    image: 'https://images.unsplash.com/photo-1635070041078-e363dbe005cb?w=600&h=400&fit=crop'
  },
  {
    id: 2,
    title: 'حل أسئلة دورات الرياضيات',
    instructor: 'م. أحمد السوري',
    date: 'الآن',
    status: 'LIVE',
    students: 320,
    image: 'https://images.unsplash.com/photo-1509228468518-180dd4864904?w=600&h=400&fit=crop'
  },
  {
    id: 3,
    title: 'مقدمة في الكيمياء العضوية',
    instructor: 'د. سارة الأحمد',
    date: 'تم البث قبل يومين',
    status: 'RECORDED',
    students: 850,
    image: 'https://images.unsplash.com/photo-1532094349884-543bc11b234d?w=600&h=400&fit=crop'
  }
];

export default function LiveClassPage() {
  const [activeTab, setActiveTab] = useState<'ALL' | 'LIVE' | 'UPCOMING' | 'RECORDED'>('ALL');

  const filteredClasses = mockLiveClasses.filter(c => activeTab === 'ALL' || c.status === activeTab);

  return (
    <div style={{ minHeight: '100vh', background: '#050505', color: '#fff', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      
      {/* Navbar */}
      <div style={{ padding: '1.5rem 2rem', background: '#111', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', gap: '1rem', position: 'sticky', top: 0, zIndex: 50 }}>
        <Link href="/dashboard" style={{ color: 'rgba(255,255,255,0.5)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
          لوحة التحكم <ChevronRight size={16} />
        </Link>
        <div style={{ width: '40px', height: '40px', background: 'rgba(244, 63, 94, 0.1)', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Video size={24} color="#f43f5e" />
        </div>
        <h1 style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>مركز البث المباشر</h1>
      </div>

      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '3rem 2rem' }}>
        
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '3rem', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h2 style={{ fontSize: '2rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>الجلسات التفاعلية</h2>
            <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '1rem' }}>انضم لدروس البث المباشر وتفاعل مع مدربيك وزملائك في الوقت الفعلي.</p>
          </div>
          
          <div style={{ display: 'flex', gap: '0.5rem', background: 'rgba(255,255,255,0.05)', padding: '0.5rem', borderRadius: '16px' }}>
            {[
              { id: 'ALL', label: 'الكل' },
              { id: 'LIVE', label: 'مباشر الآن', color: '#ef4444' },
              { id: 'UPCOMING', label: 'القادمة' },
              { id: 'RECORDED', label: 'المسجلة' }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                style={{
                  background: activeTab === tab.id ? 'rgba(255,255,255,0.1)' : 'transparent',
                  color: tab.color && activeTab !== tab.id ? tab.color : '#fff',
                  border: 'none', padding: '0.6rem 1.2rem', borderRadius: '12px',
                  fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.4rem',
                  transition: 'all 0.2s'
                }}
              >
                {tab.id === 'LIVE' && <span style={{ width: '8px', height: '8px', background: '#ef4444', borderRadius: '50%', display: 'inline-block', animation: 'pulse 2s infinite' }} />}
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: '2rem' }}>
          {filteredClasses.map((cls, idx) => (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.1 }}
              key={cls.id}
              style={{ background: '#111', borderRadius: '24px', border: '1px solid rgba(255,255,255,0.05)', overflow: 'hidden' }}
            >
              <div style={{ height: '200px', width: '100%', position: 'relative' }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={cls.image} alt={cls.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, #111, transparent)' }} />
                
                {cls.status === 'LIVE' && (
                  <div style={{ position: 'absolute', top: '1rem', right: '1rem', background: '#ef4444', color: '#fff', padding: '0.4rem 0.8rem', borderRadius: '8px', fontWeight: 'bold', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <span style={{ width: '8px', height: '8px', background: '#fff', borderRadius: '50%', display: 'inline-block', animation: 'pulse 2s infinite' }} />
                    مباشر الآن
                  </div>
                )}
                {cls.status === 'RECORDED' && (
                  <div style={{ position: 'absolute', top: '1rem', right: '1rem', background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(10px)', color: '#fff', padding: '0.4rem 0.8rem', borderRadius: '8px', fontWeight: 'bold', fontSize: '0.8rem' }}>
                    مسجل
                  </div>
                )}
                
                <div style={{ position: 'absolute', bottom: '1rem', right: '1.5rem', left: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(0,0,0,0.5)', padding: '0.4rem 0.8rem', borderRadius: '12px', backdropFilter: 'blur(5px)' }}>
                    <Users size={16} /> {cls.students}
                  </div>
                </div>
              </div>

              <div style={{ padding: '1.5rem' }}>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '1rem' }}>{cls.title}</h3>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem', color: 'rgba(255,255,255,0.6)', marginBottom: '1.5rem', fontSize: '0.95rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <User size={18} /> {cls.instructor}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    {cls.status === 'RECORDED' ? <Clock size={18} /> : <Calendar size={18} />} {cls.date}
                  </div>
                </div>

                <Link 
                  href={cls.status === 'LIVE' ? `/live-class` : '#'} 
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
                    background: cls.status === 'LIVE' ? '#f43f5e' : 'rgba(255,255,255,0.05)',
                    color: cls.status === 'LIVE' ? '#fff' : 'rgba(255,255,255,0.8)',
                    padding: '1rem', borderRadius: '16px', fontWeight: 'bold', textDecoration: 'none',
                    border: cls.status === 'LIVE' ? 'none' : '1px solid rgba(255,255,255,0.1)'
                  }}
                >
                  {cls.status === 'LIVE' ? (
                    <><Video size={20} /> انضمام للبث</>
                  ) : cls.status === 'UPCOMING' ? (
                    <><Calendar size={20} /> تذكيرني</>
                  ) : (
                    <><PlayCircle size={20} /> مشاهدة التسجيل</>
                  )}
                </Link>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}
