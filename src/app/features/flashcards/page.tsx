'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, ArrowLeft, RotateCcw, Check, X, Brain } from 'lucide-react';
import Link from 'next/link';

// Sample mock data for flashcards
const flashcardsData = [
  { id: 1, front: "ما هو الـ DOM في لغة JavaScript؟", back: "هو اختصار لـ Document Object Model، وهو واجهة برمجة تمثل المستند كشجرة، مما يتيح للبرامج تغيير بنيته وشكله ومحتواه." },
  { id: 2, front: "ما هو الفرق بين let و const؟", back: "let تستخدم لتعريف متغير يمكن تغيير قيمته لاحقاً، بينما const تستخدم لتعريف ثابت لا يمكن إعادة تعيين قيمته بعد تعريفه." },
  { id: 3, front: "ما هو قانون نيوتن الثاني؟", back: "القوة المحصلة المؤثرة على جسم ما تساوي كتلة الجسم مضروبة في تسارعه (F = m × a)." },
  { id: 4, front: "ما هي وظيفة الميتوكندريا في الخلية؟", back: "تعتبر الميتوكندريا 'مصنع الطاقة' في الخلية، حيث تقوم بإنتاج الطاقة (ATP) من خلال التنفس الخلوي." },
];

export default function FlashcardsPage() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [knownCards, setKnownCards] = useState<number[]>([]);
  const [unknownCards, setUnknownCards] = useState<number[]>([]);
  
  const currentCard = flashcardsData[currentIndex];
  const isFinished = currentIndex >= flashcardsData.length;

  const handleNext = (knewIt: boolean) => {
    if (knewIt) {
      setKnownCards([...knownCards, currentCard.id]);
    } else {
      setUnknownCards([...unknownCards, currentCard.id]);
    }
    setIsFlipped(false);
    setTimeout(() => {
      setCurrentIndex(currentIndex + 1);
    }, 150); // small delay to wait for flip back animation
  };

  const resetDeck = () => {
    setCurrentIndex(0);
    setIsFlipped(false);
    setKnownCards([]);
    setUnknownCards([]);
  };

  return (
    <div style={{ minHeight: '100vh', padding: '6rem 2rem 2rem', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <div style={{ width: '100%', maxWidth: '800px', marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <Link href="/dashboard" style={{ color: 'var(--primary)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
            <ArrowRight size={18} /> العودة للوحة التحكم
          </Link>
          <h1 style={{ fontSize: '2rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <Brain color="var(--primary)" /> البطاقات الذكية
          </h1>
          <p style={{ color: 'rgba(255,255,255,0.6)' }}>اختبر ذاكرتك ومعلوماتك عبر بطاقات فلاش التفاعلية</p>
        </div>
        
        {/* Progress Tracker */}
        {!isFinished && (
          <div style={{ textAlign: 'left', background: 'rgba(255,255,255,0.05)', padding: '1rem', borderRadius: '12px' }}>
            <div style={{ fontSize: '0.9rem', marginBottom: '0.5rem' }}>
              البطاقة <strong style={{ color: 'var(--primary)' }}>{currentIndex + 1}</strong> من <strong>{flashcardsData.length}</strong>
            </div>
            <div style={{ display: 'flex', gap: '1rem', fontSize: '0.8rem' }}>
              <span style={{ color: 'var(--success)', display: 'flex', alignItems: 'center', gap: '0.2rem' }}><Check size={14}/> عرفتها: {knownCards.length}</span>
              <span style={{ color: '#ef4444', display: 'flex', alignItems: 'center', gap: '0.2rem' }}><X size={14}/> أحتاج مراجعة: {unknownCards.length}</span>
            </div>
          </div>
        )}
      </div>

      <div style={{ width: '100%', maxWidth: '600px', position: 'relative', perspective: '1000px' }}>
        <AnimatePresence mode="wait">
          {!isFinished ? (
            <motion.div
              key={currentIndex}
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -50 }}
              transition={{ duration: 0.3 }}
              style={{ width: '100%' }}
            >
              {/* Card Container for 3D flip */}
              <div 
                style={{
                  width: '100%', height: '350px', cursor: 'pointer',
                  position: 'relative', transformStyle: 'preserve-3d',
                  transition: 'transform 0.6s cubic-bezier(0.4, 0.2, 0.2, 1)',
                  transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)'
                }}
                onClick={() => setIsFlipped(!isFlipped)}
              >
                {/* Front */}
                <div className="glass-card" style={{
                  position: 'absolute', width: '100%', height: '100%',
                  backfaceVisibility: 'hidden', display: 'flex', flexDirection: 'column',
                  alignItems: 'center', justifyContent: 'center', padding: '2rem', textAlign: 'center',
                  background: 'linear-gradient(135deg, rgba(203,161,83,0.1), rgba(10,10,10,0.9))',
                  border: '2px solid rgba(203,161,83,0.3)', borderRadius: '24px'
                }}>
                  <div style={{ position: 'absolute', top: '1.5rem', opacity: 0.5, fontSize: '0.9rem' }}>اضغط للقلب</div>
                  <h2 style={{ fontSize: '1.8rem', lineHeight: 1.5, color: '#fff' }}>{currentCard.front}</h2>
                </div>

                {/* Back */}
                <div className="glass-card" style={{
                  position: 'absolute', width: '100%', height: '100%',
                  backfaceVisibility: 'hidden', display: 'flex', flexDirection: 'column',
                  alignItems: 'center', justifyContent: 'center', padding: '2rem', textAlign: 'center',
                  background: 'linear-gradient(135deg, rgba(16,185,129,0.1), rgba(10,10,10,0.9))',
                  border: '2px solid rgba(16,185,129,0.3)', borderRadius: '24px',
                  transform: 'rotateY(180deg)'
                }}>
                  <div style={{ position: 'absolute', top: '1.5rem', opacity: 0.5, fontSize: '0.9rem', color: '#10b981' }}>الإجابة</div>
                  <p style={{ fontSize: '1.4rem', lineHeight: 1.6, color: '#fff' }}>{currentCard.back}</p>
                </div>
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem', marginTop: '2rem' }}>
                <button 
                  onClick={() => handleNext(false)}
                  className="btn"
                  style={{ 
                    flex: 1, padding: '1rem', background: 'rgba(239, 68, 68, 0.1)', 
                    color: '#ef4444', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '12px',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
                    fontSize: '1.1rem', fontWeight: 'bold', cursor: 'pointer', opacity: isFlipped ? 1 : 0.5,
                    pointerEvents: isFlipped ? 'auto' : 'none', transition: 'all 0.3s'
                  }}
                >
                  <X size={20} /> أحتاج مراجعتها
                </button>
                <button 
                  onClick={() => handleNext(true)}
                  className="btn"
                  style={{ 
                    flex: 1, padding: '1rem', background: 'rgba(16, 185, 129, 0.1)', 
                    color: '#10b981', border: '1px solid rgba(16,185,129,0.3)', borderRadius: '12px',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
                    fontSize: '1.1rem', fontWeight: 'bold', cursor: 'pointer', opacity: isFlipped ? 1 : 0.5,
                    pointerEvents: isFlipped ? 'auto' : 'none', transition: 'all 0.3s'
                  }}
                >
                  <Check size={20} /> تذكرتها!
                </button>
              </div>
            </motion.div>
          ) : (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="glass-card"
              style={{ padding: '3rem 2rem', textAlign: 'center', borderRadius: '24px' }}
            >
              <Trophy size={64} color="var(--primary)" style={{ margin: '0 auto 1.5rem auto' }} />
              <h2 style={{ fontSize: '2rem', marginBottom: '1rem' }}>عمل رائع! انتهت المراجعة</h2>
              <p style={{ fontSize: '1.2rem', opacity: 0.8, marginBottom: '2rem' }}>
                لقد تذكرت <strong style={{ color: 'var(--success)' }}>{knownCards.length}</strong> بطاقة من أصل {flashcardsData.length}.
              </p>
              
              <button 
                onClick={resetDeck}
                className="btn btn-solid"
                style={{ padding: '1rem 2rem', fontSize: '1.1rem', display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}
              >
                <RotateCcw size={20} /> إعادة المراجعة
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

// Dummy Trophy component since it's not imported at top
function Trophy({ size, color, style }: any) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={style}>
      <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/>
      <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/>
      <path d="M4 22h16"/>
      <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"/>
      <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/>
      <path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"/>
    </svg>
  );
}
