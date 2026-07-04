'use client';

import { motion } from 'framer-motion';
import { PlayCircle, FileText, MessageSquare, CheckCircle, Circle, ChevronRight, Download, Send } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';

export default function LessonPlayer() {
  const [activeTab, setActiveTab] = useState('overview');

  const playlist = [
    { id: 1, title: 'مقدمة في تقنيات الويب الحديثة', duration: '12:45', completed: true },
    { id: 2, title: 'إعداد بيئة العمل (Next.js & React)', duration: '18:20', completed: true },
    { id: 3, title: 'بناء المكونات التفاعلية (Components)', duration: '25:10', completed: false, active: true },
    { id: 4, title: 'إدارة الحالة المتقدمة (State Management)', duration: '30:00', completed: false },
    { id: 5, title: 'تكامل الذكاء الاصطناعي مع الواجهة', duration: '45:15', completed: false },
  ];

  return (
    <div className="container" style={{ padding: '2rem 5%' }}>
      {/* Breadcrumb Navigation */}
      <div style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem', opacity: 0.8, fontSize: '0.9rem' }}>
        <Link href="/dashboard" className="hover:text-primary transition-colors">لوحة الطالب</Link>
        <ChevronRight size={16} />
        <span>تطوير الويب الشامل</span>
        <ChevronRight size={16} />
        <span style={{ color: 'var(--primary)', fontWeight: 600 }}>بناء المكونات التفاعلية</span>
      </div>

      <div className="grid" style={{ gridTemplateColumns: '3fr 1fr', gap: '2rem' }}>
        
        {/* Main Video Area */}
        <motion.div 
          style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          {/* Video Player Placeholder */}
          <div style={{ 
            width: '100%', 
            aspectRatio: '16/9', 
            background: '#000', 
            borderRadius: '16px',
            border: '1px solid rgba(255,255,255,0.1)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            position: 'relative',
            overflow: 'hidden',
            boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)'
          }}>
            {/* DRM Watermark */}
            <div style={{ position: 'absolute', top: '1rem', right: '1rem', opacity: 0.3, fontSize: '0.8rem', pointerEvents: 'none' }}>
              Khaled_User_9921
            </div>

            <PlayCircle size={80} color="var(--primary)" style={{ cursor: 'pointer', filter: 'drop-shadow(0 0 10px rgba(203, 161, 83, 0.5))' }} />
            <p style={{ marginTop: '1rem', opacity: 0.7 }}>انقر للتشغيل (جودة 4K متوفرة)</p>
            
            {/* Fake Video Controls */}
            <div style={{ position: 'absolute', bottom: '0', width: '100%', padding: '1rem', background: 'linear-gradient(0deg, rgba(0,0,0,0.8) 0%, transparent 100%)', display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <div style={{ flex: 1, height: '4px', background: 'rgba(255,255,255,0.2)', borderRadius: '2px', cursor: 'pointer' }}>
                <div style={{ width: '30%', height: '100%', background: 'var(--primary)', borderRadius: '2px' }}></div>
              </div>
              <span style={{ fontSize: '0.8rem' }}>07:33 / 25:10</span>
            </div>
          </div>

          <h1 style={{ fontSize: '1.8rem', lineHeight: '1.4' }}>الدرس 3: بناء المكونات التفاعلية (Components)</h1>

          {/* Tabs Navigation */}
          <div style={{ display: 'flex', gap: '2rem', borderBottom: '1px solid var(--border-light)', paddingBottom: '0.5rem' }}>
            <button 
              onClick={() => setActiveTab('overview')}
              style={{ background: 'none', border: 'none', color: activeTab === 'overview' ? 'var(--primary)' : '#fff', fontWeight: activeTab === 'overview' ? 600 : 400, cursor: 'pointer', fontSize: '1rem', position: 'relative', paddingBottom: '0.5rem' }}
            >
              نظرة عامة
              {activeTab === 'overview' && <div style={{ position: 'absolute', bottom: '-5px', left: 0, width: '100%', height: '2px', background: 'var(--primary)', borderRadius: '2px' }}></div>}
            </button>
            <button 
              onClick={() => setActiveTab('resources')}
              style={{ background: 'none', border: 'none', color: activeTab === 'resources' ? 'var(--primary)' : '#fff', fontWeight: activeTab === 'resources' ? 600 : 400, cursor: 'pointer', fontSize: '1rem', position: 'relative', paddingBottom: '0.5rem' }}
            >
              الملحقات والملفات
              {activeTab === 'resources' && <div style={{ position: 'absolute', bottom: '-5px', left: 0, width: '100%', height: '2px', background: 'var(--primary)', borderRadius: '2px' }}></div>}
            </button>
            <button 
              onClick={() => setActiveTab('qa')}
              style={{ background: 'none', border: 'none', color: activeTab === 'qa' ? 'var(--primary)' : '#fff', fontWeight: activeTab === 'qa' ? 600 : 400, cursor: 'pointer', fontSize: '1rem', position: 'relative', paddingBottom: '0.5rem' }}
            >
              الأسئلة والنقاشات
              {activeTab === 'qa' && <div style={{ position: 'absolute', bottom: '-5px', left: 0, width: '100%', height: '2px', background: 'var(--primary)', borderRadius: '2px' }}></div>}
            </button>
          </div>

          {/* Tab Content */}
          <div style={{ padding: '1rem 0' }}>
            {activeTab === 'overview' && (
              <p style={{ opacity: 0.8, lineHeight: '1.8' }}>
                في هذا الدرس، سنتعلم كيفية بناء واجهات مستخدم قابلة لإعادة الاستخدام باستخدام React Components. سنقوم بتجزئة التصميم إلى أجزاء صغيرة مستقلة، وسنتعلم كيفية تمرير البيانات بينها باستخدام Props، وكيفية إضافة التفاعل (Interactivity) باستخدام الأحداث (Events).
              </p>
            )}

            {activeTab === 'resources' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.05)', padding: '1rem', borderRadius: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <FileText color="var(--primary)" />
                    <span>ملخص الدرس والشفرات البرمجية (PDF)</span>
                  </div>
                  <button className="btn" style={{ padding: '0.4rem 1rem', fontSize: '0.8rem' }}><Download size={16} /> تحميل</button>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.05)', padding: '1rem', borderRadius: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <FileText color="#3b82f6" />
                    <span>تمرين عملي إضافي (ZIP)</span>
                  </div>
                  <button className="btn" style={{ padding: '0.4rem 1rem', fontSize: '0.8rem' }}><Download size={16} /> تحميل</button>
                </div>
              </div>
            )}

            {activeTab === 'qa' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                {/* Add Comment Input */}
                <div style={{ display: 'flex', gap: '1rem' }}>
                  <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#000', fontWeight: 'bold' }}>خ</div>
                  <div style={{ flex: 1, position: 'relative' }}>
                    <input type="text" placeholder="اطرح سؤالاً على المدرب أو زملائك..." style={{ width: '100%', padding: '1rem', paddingRight: '3rem', borderRadius: '12px', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-light)', color: '#fff' }} />
                    <button style={{ position: 'absolute', left: '0.5rem', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--primary)', cursor: 'pointer', padding: '0.5rem' }}>
                      <Send size={20} style={{ transform: 'rotate(180deg)' }} />
                    </button>
                  </div>
                </div>

                {/* Example Comment */}
                <div style={{ display: 'flex', gap: '1rem', background: 'rgba(255,255,255,0.02)', padding: '1.5rem', borderRadius: '12px' }}>
                  <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: '#3b82f6', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 'bold' }}>أ</div>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '0.5rem' }}>
                      <span style={{ fontWeight: 600 }}>أحمد سامي</span>
                      <span style={{ fontSize: '0.8rem', opacity: 0.5 }}>منذ يومين</span>
                    </div>
                    <p style={{ opacity: 0.8, fontSize: '0.95rem' }}>هل يمكننا استخدام State Management داخل Functional Components فقط أم يمكننا استخدام Class Components أيضاً في Next.js الحديث؟</p>
                    
                    {/* Reply */}
                    <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem', background: 'rgba(203, 161, 83, 0.05)', padding: '1rem', borderRadius: '8px', borderLeft: '2px solid var(--primary)' }}>
                      <div style={{ width: '30px', height: '30px', borderRadius: '50%', background: '#000', border: '1px solid var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary)', fontSize: '0.8rem' }}>م</div>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.3rem' }}>
                          <span style={{ fontWeight: 600, color: 'var(--primary)', fontSize: '0.9rem' }}>المدرب (أ. خالد)</span>
                        </div>
                        <p style={{ opacity: 0.9, fontSize: '0.9rem' }}>أهلاً أحمد، في Next.js (App Router) يفضل دائماً استخدام Functional Components مع Hooks لأنها الطريقة المدعومة والمثلى في React 18.</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </motion.div>

        {/* Sidebar - Playlist */}
        <motion.div 
          className="glass-card" 
          style={{ padding: '0', height: 'fit-content', overflow: 'hidden' }}
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.3 }}
        >
          <div style={{ padding: '1.5rem', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
            <h3 style={{ fontSize: '1.1rem', marginBottom: '0.5rem' }}>محتوى الدورة</h3>
            <div style={{ width: '100%', height: '4px', background: 'rgba(255,255,255,0.1)', borderRadius: '2px', overflow: 'hidden' }}>
              <div style={{ width: '40%', height: '100%', background: 'var(--success)' }}></div>
            </div>
            <p style={{ fontSize: '0.8rem', opacity: 0.6, marginTop: '0.5rem' }}>تم إنجاز 40% (2 من 5 دروس)</p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {playlist.map((lesson) => (
              <div 
                key={lesson.id} 
                style={{ 
                  display: 'flex', 
                  gap: '1rem', 
                  padding: '1.2rem 1.5rem', 
                  cursor: 'pointer',
                  background: lesson.active ? 'rgba(203, 161, 83, 0.1)' : 'transparent',
                  borderLeft: lesson.active ? '4px solid var(--primary)' : '4px solid transparent',
                  transition: 'background 0.3s'
                }}
                className={!lesson.active ? "hover:bg-[rgba(255,255,255,0.02)]" : ""}
              >
                <div style={{ marginTop: '0.2rem' }}>
                  {lesson.completed ? (
                    <CheckCircle size={20} color="var(--success)" />
                  ) : lesson.active ? (
                    <PlayCircle size={20} color="var(--primary)" />
                  ) : (
                    <Circle size={20} color="var(--border-light)" />
                  )}
                </div>
                <div>
                  <h4 style={{ fontSize: '0.95rem', fontWeight: lesson.active ? 600 : 400, color: lesson.active ? 'var(--primary)' : '#fff', marginBottom: '0.3rem', lineHeight: '1.4' }}>
                    {lesson.id}. {lesson.title}
                  </h4>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8rem', opacity: 0.6 }}>
                    <PlayCircle size={12} /> {lesson.duration}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
