'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Download, Smartphone, ShieldCheck, ChevronRight, HardDrive, WifiOff, RefreshCcw } from 'lucide-react';
import Link from 'next/link';

const mockDownloads = [
  { id: 1, title: 'الفصل الأول: الحركة الميكانيكية', course: 'الفيزياء', size: '450 MB', status: 'DOWNLOADED', progress: 100 },
  { id: 2, title: 'الفصل الثاني: قوانين نيوتن', course: 'الفيزياء', size: '320 MB', status: 'DOWNLOADING', progress: 45 },
  { id: 3, title: 'مقدمة في الكيمياء العضوية', course: 'الكيمياء', size: '512 MB', status: 'PAUSED', progress: 12 },
];

export default function OfflineDRMPage() {
  const [downloads, setDownloads] = useState(mockDownloads);

  return (
    <div style={{ minHeight: '100vh', background: '#050505', color: '#fff', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      
      {/* Navbar */}
      <div style={{ padding: '1.5rem 2rem', background: '#111', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', gap: '1rem', position: 'sticky', top: 0, zIndex: 50 }}>
        <Link href="/dashboard" style={{ color: 'rgba(255,255,255,0.5)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
          لوحة التحكم <ChevronRight size={16} />
        </Link>
        <div style={{ width: '40px', height: '40px', background: 'rgba(34, 197, 94, 0.1)', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <WifiOff size={24} color="#22c55e" />
        </div>
        <h1 style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>الدراسة بدون إنترنت (Offline Mode)</h1>
      </div>

      <div style={{ maxWidth: '1000px', margin: '0 auto', padding: '3rem 2rem' }}>
        
        {/* Info Banner */}
        <div style={{ background: 'linear-gradient(to right, rgba(34, 197, 94, 0.1), rgba(34, 197, 94, 0.05))', border: '1px solid rgba(34, 197, 94, 0.2)', padding: '2rem', borderRadius: '24px', marginBottom: '3rem', display: 'flex', gap: '2rem', alignItems: 'center' }}>
          <div style={{ width: '80px', height: '80px', background: 'rgba(34, 197, 94, 0.2)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <ShieldCheck size={40} color="#22c55e" />
          </div>
          <div>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '0.5rem', color: '#22c55e' }}>حماية و تحميل آمن (DRM)</h2>
            <p style={{ color: 'rgba(255,255,255,0.7)', lineHeight: 1.6 }}>
              تتيح لك منصة K&Q Academy تحميل الفيديوهات لمشاهدتها لاحقاً بدون إنترنت داخل التطبيق فقط! 
              نستخدم تشفير DRM متطور يضمن حماية حقوق الملكية الفكرية للمدربين، حيث لا يمكن استخراج الفيديوهات أو مشاركتها خارج المنصة.
            </p>
          </div>
        </div>

        {/* Storage Info */}
        <div style={{ background: '#111', border: '1px solid rgba(255,255,255,0.05)', padding: '2rem', borderRadius: '24px', marginBottom: '3rem', display: 'flex', alignItems: 'center', gap: '2rem' }}>
          <HardDrive size={48} color="rgba(255,255,255,0.2)" />
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
              <span style={{ fontWeight: 'bold' }}>المساحة المستخدمة</span>
              <span style={{ color: 'rgba(255,255,255,0.5)' }}>1.2 GB / 10 GB (مسموح)</span>
            </div>
            <div style={{ width: '100%', height: '8px', background: 'rgba(255,255,255,0.1)', borderRadius: '4px', overflow: 'hidden' }}>
              <div style={{ width: '12%', height: '100%', background: '#22c55e', borderRadius: '4px' }}></div>
            </div>
          </div>
          <button style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', padding: '0.8rem 1.5rem', borderRadius: '12px', fontWeight: 'bold', cursor: 'pointer' }}>
            تفريغ المساحة
          </button>
        </div>

        {/* Downloads List */}
        <div>
          <h3 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '1.5rem' }}>الدروس المحملة</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {downloads.map((item, index) => (
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                key={item.id}
                style={{ 
                  background: '#111', 
                  borderRadius: '16px', 
                  border: '1px solid rgba(255,255,255,0.05)',
                  padding: '1.5rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', flex: 1 }}>
                  <div style={{ width: '50px', height: '50px', background: 'rgba(255,255,255,0.05)', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {item.status === 'DOWNLOADED' ? <Smartphone size={24} color="#22c55e" /> : <Download size={24} color="rgba(255,255,255,0.5)" />}
                  </div>
                  <div>
                    <h4 style={{ fontSize: '1.1rem', fontWeight: 'bold', marginBottom: '0.2rem' }}>{item.title}</h4>
                    <span style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.5)' }}>{item.course} • {item.size}</span>
                  </div>
                </div>

                <div style={{ width: '200px', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  {item.status === 'DOWNLOADED' ? (
                    <div style={{ color: '#22c55e', fontSize: '0.9rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '0.5rem', marginLeft: 'auto' }}>
                      جاهز للمشاهدة
                    </div>
                  ) : (
                    <>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: 'rgba(255,255,255,0.6)', marginBottom: '0.3rem' }}>
                          <span>{item.status === 'PAUSED' ? 'متوقف' : 'جاري التحميل...'}</span>
                          <span>{item.progress}%</span>
                        </div>
                        <div style={{ width: '100%', height: '4px', background: 'rgba(255,255,255,0.1)', borderRadius: '2px' }}>
                          <div style={{ width: `${item.progress}%`, height: '100%', background: item.status === 'PAUSED' ? 'rgba(255,255,255,0.3)' : '#3b82f6', borderRadius: '2px' }}></div>
                        </div>
                      </div>
                      <button style={{ background: 'transparent', border: 'none', color: '#fff', cursor: 'pointer' }}>
                        {item.status === 'PAUSED' ? <RefreshCcw size={20} /> : <div style={{ width: '12px', height: '12px', background: '#fff', borderRadius: '2px' }} />}
                      </button>
                    </>
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}
