'use client';

import { useState, useEffect } from 'react';
import { ArrowRight, Plus, Trash2, ArrowLeft, RefreshCw, CheckCircle, XCircle } from 'lucide-react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';

export default function FlashcardDeckPage() {
  const { id: deckId } = useParams();
  const [deck, setDeck] = useState<any>(null);
  const [flashcards, setFlashcards] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Create mode state
  const [isCreating, setIsCreating] = useState(false);
  const [newFront, setNewFront] = useState('');
  const [newBack, setNewBack] = useState('');

  // Study mode state
  const [isStudying, setIsStudying] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [studyStats, setStudyStats] = useState({ correct: 0, incorrect: 0 });

  const fetchDeck = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/flashcards/${deckId}`);
      if (res.ok) {
        const data = await res.json();
        setDeck(data.deck);
        setFlashcards(data.flashcards || []);
      }
    } catch (e) {
      console.error('Failed to fetch deck');
    }
    setIsLoading(false);
  };

  useEffect(() => {
    if (deckId) {
      fetchDeck();
    }
  }, [deckId]);

  const handleCreateCard = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFront.trim() || !newBack.trim()) return;

    try {
      const res = await fetch(`/api/flashcards/${deckId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ front: newFront.trim(), back: newBack.trim() })
      });
      if (res.ok) {
        setNewFront('');
        setNewBack('');
        setIsCreating(false);
        fetchDeck();
      }
    } catch (e) {
      console.error('Failed to create card');
    }
  };

  const startStudying = () => {
    setIsStudying(true);
    setCurrentIndex(0);
    setIsFlipped(false);
    setStudyStats({ correct: 0, incorrect: 0 });
  };

  const handleAnswer = (isCorrect: boolean) => {
    setStudyStats(prev => ({
      ...prev,
      [isCorrect ? 'correct' : 'incorrect']: prev[isCorrect ? 'correct' : 'incorrect'] + 1
    }));
    
    if (currentIndex < flashcards.length - 1) {
      setIsFlipped(false);
      setCurrentIndex(prev => prev + 1);
    } else {
      // Finished
      setCurrentIndex(flashcards.length);
    }
  };

  if (isLoading) {
    return <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary)' }}>جاري التحميل...</div>;
  }

  if (!deck) {
    return <div style={{ textAlign: 'center', padding: '5rem', color: '#ef4444' }}>الحزمة غير موجودة.</div>;
  }

  // --- STUDY MODE UI ---
  if (isStudying) {
    const isFinished = currentIndex >= flashcards.length;

    return (
      <div style={{ minHeight: '100vh', padding: '6rem 2rem 2rem', display: 'flex', flexDirection: 'column', alignItems: 'center', background: '#050505', color: '#fff' }}>
        <div style={{ width: '100%', maxWidth: '800px' }}>
          <button onClick={() => setIsStudying(false)} style={{ background: 'none', border: 'none', color: 'var(--primary)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '2rem', fontSize: '1rem' }}>
            <ArrowRight size={18} /> إنهاء المراجعة
          </button>

          {isFinished ? (
            <div className="glass-card" style={{ padding: '4rem 2rem', textAlign: 'center', borderRadius: '16px' }}>
              <h2 style={{ fontSize: '2rem', marginBottom: '1rem', color: 'var(--primary)' }}>اكتملت المراجعة! 🎉</h2>
              <div style={{ display: 'flex', justifyContent: 'center', gap: '3rem', marginBottom: '3rem' }}>
                <div>
                  <div style={{ fontSize: '3rem', fontWeight: 'bold', color: '#22c55e' }}>{studyStats.correct}</div>
                  <div style={{ color: 'rgba(255,255,255,0.6)' }}>إجابات صحيحة</div>
                </div>
                <div>
                  <div style={{ fontSize: '3rem', fontWeight: 'bold', color: '#ef4444' }}>{studyStats.incorrect}</div>
                  <div style={{ color: 'rgba(255,255,255,0.6)' }}>إجابات خاطئة</div>
                </div>
              </div>
              <button onClick={startStudying} className="btn btn-solid" style={{ padding: '0.8rem 2rem', display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
                <RefreshCw size={20} /> إعادة المراجعة
              </button>
            </div>
          ) : (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem', color: 'rgba(255,255,255,0.5)' }}>
                <span>البطاقة {currentIndex + 1} من {flashcards.length}</span>
                <span>{deck.title}</span>
              </div>
              
              <div style={{ perspective: '1000px', height: '400px', marginBottom: '2rem' }}>
                <motion.div
                  style={{
                    width: '100%', height: '100%', position: 'relative',
                    transformStyle: 'preserve-3d', cursor: 'pointer'
                  }}
                  animate={{ rotateX: isFlipped ? 180 : 0 }}
                  transition={{ duration: 0.6, type: 'spring', stiffness: 200, damping: 20 }}
                  onClick={() => setIsFlipped(!isFlipped)}
                >
                  {/* Front */}
                  <div style={{
                    position: 'absolute', width: '100%', height: '100%', backfaceVisibility: 'hidden',
                    background: 'linear-gradient(135deg, rgba(203,161,83,0.1), rgba(0,0,0,0.8))',
                    border: '1px solid rgba(203,161,83,0.3)', borderRadius: '24px',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem',
                    textAlign: 'center', fontSize: '2rem', fontWeight: 'bold', boxShadow: '0 20px 40px rgba(0,0,0,0.5)'
                  }}>
                    {flashcards[currentIndex].front}
                  </div>
                  
                  {/* Back */}
                  <div style={{
                    position: 'absolute', width: '100%', height: '100%', backfaceVisibility: 'hidden',
                    background: 'linear-gradient(135deg, rgba(59,130,246,0.1), rgba(0,0,0,0.8))',
                    border: '1px solid rgba(59,130,246,0.3)', borderRadius: '24px',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem',
                    textAlign: 'center', fontSize: '1.8rem', transform: 'rotateX(180deg)', boxShadow: '0 20px 40px rgba(0,0,0,0.5)'
                  }}>
                    {flashcards[currentIndex].back}
                  </div>
                </motion.div>
              </div>

              {isFlipped && (
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
                  <button onClick={() => handleAnswer(false)} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '1rem 2rem', borderRadius: '12px', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid #ef4444', color: '#ef4444', fontSize: '1.1rem', cursor: 'pointer' }}>
                    <XCircle size={24} /> لم أتذكرها
                  </button>
                  <button onClick={() => handleAnswer(true)} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '1rem 2rem', borderRadius: '12px', background: 'rgba(34, 197, 94, 0.1)', border: '1px solid #22c55e', color: '#22c55e', fontSize: '1.1rem', cursor: 'pointer' }}>
                    <CheckCircle size={24} /> تذكرتها
                  </button>
                </motion.div>
              )}
              {!isFlipped && (
                <div style={{ textAlign: 'center', color: 'rgba(255,255,255,0.4)', marginTop: '2rem' }}>
                  اضغط على البطاقة لقلبها ومعرفة الإجابة
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    );
  }

  // --- MANAGEMENT MODE UI ---
  return (
    <div style={{ minHeight: '100vh', padding: '6rem 2rem 2rem', display: 'flex', flexDirection: 'column', alignItems: 'center', background: '#050505', color: '#fff' }}>
      <div style={{ width: '100%', maxWidth: '800px', marginBottom: '3rem' }}>
        <Link href="/features/flashcards" style={{ color: 'var(--primary)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
          <ArrowRight size={18} /> العودة للحزم
        </Link>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h1 style={{ fontSize: '2rem', marginBottom: '0.2rem' }}>{deck.title}</h1>
            <p style={{ color: 'rgba(255,255,255,0.6)' }}>{flashcards.length} بطاقة في هذه الحزمة</p>
          </div>
          <div style={{ display: 'flex', gap: '1rem' }}>
            {flashcards.length > 0 && (
              <button 
                onClick={startStudying}
                className="btn btn-solid" 
                style={{ padding: '0.8rem 1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem', background: '#3b82f6', color: '#fff' }}
              >
                <RefreshCw size={20} /> ابدأ المراجعة
              </button>
            )}
            <button 
              onClick={() => setIsCreating(true)}
              className="btn btn-solid" 
              style={{ padding: '0.8rem 1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
            >
              <Plus size={20} /> إضافة بطاقة
            </button>
          </div>
        </div>
      </div>

      <div style={{ width: '100%', maxWidth: '800px' }}>
        {isCreating && (
          <form onSubmit={handleCreateCard} className="glass-card" style={{ padding: '2rem', marginBottom: '2rem', borderRadius: '16px' }}>
            <h3 style={{ marginBottom: '1rem', color: '#fff' }}>بطاقة جديدة</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '1rem' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', color: 'rgba(255,255,255,0.6)' }}>الوجه (السؤال / المصطلح)</label>
                <textarea 
                  value={newFront}
                  onChange={(e) => setNewFront(e.target.value)}
                  style={{ width: '100%', padding: '0.8rem', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(0,0,0,0.5)', color: '#fff', resize: 'vertical', minHeight: '80px' }}
                  required
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', color: 'rgba(255,255,255,0.6)' }}>الظهر (الجواب / الشرح)</label>
                <textarea 
                  value={newBack}
                  onChange={(e) => setNewBack(e.target.value)}
                  style={{ width: '100%', padding: '0.8rem', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(0,0,0,0.5)', color: '#fff', resize: 'vertical', minHeight: '80px' }}
                  required
                />
              </div>
            </div>
            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
              <button type="button" onClick={() => setIsCreating(false)} className="btn" style={{ padding: '0.8rem 1.5rem', border: '1px solid rgba(255,255,255,0.1)' }}>إلغاء</button>
              <button type="submit" className="btn btn-solid" style={{ padding: '0.8rem 1.5rem' }}>حفظ البطاقة</button>
            </div>
          </form>
        )}

        {flashcards.length === 0 ? (
          <div className="glass-card" style={{ padding: '4rem 2rem', textAlign: 'center', borderRadius: '16px' }}>
            <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '1.2rem', marginBottom: '1.5rem' }}>هذه الحزمة فارغة.</p>
            <button 
              onClick={() => setIsCreating(true)}
              className="btn btn-solid" 
              style={{ padding: '0.8rem 1.5rem', display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}
            >
              <Plus size={20} /> أضف أول بطاقة
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {flashcards.map((card, index) => (
              <div key={card.id} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '12px', padding: '1.5rem' }}>
                <div>
                  <div style={{ color: 'var(--primary)', fontSize: '0.8rem', marginBottom: '0.5rem', fontWeight: 'bold' }}>الوجه</div>
                  <div style={{ fontSize: '1.1rem', whiteSpace: 'pre-wrap' }}>{card.front}</div>
                </div>
                <div style={{ paddingRight: '1rem', borderRight: '1px solid rgba(255,255,255,0.1)' }}>
                  <div style={{ color: '#3b82f6', fontSize: '0.8rem', marginBottom: '0.5rem', fontWeight: 'bold' }}>الظهر</div>
                  <div style={{ fontSize: '1.1rem', whiteSpace: 'pre-wrap' }}>{card.back}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
