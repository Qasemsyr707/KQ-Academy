'use client';

import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { PlaySquare, Heart, MessageCircle, Share2, Bookmark, ChevronRight, X, ExternalLink } from 'lucide-react';
import Link from 'next/link';

export default function ShortsClient({ initialShorts }: { initialShorts: any[] }) {
  const [shorts, setShorts] = useState(initialShorts);
  const [currentVideoIndex, setCurrentVideoIndex] = useState(0);
  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState<any[]>([]);
  const [newComment, setNewComment] = useState('');
  const [loadingComments, setLoadingComments] = useState(false);

  const currentVideo = shorts[currentVideoIndex];

  const nextVideo = () => {
    if (currentVideoIndex < shorts.length - 1) {
      setCurrentVideoIndex(prev => prev + 1);
      setShowComments(false);
    }
  };

  const prevVideo = () => {
    if (currentVideoIndex > 0) {
      setCurrentVideoIndex(prev => prev - 1);
      setShowComments(false);
    }
  };

  const handleLike = async (id: string) => {
    try {
      const res = await fetch(`/api/shorts/${id}/like`, { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        setShorts(shorts.map(s => s.id === id ? { ...s, likes: data.likes } : s));
      } else if (res.status === 401) {
        alert('يجب تسجيل الدخول للإعجاب');
      }
    } catch (e) {
      console.error(e);
    }
  };

  const openComments = async (id: string) => {
    setShowComments(true);
    setLoadingComments(true);
    try {
      const res = await fetch(`/api/shorts/${id}/comments`);
      if (res.ok) {
        setComments(await res.json());
      }
    } catch (e) {
      console.error(e);
    }
    setLoadingComments(false);
  };

  const submitComment = async () => {
    if (!newComment.trim() || !currentVideo) return;
    try {
      const res = await fetch(`/api/shorts/${currentVideo.id}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: newComment })
      });
      if (res.ok) {
        const data = await res.json();
        setComments([data.comment, ...comments]);
        setNewComment('');
        setShorts(shorts.map(s => s.id === currentVideo.id ? { ...s, _count: { ...s._count, comments: s._count.comments + 1 } } : s));
      } else if (res.status === 401) {
        alert('يجب تسجيل الدخول للتعليق');
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleShare = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      alert('تم نسخ الرابط!');
    } catch (e) {
      console.error(e);
    }
  };

  if (!shorts || shorts.length === 0) {
    return (
      <div style={{ minHeight: '100vh', background: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', flexDirection: 'column', gap: '1rem' }}>
        <PlaySquare size={64} color="rgba(255,255,255,0.2)" />
        <p>لا توجد فيديوهات قصيرة حالياً.</p>
        <Link href="/dashboard" style={{ color: 'var(--primary)', textDecoration: 'none' }}>العودة للوحة التحكم</Link>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: '#000', color: '#fff', fontFamily: 'system-ui, -apple-system, sans-serif', overflow: 'hidden' }}>
      
      {/* Navbar Overlay */}
      <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', padding: '1.5rem 2rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', zIndex: 50, background: 'linear-gradient(to bottom, rgba(0,0,0,0.8), transparent)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <Link href="/dashboard" style={{ color: '#fff', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.2rem', textShadow: '0 2px 4px rgba(0,0,0,0.5)' }}>
            الرئيسية <ChevronRight size={16} />
          </Link>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <PlaySquare size={24} color="#3b82f6" />
            <h1 style={{ fontSize: '1.2rem', fontWeight: 'bold', textShadow: '0 2px 4px rgba(0,0,0,0.5)' }}>الريلز التعليمية</h1>
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
          {/* Video Area */}
          <div style={{ width: '100%', height: '100%', position: 'relative' }}>
            {currentVideo.videoUrl.includes('iframe') ? (
              <iframe src={currentVideo.videoUrl + "?autoplay=true&loop=true&muted=false"} style={{ width: '100%', height: '100%', border: 'none' }} allow="autoplay; fullscreen" />
            ) : (
              <video src={currentVideo.videoUrl} autoPlay loop playsInline style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            )}
            
            {/* Transparent Overlay to capture clicks for next/prev if needed */}
            <div 
              style={{ position: 'absolute', top: '10%', bottom: '20%', left: 0, right: '80px', zIndex: 10 }}
              onClick={(e) => {
                // Determine click area to scroll
                const { clientY, target } = e;
                const rect = (target as HTMLElement).getBoundingClientRect();
                if (clientY > rect.top + rect.height / 2) {
                  nextVideo();
                } else {
                  prevVideo();
                }
              }}
            />

            {/* UI Overlay */}
            <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', padding: '1.5rem', background: 'linear-gradient(to top, rgba(0,0,0,0.9) 0%, transparent 40%)', pointerEvents: 'none', zIndex: 20 }}>
              
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', pointerEvents: 'auto' }}>
                
                {/* Left Side (Info) */}
                <div style={{ flex: 1, paddingRight: '4rem' }}>
                  <h3 style={{ fontSize: '1.1rem', fontWeight: 'bold', marginBottom: '0.5rem', textShadow: '0 1px 3px rgba(0,0,0,0.8)' }}>
                    {currentVideo.user.name}
                  </h3>
                  <p style={{ fontSize: '1rem', lineHeight: 1.4, marginBottom: '1rem', textShadow: '0 1px 3px rgba(0,0,0,0.8)' }}>
                    {currentVideo.title}
                  </p>
                  
                  {currentVideo.course && (
                    <Link href={`/courses/${currentVideo.course.id}`} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', background: 'var(--primary)', color: '#000', padding: '0.6rem 1rem', borderRadius: '12px', fontSize: '0.95rem', fontWeight: 'bold', textDecoration: 'none', boxShadow: '0 4px 15px rgba(251, 191, 36, 0.4)' }}>
                      <PlaySquare size={16} /> سجل في الكورس الآن <ExternalLink size={14} />
                    </Link>
                  )}
                </div>

                {/* Right Side (Actions) */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', alignItems: 'center', position: 'absolute', right: '1rem', bottom: '2rem' }}>
                  
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.3rem' }}>
                    <button onClick={() => handleLike(currentVideo.id)} style={{ width: '48px', height: '48px', borderRadius: '50%', background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(5px)', border: 'none', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                      <Heart size={24} />
                    </button>
                    <span style={{ fontSize: '0.8rem', fontWeight: 'bold' }}>{currentVideo.likes}</span>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.3rem' }}>
                    <button onClick={() => openComments(currentVideo.id)} style={{ width: '48px', height: '48px', borderRadius: '50%', background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(5px)', border: 'none', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                      <MessageCircle size={24} />
                    </button>
                    <span style={{ fontSize: '0.8rem', fontWeight: 'bold' }}>{currentVideo._count.comments}</span>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.3rem' }}>
                    <button onClick={handleShare} style={{ width: '48px', height: '48px', borderRadius: '50%', background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(5px)', border: 'none', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                      <Share2 size={24} />
                    </button>
                    <span style={{ fontSize: '0.8rem', fontWeight: 'bold' }}>مشاركة</span>
                  </div>

                  <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'var(--primary)', border: '2px solid #fff', overflow: 'hidden', marginTop: '1rem', animation: 'spin 5s linear infinite' }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={currentVideo.user.image || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&h=100&fit=crop"} alt="User" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  </div>

                </div>
              </div>
            </div>
          </div>
        </div>
        
        {/* Desktop Controls Info */}
        <div style={{ position: 'absolute', right: '2rem', top: '50%', transform: 'translateY(-50%)' }} className="hidden md:block">
          <div style={{ background: 'rgba(255,255,255,0.05)', padding: '1.5rem', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.1)' }}>
            <h4 style={{ fontWeight: 'bold', marginBottom: '1rem' }}>التحكم بالماوس</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', color: 'rgba(255,255,255,0.6)', fontSize: '0.9rem' }}>
              <div>انقر في النصف الأعلى للفيديو السابق</div>
              <div>انقر في النصف الأسفل للفيديو التالي</div>
            </div>
            <div style={{ marginTop: '1.5rem', paddingTop: '1rem', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
              <p>الفيديو {currentVideoIndex + 1} من {shorts.length}</p>
            </div>
          </div>
        </div>

      </div>

      {/* Comments Modal / Bottom Sheet */}
      <AnimatePresence>
        {showComments && (
          <motion.div 
            initial={{ opacity: 0, y: '100%' }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            style={{ 
              position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)', 
              width: '100%', maxWidth: '450px', height: '60vh', 
              background: '#111', borderRadius: '20px 20px 0 0', zIndex: 100,
              boxShadow: '0 -10px 40px rgba(0,0,0,0.5)', display: 'flex', flexDirection: 'column'
            }}
          >
            <div style={{ padding: '1rem', borderBottom: '1px solid rgba(255,255,255,0.1)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontWeight: 'bold' }}>التعليقات ({currentVideo._count.comments})</h3>
              <button onClick={() => setShowComments(false)} style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer' }}><X size={24} /></button>
            </div>
            
            <div style={{ flex: 1, overflowY: 'auto', padding: '1rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {loadingComments ? (
                <div style={{ textAlign: 'center', color: 'rgba(255,255,255,0.5)', marginTop: '2rem' }}>جاري التحميل...</div>
              ) : comments.length === 0 ? (
                <div style={{ textAlign: 'center', color: 'rgba(255,255,255,0.5)', marginTop: '2rem' }}>لا توجد تعليقات بعد. كن أول من يعلق!</div>
              ) : (
                comments.map(c => (
                  <div key={c.id} style={{ display: 'flex', gap: '0.8rem' }}>
                    <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'rgba(255,255,255,0.1)', overflow: 'hidden', flexShrink: 0 }}>
                      {c.user.image && <img src={c.user.image} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}
                    </div>
                    <div>
                      <div style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.5)', fontWeight: 'bold', marginBottom: '0.2rem' }}>{c.user.name}</div>
                      <div style={{ fontSize: '0.95rem' }}>{c.content}</div>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div style={{ padding: '1rem', borderTop: '1px solid rgba(255,255,255,0.1)', display: 'flex', gap: '0.5rem' }}>
              <input 
                type="text" 
                value={newComment} 
                onChange={e => setNewComment(e.target.value)}
                placeholder="أضف تعليقاً..." 
                style={{ flex: 1, padding: '0.8rem 1rem', background: 'rgba(255,255,255,0.05)', border: 'none', borderRadius: '20px', color: '#fff', outline: 'none' }}
                onKeyDown={e => e.key === 'Enter' && submitComment()}
              />
              <button onClick={submitComment} style={{ background: 'none', border: 'none', color: 'var(--primary)', fontWeight: 'bold', padding: '0 1rem', cursor: 'pointer' }}>نشر</button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @media (max-width: 768px) {
          .hidden.md\\:block { display: none !important; }
        }
      `}} />
    </div>
  );
}
