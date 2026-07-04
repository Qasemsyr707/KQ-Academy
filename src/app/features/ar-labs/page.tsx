// @ts-nocheck
'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Box, Sparkles, MonitorSmartphone, Layers, Search, ChevronRight } from 'lucide-react';
import Script from 'next/script';
import Link from 'next/link';

// Removed inline declaration

const models = [
  {
    id: 'astronaut',
    name: 'رائد فضاء (Astronaut)',
    category: 'فلك',
    src: 'https://modelviewer.dev/shared-assets/models/Astronaut.glb',
    ios_src: 'https://modelviewer.dev/shared-assets/models/Astronaut.usdz',
    poster: 'https://modelviewer.dev/shared-assets/models/Astronaut.png',
    color: '#3b82f6'
  },
  {
    id: 'helmet',
    name: 'خوذة فضاء متضررة',
    category: 'فيزياء مواد',
    src: 'https://modelviewer.dev/shared-assets/models/glTF-Sample-Models/2.0/DamagedHelmet/glTF/DamagedHelmet.gltf',
    ios_src: '',
    poster: '',
    color: '#eab308'
  },
  {
    id: 'chair',
    name: 'كرسي مريح (Couch)',
    category: 'هندسة',
    src: 'https://modelviewer.dev/shared-assets/models/Couch.glb',
    ios_src: 'https://modelviewer.dev/shared-assets/models/Couch.usdz',
    poster: '',
    color: '#22c55e'
  }
];

export default function ARLabsPage() {
  const [activeModel, setActiveModel] = useState(models[0]);
  const [searchQuery, setSearchQuery] = useState('');

  const filteredModels = models.filter(m => m.name.toLowerCase().includes(searchQuery.toLowerCase()) || m.category.includes(searchQuery));

  return (
    <div style={{ minHeight: '100vh', background: '#050505', color: '#fff', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      <Script type="module" src="https://ajax.googleapis.com/ajax/libs/model-viewer/3.4.0/model-viewer.min.js" />
      
      {/* Navbar / Header */}
      <div style={{ padding: '1.5rem 2rem', background: '#111', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 50 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <Link href="/dashboard" style={{ color: 'rgba(255,255,255,0.5)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
            لوحة التحكم <ChevronRight size={16} />
          </Link>
          <div style={{ width: '40px', height: '40px', background: 'rgba(59, 130, 246, 0.1)', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Box size={24} color="#3b82f6" />
          </div>
          <div>
            <h1 style={{ fontSize: '1.2rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              مختبرات AR <Sparkles size={16} color="#3b82f6" />
            </h1>
          </div>
        </div>
        <div style={{ display: 'none', gap: '1rem', background: 'rgba(255,255,255,0.05)', padding: '0.5rem 1rem', borderRadius: '20px', alignItems: 'center' }}>
          <MonitorSmartphone size={18} color="rgba(255,255,255,0.5)" />
          <span style={{ fontSize: '0.9rem', color: 'rgba(255,255,255,0.5)' }}>يدعم العرض على الجوال</span>
        </div>
      </div>

      <div style={{ display: 'flex', height: 'calc(100vh - 81px)', overflow: 'hidden' }}>
        
        {/* Sidebar */}
        <div style={{ width: '350px', background: '#0a0a0a', borderLeft: '1px solid rgba(255,255,255,0.05)', display: 'flex', flexDirection: 'column' }}>
          <div style={{ padding: '1.5rem' }}>
            <h2 style={{ fontSize: '1.1rem', fontWeight: 'bold', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Layers size={18} /> المجسمات المتاحة
            </h2>
            <div style={{ position: 'relative', marginBottom: '1.5rem' }}>
              <Search size={16} style={{ position: 'absolute', right: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.4)' }} />
              <input 
                type="text" 
                placeholder="ابحث عن مجسم..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{ width: '100%', padding: '0.8rem 1rem 0.8rem 2.5rem', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', color: '#fff', outline: 'none' }}
              />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', overflowY: 'auto', maxHeight: 'calc(100vh - 250px)' }}>
              {filteredModels.map(model => (
                <button
                  key={model.id}
                  onClick={() => setActiveModel(model)}
                  style={{
                    background: activeModel.id === model.id ? 'rgba(59, 130, 246, 0.1)' : 'rgba(255,255,255,0.02)',
                    border: `1px solid ${activeModel.id === model.id ? 'rgba(59, 130, 246, 0.3)' : 'transparent'}`,
                    padding: '1rem',
                    borderRadius: '12px',
                    textAlign: 'right',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '1rem',
                    transition: 'all 0.2s',
                  }}
                >
                  <div style={{ width: '40px', height: '40px', background: `${model.color}20`, borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Box size={20} color={model.color} />
                  </div>
                  <div>
                    <h3 style={{ fontSize: '1rem', fontWeight: 'bold', color: activeModel.id === model.id ? '#fff' : 'rgba(255,255,255,0.8)', marginBottom: '0.2rem' }}>{model.name}</h3>
                    <span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)', background: 'rgba(255,255,255,0.05)', padding: '0.1rem 0.5rem', borderRadius: '10px' }}>{model.category}</span>
                  </div>
                </button>
              ))}
              {filteredModels.length === 0 && (
                <div style={{ textAlign: 'center', padding: '2rem', color: 'rgba(255,255,255,0.4)' }}>لا يوجد نتائج.</div>
              )}
            </div>
          </div>
        </div>

        {/* 3D Viewer Area */}
        <div style={{ flex: 1, position: 'relative', background: 'radial-gradient(circle at center, #111 0%, #000 100%)' }}>
          
          <AnimatePresence mode="wait">
            <motion.div
              key={activeModel.id}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.05 }}
              transition={{ duration: 0.3 }}
              style={{ width: '100%', height: '100%' }}
            >
              {/* @ts-ignore */}
              <model-viewer
                src={activeModel.src}
                ios-src={activeModel.ios_src || undefined}
                poster={activeModel.poster || undefined}
                alt={activeModel.name}
                shadow-intensity="1"
                camera-controls
                auto-rotate
                ar
                ar-modes="webxr scene-viewer quick-look"
                environment-image="neutral"
                style={{ width: '100%', height: '100%', '--poster-color': 'transparent' } as any}
              >
                {/* AR Button Overlay */}
                <button 
                  slot="ar-button" 
                  style={{
                    position: 'absolute', bottom: '2rem', left: '50%', transform: 'translateX(-50%)',
                    background: 'var(--primary)', color: '#000', border: 'none', padding: '1rem 2rem',
                    borderRadius: '30px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '0.5rem',
                    cursor: 'pointer', boxShadow: '0 10px 25px rgba(203, 161, 83, 0.3)',
                    fontSize: '1rem', zIndex: 10
                  }}
                >
                  <MonitorSmartphone size={20} />
                  عرض في مساحتك (AR)
                </button>
              </model-viewer>
            </motion.div>
          </AnimatePresence>

          {/* Info Overlay */}
          <div style={{ position: 'absolute', top: '2rem', left: '2rem', background: 'rgba(10,10,10,0.8)', backdropFilter: 'blur(10px)', padding: '1.5rem', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.1)', maxWidth: '300px' }}>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>{activeModel.name}</h2>
            <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.9rem', lineHeight: 1.5 }}>
              قم باستخدام الفأرة (أو اللمس) لتدوير المجسم وتقريبه. إذا كنت تستخدم هاتفاً ذكياً، اضغط على زر "عرض في مساحتك" لرؤية المجسم في غرفتك باستخدام كاميرا الواقع المعزز!
            </p>
          </div>

        </div>
      </div>
      
    </div>
  );
}
