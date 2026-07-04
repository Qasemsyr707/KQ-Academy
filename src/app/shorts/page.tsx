'use client';

import { useState } from 'react';

// ─────────────────────────────────────
// Types
// ─────────────────────────────────────
type ShortStatus = 'pending' | 'approved' | 'rejected';

interface Short {
  id: string;
  videoUrl: string;
  thumbnail: string;
  title: string;
  instructor: string;
  instructorAvatar: string;
  courseId: number;
  courseTitle: string;
  likes: number;
  comments: number;
  status: ShortStatus;
}

// ─────────────────────────────────────
// Mock Data (approved only for viewers)
// ─────────────────────────────────────
const APPROVED_SHORTS: Short[] = [
  {
    id: '1',
    videoUrl: '',
    thumbnail: 'https://images.unsplash.com/photo-1552664730-d307ca884978?w=800&q=80',
    title: 'كيف تطلق أول حملة إعلانية لك بـ 10$ فقط؟ 💸',
    instructor: 'د. كريم حسن',
    instructorAvatar: 'ك',
    courseId: 4,
    courseTitle: 'التسويق الرقمي الاحترافي',
    likes: 1250,
    comments: 84,
    status: 'approved',
  },
  {
    id: '2',
    videoUrl: '',
    thumbnail: 'https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=800&q=80',
    title: 'أهم 3 أخطاء للمبرمجين المبتدئين في React ⚛️',
    instructor: 'م. طارق العبد',
    instructorAvatar: 'ط',
    courseId: 5,
    courseTitle: 'برمجة React Native من الصفر',
    likes: 3420,
    comments: 215,
    status: 'approved',
  },
  {
    id: '3',
    videoUrl: '',
    thumbnail: 'https://images.unsplash.com/photo-1542204165-65bf26472b9b?w=800&q=80',
    title: 'سر قانون كيرشوف اللي بيضيع الطلاب بالامتحان! ⚡',
    instructor: 'أ. محمد الأحمد',
    instructorAvatar: 'م',
    courseId: 1,
    courseTitle: 'الفيزياء الشاملة للبكالوريا',
    likes: 5600,
    comments: 420,
    status: 'approved',
  },
  {
    id: '4',
    videoUrl: '',
    thumbnail: 'https://images.unsplash.com/photo-1516321497487-e288fb19713f?w=800&q=80',
    title: 'الفرق بين Supervised و Unsupervised Learning في دقيقتين 🤖',
    instructor: 'م. سعيد الرفاعي',
    instructorAvatar: 'س',
    courseId: 6,
    courseTitle: 'أساسيات الذكاء الاصطناعي',
    likes: 8900,
    comments: 630,
    status: 'approved',
  },
];

// ─────────────────────────────────────
// Short Card (feed item)
// ─────────────────────────────────────
function ShortCard({ short }: { short: Short }) {
  const [liked, setLiked] = useState(false);
  const [following, setFollowing] = useState(false);
  const [showFullTitle, setShowFullTitle] = useState(false);

  return (
    <div className="relative w-full" style={{ height: '100vh', maxHeight: '900px' }}>
      {/* Background image / video placeholder */}
      <div
        className="absolute inset-0 bg-center bg-cover"
        style={{ backgroundImage: `url(${short.thumbnail})` }}
      />
      {/* Dark overlay gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-transparent to-black/90" />

      {/* Play Button overlay */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="w-20 h-20 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center border border-white/30">
          <svg className="w-8 h-8 text-white ml-1" fill="currentColor" viewBox="0 0 24 24">
            <path d="M8 5v14l11-7z"/>
          </svg>
        </div>
      </div>

      {/* Right Actions */}
      <div className="absolute right-4 bottom-48 flex flex-col items-center gap-6 z-10">
        {/* Like */}
        <button
          onClick={() => setLiked(!liked)}
          className="flex flex-col items-center gap-1 group"
        >
          <div className={`w-12 h-12 rounded-full flex items-center justify-center backdrop-blur-sm transition-all duration-300 ${liked ? 'bg-rose-500/80' : 'bg-black/40 group-hover:bg-black/60'}`}>
            <svg className={`w-6 h-6 transition-colors ${liked ? 'text-white' : 'text-white'}`} fill={liked ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
            </svg>
          </div>
          <span className="text-white text-xs font-bold drop-shadow">{(short.likes + (liked ? 1 : 0)).toLocaleString()}</span>
        </button>

        {/* Comment */}
        <button className="flex flex-col items-center gap-1 group">
          <div className="w-12 h-12 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center group-hover:bg-black/60 transition-all">
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
            </svg>
          </div>
          <span className="text-white text-xs font-bold drop-shadow">{short.comments}</span>
        </button>

        {/* Share */}
        <button className="flex flex-col items-center gap-1 group">
          <div className="w-12 h-12 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center group-hover:bg-black/60 transition-all">
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8M16 6l-4-4-4 4M12 2v13"/>
            </svg>
          </div>
          <span className="text-white text-xs font-bold drop-shadow">مشاركة</span>
        </button>
      </div>

      {/* Bottom Info */}
      <div className="absolute bottom-0 left-0 right-0 p-5 z-10">
        {/* Instructor row */}
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 rounded-full bg-indigo-600 flex items-center justify-center text-white font-bold text-lg border-2 border-white/50 flex-shrink-0">
            {short.instructorAvatar}
          </div>
          <span className="text-white font-bold text-base drop-shadow flex-1">{short.instructor}</span>
          <button
            onClick={() => setFollowing(!following)}
            className={`px-4 py-1.5 rounded-full text-sm font-bold border transition-all duration-300 ${following ? 'bg-white/20 border-white/40 text-white' : 'border-white text-white hover:bg-white/10'}`}
          >
            {following ? 'متابَق' : 'متابعة'}
          </button>
        </div>

        {/* Title */}
        <p
          className={`text-white font-semibold text-base mb-4 drop-shadow cursor-pointer leading-relaxed ${!showFullTitle ? 'line-clamp-2' : ''}`}
          onClick={() => setShowFullTitle(!showFullTitle)}
          dir="rtl"
        >
          {short.title}
        </p>

        {/* Course CTA */}
        <a
          href={`/course/${short.courseId}`}
          className="flex items-center gap-2 bg-indigo-600/80 backdrop-blur-sm hover:bg-indigo-600 transition-all duration-300 text-white font-bold px-5 py-3 rounded-xl w-full justify-center border border-indigo-400/30"
        >
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
            <path d="M8 5v14l11-7z"/>
          </svg>
          <span>شاهد الكورس الكامل: {short.courseTitle}</span>
        </a>
      </div>
    </div>
  );
}

// ─────────────────────────────────────
// Main Page
// ─────────────────────────────────────
export default function ShortsPage() {
  const [currentIndex, setCurrentIndex] = useState(0);

  const handleNext = () => {
    if (currentIndex < APPROVED_SHORTS.length - 1) setCurrentIndex(currentIndex + 1);
  };
  const handlePrev = () => {
    if (currentIndex > 0) setCurrentIndex(currentIndex - 1);
  };

  const current = APPROVED_SHORTS[currentIndex];

  return (
    <div className="min-h-screen bg-black flex items-center justify-center relative overflow-hidden">
      {/* Nav */}
      <div className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 py-4 bg-gradient-to-b from-black/80 to-transparent">
        <a href="/" className="text-white/70 hover:text-white transition-colors flex items-center gap-2">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path d="M19 12H5M12 19l-7-7 7-7"/>
          </svg>
          الرئيسية
        </a>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
          <span className="text-white font-bold text-lg">Shorts</span>
        </div>
        <a
          href="/instructor/shorts"
          className="text-white/70 hover:text-white text-sm transition-colors flex items-center gap-1"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path d="M12 5v14M5 12h14"/>
          </svg>
          رفع فيديو
        </a>
      </div>

      {/* Feed (single card view with navigation) */}
      <div className="relative w-full max-w-md mx-auto" style={{ height: '100vh', maxHeight: '900px' }}>
        <ShortCard short={current} />

        {/* Navigation arrows */}
        <button
          onClick={handlePrev}
          disabled={currentIndex === 0}
          className="absolute top-1/2 -translate-y-1/2 left-4 z-20 w-10 h-10 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center text-white disabled:opacity-20 hover:bg-black/70 transition-all"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path d="M15 18l-6-6 6-6"/>
          </svg>
        </button>
        <button
          onClick={handleNext}
          disabled={currentIndex === APPROVED_SHORTS.length - 1}
          className="absolute top-1/2 -translate-y-1/2 right-4 z-20 w-10 h-10 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center text-white disabled:opacity-20 hover:bg-black/70 transition-all"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path d="M9 18l6-6-6-6"/>
          </svg>
        </button>

        {/* Progress dots */}
        <div className="absolute top-20 left-1/2 -translate-x-1/2 flex gap-1.5 z-20">
          {APPROVED_SHORTS.map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrentIndex(i)}
              className={`h-1 rounded-full transition-all duration-300 ${i === currentIndex ? 'w-6 bg-white' : 'w-1.5 bg-white/40'}`}
            />
          ))}
        </div>
      </div>

      {/* Sidebar (larger screens) */}
      <div className="hidden xl:flex flex-col gap-3 fixed right-8 top-1/2 -translate-y-1/2 z-20">
        {APPROVED_SHORTS.map((short, i) => (
          <button
            key={short.id}
            onClick={() => setCurrentIndex(i)}
            className={`w-16 h-24 rounded-xl overflow-hidden border-2 transition-all duration-300 ${i === currentIndex ? 'border-indigo-400 scale-110' : 'border-white/20 opacity-50 hover:opacity-80'}`}
          >
            <img src={short.thumbnail} alt={short.title} className="w-full h-full object-cover" />
          </button>
        ))}
      </div>
    </div>
  );
}
