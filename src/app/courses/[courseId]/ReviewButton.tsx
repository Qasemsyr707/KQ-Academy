'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Star, X } from 'lucide-react';

export default function ReviewButton({ courseId }: { courseId: string }) {
  const [showReview, setShowReview] = useState(false);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

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
    } catch (err) {
      alert('حدث خطأ أثناء إرسال التقييم');
    }
    setIsSubmitting(false);
  };

  return (
    <>
      <button 
        onClick={() => setShowReview(true)}
        style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', background: 'var(--primary)', color: '#000', padding: '0.8rem 1.5rem', borderRadius: '8px', fontWeight: 'bold', border: 'none', cursor: 'pointer', fontSize: '1rem' }}
      >
        <Star size={18} /> أضف تقييمك
      </button>

      <AnimatePresence>
        {showReview && (
          <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.8)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }} 
              animate={{ scale: 1, opacity: 1 }} 
              exit={{ scale: 0.9, opacity: 0 }} 
              style={{ background: '#111', padding: '2rem', borderRadius: '16px', width: '90%', maxWidth: '500px', border: '1px solid rgba(255,255,255,0.1)', position: 'relative' }}
            >
              <button onClick={() => setShowReview(false)} style={{ position: 'absolute', top: '1rem', left: '1rem', background: 'none', border: 'none', color: '#fff', cursor: 'pointer' }}>
                <X size={24} />
              </button>
              <h3 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '1.5rem', textAlign: 'center' }}>تقييم الكورس</h3>
              
              {submitted ? (
                <div style={{ background: 'rgba(34, 197, 94, 0.1)', padding: '1rem', borderRadius: '8px', color: '#22c55e', textAlign: 'center' }}>
                  شكراً لك! تم إرسال تقييمك بنجاح.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem', flexDirection: 'row-reverse' }}>
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button key={star} onClick={() => setRating(star)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
                        <Star size={40} fill={star <= rating ? "var(--warning)" : "transparent"} color={star <= rating ? "var(--warning)" : "rgba(255,255,255,0.2)"} />
                      </button>
                    ))}
                  </div>
                  <textarea 
                    placeholder="شاركنا رأيك بالكورس والمدرب... (اختياري)"
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    style={{ width: '100%', height: '120px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', padding: '1rem', color: '#fff', resize: 'none', fontFamily: 'inherit' }}
                  />
                  <button onClick={handleSubmit} disabled={isSubmitting} style={{ background: 'var(--primary)', color: '#000', padding: '1rem', borderRadius: '8px', fontWeight: 'bold', border: 'none', cursor: 'pointer', fontSize: '1.1rem' }}>
                    {isSubmitting ? 'جاري الإرسال...' : 'إرسال التقييم'}
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
