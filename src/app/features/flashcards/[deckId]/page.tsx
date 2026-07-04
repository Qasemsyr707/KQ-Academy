'use client';
import Link from 'next/link';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, RotateCcw, Check, X, Brain, Plus } from 'lucide-react';
import React from 'react';

export default function DeckPage({ params }: { params: Promise<{ deckId: string }> }) {
  const deckId = React.use(params).deckId;
  const [deck, setDeck] = useState<any>(null);
  const [flashcards, setFlashcards] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Study state
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [knownCards, setKnownCards] = useState<string[]>([]);
  const [unknownCards, setUnknownCards] = useState<string[]>([]);
  const [isStudyMode, setIsStudyMode] = useState(false);

  // Creation state
  const [isAdding, setIsAdding] = useState(false);
  const [newFront, setNewFront] = useState('');
  const [newBack, setNewBack] = useState('');

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
    fetchDeck();
  }, [deckId]);

  const handleAddCard = async (e: React.FormEvent) => {
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
        setIsAdding(false);
        fetchDeck();
      }
    } catch (e) {
      console.error('Failed to add card');
    }
  };

  const currentCard = flashcards[currentIndex];
  const isFinished = currentIndex >= flashcards.length;

  const handleNext = (knewIt: boolean) => {
    if (knewIt) {
      setKnownCards([...knownCards, currentCard.id]);
    } else {
      setUnknownCards([...unknownCards, currentCard.id]);
    }
    setIsFlipped(false);
    setTimeout(() => {
      setCurrentIndex(currentIndex + 1);
    }, 150);
  };

  const resetDeck = () => {
    setCurrentIndex(0);
    setIsFlipped(false);
    setKnownCards([]);
    setUnknownCards([]);
  };

  if (isLoading) {
    return <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary)' }}>جاري التحميل...</div>;
  }

  if (!deck) {
    return <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ef4444' }}>لم يتم العثور على الحزمة</div>;
  }

  return (
    <div style={{ minHeight: '100vh', padding: '6rem 2rem 2rem', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <div style={{ width: '100%', maxWidth: '800px', marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <Link href="/features/flashcards" style={{ color: 'var(--primary)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
            <ArrowRight size={18} /> العودة للحزم
          </Link>
          <h1 style={{ fontSize: '2rem', display: 'flex', alignItems: 'center', gap: '0.75rem', margin: 0 }}>
            <Brain color="var(--primary)" /> {deck.title}
          </h1>
          <p style={{ color: 'rgba(255,255,255,0.6)', marginTop: '0.5rem' }}>
            عدد البطاقات: {flashcards.length}
          </p>
        </div>
        
        {!isStudyMode && (
          <div style={{ display: 'flex', gap: '1rem' }}>
            <button 
              onClick={() => setIsAdding(true)}
              className="btn"
              style={{ padding: '0.8rem 1.5rem', border: '1px solid rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
            >
              <Plus size={18} /> بطاقة جديدة
            </button>
            <button 
              onClick={() => {
                if (flashcards.length > 0) {
                  setIsStudyMode(true);
                  resetDeck();
                } else {
                  alert('أضف بعض البطاقات أولاً');
                }
              }}
              className="btn btn-solid"
              style={{ padding: '0.8rem 1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
              disabled={flashcards.length === 0}
            >
              <Check size={18} /> ابدأ المراجعة
            </button>
          </div>
        )}

        {isStudyMode && !isFinished && (
          <div style={{ textAlign: 'left', background: 'rgba(255,255,255,0.05)', padding: '1rem', borderRadius: '12px' }}>
            <div style={{ fontSize: '0.9rem', marginBottom: '0.5rem' }}>
              البطاقة <strong style={{ color: 'var(--primary)' }}>{currentIndex + 1}</strong> من <strong>{flashcards.length}</strong>
            </div>
            <div style={{ display: 'flex', gap: '1rem', fontSize: '0.8rem' }}>
              <span style={{ color: 'var(--success)', display: 'flex', alignItems: 'center', gap: '0.2rem' }}><Check size={14}/> عرفتها: {knownCards.length}</span>
              <span style={{ color: '#ef4444', display: 'flex', alignItems: 'center', gap: '0.2rem' }}><X size={14}/> للمراجعة: {unknownCards.length}</span>
            </div>
          </div>
        )}
      </div>

      <div style={{ width: '100%', maxWidth: '800px' }}>
        {isAdding && !isStudyMode && (
          <form onSubmit={handleAddCard} className="glass-card" style={{ padding: '2rem', marginBottom: '2rem', borderRadius: '16px' }}>
            <h3 style={{ marginBottom: '1.5rem', color: '#fff' }}>إضافة بطاقة جديدة</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <textarea 
                value={newFront}
                onChange={(e) => setNewFront(e.target.value)}
                placeholder="وجه البطاقة (السؤال أو المصطلح)"
                style={{ padding: '1rem', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(0,0,0,0.5)', color: '#fff', minHeight: '80px', resize: 'vertical' }}
                required
              />
              <textarea 
                value={newBack}
                onChange={(e) => setNewBack(e.target.value)}
                placeholder="ظهر البطاقة (الإجابة أو التعريف)"
                style={{ padding: '1rem', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(0,0,0,0.5)', color: '#fff', minHeight: '80px', resize: 'vertical' }}
                required
              />
              <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                <button type="submit" className="btn btn-solid" style={{ flex: 1, padding: '0.8rem' }}>إضافة البطاقة</button>
                <button type="button" onClick={() => setIsAdding(false)} className="btn" style={{ padding: '0.8rem 1.5rem', border: '1px solid rgba(255,255,255,0.1)' }}>إلغاء</button>
              </div>
            </div>
          </form>
        )}

        {isStudyMode ? (
          <div style={{ width: '100%', maxWidth: '600px', margin: '0 auto', position: 'relative', perspective: '1000px' }}>
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
                      <h2 style={{ fontSize: '1.8rem', lineHeight: 1.5, color: '#fff', whiteSpace: 'pre-wrap' }}>{currentCard.front}</h2>
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
                      <p style={{ fontSize: '1.4rem', lineHeight: 1.6, color: '#fff', whiteSpace: 'pre-wrap' }}>{currentCard.back}</p>
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
                  <h2 style={{ fontSize: '2rem', marginBottom: '1rem', color: '#fff' }}>عمل رائع! انتهت المراجعة</h2>
                  <p style={{ fontSize: '1.2rem', opacity: 0.8, marginBottom: '2rem' }}>
                    لقد تذكرت <strong style={{ color: 'var(--success)' }}>{knownCards.length}</strong> بطاقة من أصل {flashcards.length}.
                  </p>
                  
                  <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem' }}>
                    <button 
                      onClick={resetDeck}
                      className="btn btn-solid"
                      style={{ padding: '1rem 2rem', fontSize: '1.1rem', display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}
                    >
                      <RotateCcw size={20} /> إعادة المراجعة
                    </button>
                    <button 
                      onClick={() => setIsStudyMode(false)}
                      className="btn"
                      style={{ padding: '1rem 2rem', fontSize: '1.1rem', border: '1px solid rgba(255,255,255,0.2)' }}
                    >
                      إنهاء المراجعة
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        ) : (
          <div>
            {!isAdding && flashcards.length > 0 && (
              <div style={{ display: 'grid', gap: '1rem' }}>
                <h3 style={{ color: '#fff', marginBottom: '1rem' }}>البطاقات ({flashcards.length})</h3>
                {flashcards.map((fc, idx) => (
                  <div key={fc.id} className="glass-card" style={{ padding: '1.5rem', borderRadius: '12px', display: 'flex', gap: '2rem' }}>
                    <div style={{ flex: 1 }}>
                      <strong style={{ color: 'var(--primary)', fontSize: '0.9rem', display: 'block', marginBottom: '0.5rem' }}>الوجه:</strong>
                      <div style={{ color: '#fff', whiteSpace: 'pre-wrap' }}>{fc.front}</div>
                    </div>
                    <div style={{ flex: 1, borderRight: '1px solid rgba(255,255,255,0.1)', paddingRight: '2rem' }}>
                      <strong style={{ color: '#10b981', fontSize: '0.9rem', display: 'block', marginBottom: '0.5rem' }}>الظهر (الإجابة):</strong>
                      <div style={{ color: 'rgba(255,255,255,0.8)', whiteSpace: 'pre-wrap' }}>{fc.back}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
            
            {!isAdding && flashcards.length === 0 && (
              <div style={{ textAlign: 'center', padding: '4rem 2rem' }} className="glass-card">
                <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '1.2rem', marginBottom: '1.5rem' }}>لا يوجد بطاقات في هذه الحزمة حتى الآن.</p>
                <button 
                  onClick={() => setIsAdding(true)}
                  className="btn btn-solid" 
                  style={{ padding: '0.8rem 1.5rem', display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}
                >
                  <Plus size={20} /> أضف أول بطاقة
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
