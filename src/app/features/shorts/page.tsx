'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { PlaySquare, Heart, MessageCircle, Share2, Bookmark, ChevronRight, Volume2, MoreHorizontal } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';

const mockShorts = [
  {
    id: 1,
    title: 'قانون نيوتن الثالث في 60 ثانية!',
    instructor: 'م. أحمد السوري',
    course: 'الفيزياء الأساسية',
    likes: '12K',
    comments: '342',
    shares: '1.2K',
    videoCover: 'https://images.unsplash.com/photo-1636466497217-26a8cbeaf0aa?w=400&h=800&fit=crop'
  },
  {
    id: 2,
    title: 'كيف تحفظ الجدول الدوري بسهولة؟',
    instructor: 'د. سارة الأحمد',
    course: 'الكيمياء',
    likes: '8.5K',
    comments: '210',
    shares: '850',
    videoCover: 'https://images.unsplash.com/photo-1532094349884-543bc11b234d?w=400&h=800&fit=crop'
  }
];

export default function ShortsPage() {
  const [currentVideoIndex, setCurrentVideoIndex] = useState(0);

  const nextVideo = () => {
    if (currentVideoIndex < mockShorts.length - 1) {
      setCurrentVideoIndex(prev => prev + 1);
    }
  };

  const prevVideo = () => {
    if (currentVideoIndex > 0) {
      setCurrentVideoIndex(prev => prev - 1);
    }
  };

  const currentVideo = mockShorts[currentVideoIndex];

  return (
    <div style={{ minHeight: '100vh', background: '#000', color: '#fff', fontFamily: 'system-ui, -apple-system, sans-serif', overflow: 'hidden' }}>
      
      {/* Navbar Overlay */}
      <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', padding: '1.5rem 2rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', zIndex: 50, background: 'linear-gradient(to bottom, rgba(0,0,0,0.8), transparent)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <Link href="/dashboard" style={{ color: '#fff', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.2rem', textShadow: '0 2px 4px rgba(0,0,0,0.5)' }}>
            لوحة التحكم <ChevronRight size={16} />
          </Link>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <PlaySquare size={24} color="#3b82f6" />
            <h1 style={{ fontSize: '1.2rem', fontWeight: 'bold', textShadow: '0 2px 4px rgba(0,0,0,0.5)' }}>الفيديوهات القصيرة</h1>
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        
        {/* Mobile View Container */}
        <div 
          style={{ 
            width: '100%', maxWidth: '450px', height: '100vh', 
            position: 'relative', background: '#111', 
            boxShadow: '0 0 50px rgba(0,0,0,0.5)' 
          }}
        >
          {/* Video Area (Mock) */}
          <div 
            style={{ width: '100%', height: '100%', position: 'relative' }}
            onClick={nextVideo} // Simple click to next for mock
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={currentVideo.videoCover} alt="Short" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            
            {/* UI Overlay */}
            <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', padding: '1.5rem', background: 'linear-gradient(to top, rgba(0,0,0,0.9) 0%, transparent 40%)' }}>
              
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                
                {/* Left Side (Info) */}
                <div style={{ flex: 1, paddingRight: '4rem' }}>
                  <h3 style={{ fontSize: '1.1rem', fontWeight: 'bold', marginBottom: '0.5rem', textShadow: '0 1px 3px rgba(0,0,0,0.8)' }}>
                    {currentVideo.instructor}
                  </h3>
                  <p style={{ fontSize: '1rem', lineHeight: 1.4, marginBottom: '1rem', textShadow: '0 1px 3px rgba(0,0,0,0.8)' }}>
                    {currentVideo.title}
                  </p>
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(255,255,255,0.2)', backdropFilter: 'blur(10px)', padding: '0.4rem 0.8rem', borderRadius: '12px', fontSize: '0.85rem' }}>
                    <PlaySquare size={14} /> {currentVideo.course}
                  </div>
                </div>

                {/* Right Side (Actions) */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', alignItems: 'center', position: 'absolute', right: '1rem', bottom: '2rem' }}>
                  
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.3rem' }}>
                    <button style={{ width: '48px', height: '48px', borderRadius: '50%', background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(5px)', border: 'none', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                      <Heart size={24} />
                    </button>
                    <span style={{ fontSize: '0.8rem', fontWeight: 'bold' }}>{currentVideo.likes}</span>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.3rem' }}>
                    <button style={{ width: '48px', height: '48px', borderRadius: '50%', background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(5px)', border: 'none', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                      <MessageCircle size={24} />
                    </button>
                    <span style={{ fontSize: '0.8rem', fontWeight: 'bold' }}>{currentVideo.comments}</span>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.3rem' }}>
                    <button style={{ width: '48px', height: '48px', borderRadius: '50%', background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(5px)', border: 'none', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                      <Bookmark size={24} />
                    </button>
                    <span style={{ fontSize: '0.8rem', fontWeight: 'bold' }}>حفظ</span>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.3rem' }}>
                    <button style={{ width: '48px', height: '48px', borderRadius: '50%', background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(5px)', border: 'none', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                      <Share2 size={24} />
                    </button>
                    <span style={{ fontSize: '0.8rem', fontWeight: 'bold' }}>{currentVideo.shares}</span>
                  </div>

                  <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'var(--primary)', border: '2px solid #fff', overflow: 'hidden', marginTop: '1rem', animation: 'spin 5s linear infinite' }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src="https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&h=100&fit=crop" alt="User" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  </div>

                </div>
              </div>
            </div>
            
            {/* Play/Pause indicator placeholder */}
            <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', opacity: 0 }}>
              <PlaySquare size={64} color="rgba(255,255,255,0.8)" />
            </div>
            
            {/* Volume */}
            <div style={{ position: 'absolute', top: '5rem', right: '1.5rem' }}>
              <Volume2 size={24} color="#fff" style={{ textShadow: '0 2px 4px rgba(0,0,0,0.5)' }} />
            </div>
          </div>
        </div>
        
        {/* Desktop Controls Info */}
        <div style={{ position: 'absolute', right: '2rem', top: '50%', transform: 'translateY(-50%)', display: 'none' /* Will show via CSS media query usually, hiding for simple mock */ }}>
          <div style={{ background: 'rgba(255,255,255,0.05)', padding: '1.5rem', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.1)' }}>
            <h4 style={{ fontWeight: 'bold', marginBottom: '1rem' }}>التحكم</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', color: 'rgba(255,255,255,0.6)', fontSize: '0.9rem' }}>
              <div>[↑] الفيديو السابق</div>
              <div>[↓] الفيديو التالي</div>
              <div>[مسافة] إيقاف / تشغيل</div>
            </div>
          </div>
        </div>

      </div>
      
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}} />
    </div>
  );
}
