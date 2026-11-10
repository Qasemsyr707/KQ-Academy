'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Star, X } from 'lucide-react';
import { backdrop, modal } from '@/lib/motion';

export default function ReviewButton({ courseId }: { courseId: string }) {
  const [showReview, setShowReview] = useState(false);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    if (!showReview) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setShowReview(false);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [showReview]);

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      const res = await fetch('/api/reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ courseId, rating, comment })
      });
      if (res.ok) {
        setSubmitted(true);
      } else {
        const data = await res.json();
        alert(data.error);
      }
    } catch {
      alert('حدث خطأ أثناء إرسال التقييم');
    }
    setIsSubmitting(false);
  };

  return (
    <>
      <button type="button" onClick={() => setShowReview(true)} className="btn btn-solid">
        <Star size={18} aria-hidden="true" /> أضف تقييمك
      </button>

      <AnimatePresence>
        {showReview && (
          <div role="dialog" aria-modal="true" aria-labelledby="review-dialog-title" style={{ position: 'fixed', inset: 0, zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
            <motion.div
              variants={backdrop} initial="hidden" animate="visible" exit="exit"
              onClick={() => setShowReview(false)}
              style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.8)' }}
            />
            <motion.div
              variants={modal} initial="hidden" animate="visible" exit="exit"
              className="glass-panel"
              style={{ padding: '2rem', width: '100%', maxWidth: '500px', position: 'relative', borderColor: 'var(--line-gold)' }}
            >
              <button type="button" onClick={() => setShowReview(false)} aria-label="إغلاق" autoFocus style={{ position: 'absolute', top: '1rem', left: '1rem', width: 40, height: 40, display: 'grid', placeItems: 'center', borderRadius: '12px', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--line-2)', color: '#fff', cursor: 'pointer' }}>
                <X size={20} aria-hidden="true" />
              </button>
              <h3 id="review-dialog-title" style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '1.5rem', textAlign: 'center' }}>تقييم الكورس</h3>
              
              {submitted ? (
                <div style={{ background: 'rgba(34, 197, 94, 0.1)', padding: '1rem', borderRadius: '8px', color: '#22c55e', textAlign: 'center' }}>
                  شكراً لك! تم إرسال تقييمك بنجاح.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem', flexDirection: 'row-reverse' }}>
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button key={star} type="button" onClick={() => setRating(star)} aria-label={`${star} من 5`} aria-pressed={star <= rating} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, transition: 'transform var(--dur-1) var(--ease-out)', transform: star <= rating ? 'scale(1.06)' : 'none' }}>
                        <Star size={40} fill={star <= rating ? "var(--warning)" : "transparent"} color={star <= rating ? "var(--warning)" : "rgba(255,255,255,0.2)"} />
                      </button>
                    ))}
                  </div>
                  <textarea 
                    placeholder="شاركنا رأيك بالكورس والمدرب... (اختياري)"
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    aria-label="تعليقك على الكورس"
                    style={{ width: '100%', height: '120px', resize: 'none' }}
                  />
                  <button type="button" onClick={handleSubmit} disabled={isSubmitting} className="btn btn-solid btn-lg" style={{ width: '100%' }}>
                    {isSubmitting ? <><span className="loader" aria-hidden="true" /> جاري الإرسال...</> : 'إرسال التقييم'}
                  </button>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
