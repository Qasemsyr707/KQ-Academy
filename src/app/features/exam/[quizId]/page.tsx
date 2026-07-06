'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle, XCircle, ArrowRight, BookOpen, Target, Loader2, Trophy } from 'lucide-react';
import React from 'react';
import { useRouter } from 'next/navigation';

export default function QuizPage({ params }: { params: Promise<{ quizId: string }> }) {
  const quizId = React.use(params).quizId;
  const router = useRouter();
  
  const [quiz, setQuiz] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState<any>(null);

  useEffect(() => {
    const fetchQuiz = async () => {
      try {
        const res = await fetch(`/api/quizzes/${quizId}`);
        if (res.ok) {
          const data = await res.json();
          setQuiz(data.quiz);
        }
      } catch (e) {
        console.error('Failed to fetch quiz');
      }
      setLoading(false);
    };
    fetchQuiz();
  }, [quizId]);

  const handleSelectOption = (questionId: string, optionIndex: number) => {
    setAnswers({ ...answers, [questionId]: optionIndex });
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/quizzes/${quizId}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ answers })
      });
      const data = await res.json();
      setResult(data);
    } catch (e) {
      alert('حدث خطأ أثناء إرسال الإجابات');
    }
    setIsSubmitting(false);
  };

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#050505', color: 'var(--primary)' }}>
        <Loader2 className="animate-spin" size={40} />
      </div>
    );
  }

  if (!quiz) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#050505', color: '#ef4444' }}>
        <h2>لم يتم العثور على الاختبار</h2>
      </div>
    );
  }

  if (result) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#050505', padding: '2rem' }}>
        <motion.div 
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="glass-card"
          style={{ padding: '3rem', maxWidth: '600px', width: '100%', textAlign: 'center', borderRadius: '24px' }}
        >
          {result.passed ? (
            <Trophy size={80} color="var(--primary)" style={{ margin: '0 auto 1.5rem auto' }} />
          ) : (
            <XCircle size={80} color="#ef4444" style={{ margin: '0 auto 1.5rem auto' }} />
          )}
          
          <h2 style={{ fontSize: '2rem', marginBottom: '1rem', color: result.passed ? 'var(--success)' : '#ef4444' }}>
            {result.passed ? 'نجاح مبهر!' : 'لم تجتز الاختبار'}
          </h2>
          
          <div style={{ fontSize: '1.2rem', marginBottom: '2rem', color: 'rgba(255,255,255,0.8)' }}>
            النتيجة: <strong>{result.score.toFixed(1)}%</strong>
            <br />
            (أجبت على {result.correctCount} بشكل صحيح من أصل {result.total})
          </div>

          <p style={{ color: 'rgba(255,255,255,0.6)', marginBottom: '2rem' }}>{result.message}</p>

          <button 
            onClick={() => router.push('/dashboard')}
            className="btn btn-solid"
            style={{ padding: '1rem 2rem', fontSize: '1.1rem', width: '100%' }}
          >
            العودة للوحة القيادة
          </button>
        </motion.div>
      </div>
    );
  }

  const currentQuestion = quiz.questions[currentQuestionIndex];
  const isLastQuestion = currentQuestionIndex === quiz.questions.length - 1;
  const isAnswered = answers[currentQuestion.id] !== undefined;

  return (
    <div style={{ minHeight: '100vh', background: '#050505', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '4rem 2rem' }}>
      
      <div style={{ width: '100%', maxWidth: '800px', marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: '1.8rem', color: '#fff', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <Target color="var(--primary)" /> {quiz.title}
          </h1>
        </div>
        <div style={{ background: 'rgba(203, 161, 83, 0.1)', padding: '0.5rem 1rem', borderRadius: '20px', color: 'var(--primary)', fontWeight: 'bold' }}>
          السؤال {currentQuestionIndex + 1} من {quiz.questions.length}
        </div>
      </div>

      <div style={{ width: '100%', maxWidth: '800px' }}>
        <AnimatePresence mode="wait">
          <motion.div
            key={currentQuestion.id}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="glass-card"
            style={{ padding: '3rem', borderRadius: '24px' }}
          >
            <h2 style={{ fontSize: '1.5rem', marginBottom: '2rem', color: '#fff', lineHeight: 1.6 }}>
              {currentQuestion.text}
            </h2>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {JSON.parse(currentQuestion.options).map((opt: string, idx: number) => {
                const isSelected = answers[currentQuestion.id] === idx;
                return (
                  <button
                    key={idx}
                    onClick={() => handleSelectOption(currentQuestion.id, idx)}
                    style={{
                      padding: '1.5rem',
                      textAlign: 'right',
                      background: isSelected ? 'rgba(203, 161, 83, 0.15)' : 'rgba(255,255,255,0.03)',
                      border: `2px solid ${isSelected ? 'var(--primary)' : 'rgba(255,255,255,0.1)'}`,
                      borderRadius: '12px',
                      color: '#fff',
                      fontSize: '1.1rem',
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '1rem'
                    }}
                  >
                    <div style={{ 
                      width: '24px', height: '24px', borderRadius: '50%', 
                      border: `2px solid ${isSelected ? 'var(--primary)' : 'rgba(255,255,255,0.3)'}`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      background: isSelected ? 'var(--primary)' : 'transparent'
                    }}>
                      {isSelected && <div style={{ width: '10px', height: '10px', background: '#000', borderRadius: '50%' }} />}
                    </div>
                    {opt}
                  </button>
                );
              })}
            </div>

            <div style={{ marginTop: '3rem', display: 'flex', justifyContent: 'space-between' }}>
              <button
                onClick={() => setCurrentQuestionIndex(Math.max(0, currentQuestionIndex - 1))}
                disabled={currentQuestionIndex === 0}
                className="btn"
                style={{ padding: '1rem 2rem', opacity: currentQuestionIndex === 0 ? 0.5 : 1 }}
              >
                السابق
              </button>

              {!isLastQuestion ? (
                <button
                  onClick={() => setCurrentQuestionIndex(currentQuestionIndex + 1)}
                  disabled={!isAnswered}
                  className="btn btn-solid"
                  style={{ padding: '1rem 2rem', opacity: !isAnswered ? 0.5 : 1, display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                >
                  التالي <ArrowRight size={18} />
                </button>
              ) : (
                <button
                  onClick={handleSubmit}
                  disabled={!isAnswered || isSubmitting}
                  className="btn btn-solid"
                  style={{ padding: '1rem 2rem', background: 'var(--success)', color: '#fff', border: 'none', opacity: (!isAnswered || isSubmitting) ? 0.5 : 1 }}
                >
                  {isSubmitting ? <Loader2 className="animate-spin" /> : 'إنهاء وإرسال الإجابات'}
                </button>
              )}
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      <style jsx global>{`
        .animate-spin { animation: spin 1s linear infinite; }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
