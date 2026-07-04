'use client';

import { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Heart, MessageCircle, Share2, MoreVertical, Play, Pause, Music, ChevronLeft } from 'lucide-react';
import Link from 'next/link';

// Mock data for Shorts
const shortsData = [
  {
    id: 1,
    videoUrl: 'http://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
    title: 'كيف تحل معادلات الدرجة الثانية بثوانٍ!',
    instructor: 'أ. أحمد عبدالله',
    courseId: 'math-101',
    likes: '12K',
    comments: '342',
    shares: '1.2K',
    description: 'طريقة سرية ومختصرة لحل معادلات الدرجة الثانية بدون استخدام المميز (الدلتا). #رياضيات #بكالوريا'
  },
  {
    id: 2,
    videoUrl: 'http://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4',
    title: 'خدعة في الـ CSS ستوفر عليك ساعات',
    instructor: 'م. سارة خالد',
    courseId: 'web-dev',
    likes: '8.5K',
    comments: '120',
    shares: '500',
    description: 'استخدام Grid Layout لعمل تصميم متجاوب بدون Media Queries! #برمجة #تصميم'
  },
  {
    id: 3,
    videoUrl: 'http://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4',
    title: 'تجربة كيميائية: تفاعل الصوديوم مع الماء',
    instructor: 'د. رامي سعيد',
    courseId: 'chem-101',
    likes: '25K',
    comments: '890',
    shares: '3.4K',
    description: 'شاهد ماذا يحدث عند وضع قطعة صوديوم في الماء (لا تجربها في المنزل!). #كيمياء #علوم'
  }
];

export default function ShortsPage() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [activeVideoIndex, setActiveVideoIndex] = useState(0);

  // Handle intersection observer to auto-play/pause videos based on scroll
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const video = entry.target as HTMLVideoElement;
          if (entry.isIntersecting) {
            video.play().catch(e => console.log('Auto-play blocked', e));
            setActiveVideoIndex(Number(video.dataset.index));
          } else {
            video.pause();
            video.currentTime = 0;
          }
        });
      },
      { threshold: 0.6 } // trigger when 60% of the video is visible
    );

    const videos = document.querySelectorAll('.short-video');
    videos.forEach((video) => observer.observe(video));

    return () => {
      videos.forEach((video) => observer.unobserve(video));
    };
  }, []);

  return (
    <div style={{
      height: '100vh',
      width: '100vw',
      backgroundColor: '#000',
      overflowY: 'scroll',
      scrollSnapType: 'y mandatory',
      scrollbarWidth: 'none', // Firefox
      position: 'relative'
    }}>
      {/* Header Overlay */}
      <div style={{
        position: 'fixed', top: 0, left: 0, width: '100%',
        padding: '1.5rem 2rem', zIndex: 50,
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        background: 'linear-gradient(to bottom, rgba(0,0,0,0.8), transparent)'
      }}>
        <Link href="/dashboard" style={{ color: '#fff', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 'bold' }}>
          <ChevronLeft size={24} /> رجوع
        </Link>
        <h1 style={{ fontSize: '1.2rem', margin: 0, color: '#fff', fontWeight: 'bold' }}>Shorts</h1>
        <div style={{ width: '24px' }} /> {/* Spacer */}
      </div>

      {shortsData.map((short, index) => (
        <ShortVideoCard key={short.id} short={short} index={index} isActive={index === activeVideoIndex} />
      ))}

      <style>{`
        ::-webkit-scrollbar {
          display: none;
        }
      `}</style>
    </div>
  );
}

function ShortVideoCard({ short, index, isActive }: { short: any, index: number, isActive: boolean }) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLiked, setIsLiked] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  const togglePlay = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  useEffect(() => {
    setIsPlaying(isActive);
  }, [isActive]);

  return (
    <div style={{
      height: '100vh',
      width: '100%',
      position: 'relative',
      scrollSnapAlign: 'start',
      display: 'flex',
      justifyContent: 'center',
      backgroundColor: '#000'
    }}>
      {/* Video Container */}
      <div style={{
        position: 'relative',
        height: '100%',
        width: '100%',
        maxWidth: '500px', // Like mobile screen
        backgroundColor: '#111'
      }}>
        <video
          ref={videoRef}
          src={short.videoUrl}
          data-index={index}
          className="short-video"
          loop
          playsInline
          onClick={togglePlay}
          style={{ width: '100%', height: '100%', objectFit: 'cover', cursor: 'pointer' }}
        />

        {/* Play/Pause overlay icon (shows briefly when clicked) */}
        {!isPlaying && (
          <div style={{
            position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
            pointerEvents: 'none', opacity: 0.7
          }}>
            <Play size={64} fill="#fff" />
          </div>
        )}

        {/* Right Sidebar Actions */}
        <div style={{
          position: 'absolute', bottom: '100px', right: '15px',
          display: 'flex', flexDirection: 'column', gap: '1.5rem', alignItems: 'center', zIndex: 10
        }}>
          {/* Like */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.2rem' }}>
            <motion.button 
              whileTap={{ scale: 0.8 }}
              onClick={() => setIsLiked(!isLiked)}
              style={{ 
                background: 'rgba(0,0,0,0.4)', border: 'none', borderRadius: '50%', padding: '12px',
                cursor: 'pointer', backdropFilter: 'blur(10px)',
                display: 'flex', alignItems: 'center', justifyContent: 'center'
              }}
            >
              <Heart size={28} color={isLiked ? '#ef4444' : '#fff'} fill={isLiked ? '#ef4444' : 'transparent'} />
            </motion.button>
            <span style={{ color: '#fff', fontSize: '0.8rem', fontWeight: 'bold' }}>{short.likes}</span>
          </div>

          {/* Comment */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.2rem' }}>
            <button style={{ 
              background: 'rgba(0,0,0,0.4)', border: 'none', borderRadius: '50%', padding: '12px',
              cursor: 'pointer', backdropFilter: 'blur(10px)', color: '#fff'
            }}>
              <MessageCircle size={28} fill="transparent" />
            </button>
            <span style={{ color: '#fff', fontSize: '0.8rem', fontWeight: 'bold' }}>{short.comments}</span>
          </div>

          {/* Share */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.2rem' }}>
            <button style={{ 
              background: 'rgba(0,0,0,0.4)', border: 'none', borderRadius: '50%', padding: '12px',
              cursor: 'pointer', backdropFilter: 'blur(10px)', color: '#fff'
            }}>
              <Share2 size={28} />
            </button>
            <span style={{ color: '#fff', fontSize: '0.8rem', fontWeight: 'bold' }}>{short.shares}</span>
          </div>

          {/* More */}
          <button style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', marginTop: '0.5rem' }}>
            <MoreVertical size={24} />
          </button>
        </div>

        {/* Bottom Info Area */}
        <div style={{
          position: 'absolute', bottom: 0, left: 0, width: '100%',
          padding: '1.5rem', zIndex: 10,
          background: 'linear-gradient(to top, rgba(0,0,0,0.9), transparent)',
          display: 'flex', flexDirection: 'column', gap: '0.5rem'
        }}>
          <h3 style={{ color: '#fff', margin: 0, fontSize: '1.1rem', fontWeight: 'bold' }}>{short.instructor}</h3>
          <p style={{ color: '#fff', margin: 0, fontSize: '0.9rem', lineHeight: 1.4, opacity: 0.9 }}>
            {short.description}
          </p>
          
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '0.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#fff', fontSize: '0.8rem' }}>
              <Music size={14} /> <span>الصوت الأصلي - {short.instructor}</span>
            </div>
            
            <Link href={`/courses/${short.courseId}`} style={{
              background: 'var(--primary)', color: '#000', padding: '0.4rem 1rem',
              borderRadius: '20px', fontSize: '0.8rem', fontWeight: 'bold', textDecoration: 'none'
            }}>
              عرض الكورس الكامل
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
