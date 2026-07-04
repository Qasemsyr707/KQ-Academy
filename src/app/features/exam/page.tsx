'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Timer, AlertTriangle, CheckCircle, XCircle, ArrowRight, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

type ExamQuestion = {
  id: string;
  text: string;
  options: string[];
  correctAnswer: number;
};

export default function ExamSimulatorPage() {
  const [examQuestions, setExamQuestions] = useState<ExamQuestion[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hasStarted, setHasStarted] = useState(false);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<number, number>>({});
  const [timeLeft, setTimeLeft] = useState(10 * 60); // 10 minutes in seconds
  const [isFinished, setIsFinished] = useState(false);
  const [score, setScore] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch questions on mount
  useEffect(() => {
    const fetchQuestions = async () => {
      try {
        const res = await fetch('/api/exams/simulator');
        if (res.ok) {
          const data = await res.json();
          setExamQuestions(data.questions || []);
        }
      } catch (e) {
        console.error('Failed to fetch questions');
      }
      setIsLoading(false);
    };
    fetchQuestions();
  }, []);

  // Timer logic
  useEffect(() => {
    let timer: any;
    if (hasStarted && !isFinished && timeLeft > 0) {
      timer = setInterval(() => {
        setTimeLeft((prev) => prev - 1);
      }, 1000);
    } else if (timeLeft === 0 && !isFinished) {
      finishExam();
    }
    return () => clearInterval(timer);
  }, [hasStarted, timeLeft, isFinished]);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const handleSelectOption = (optionIndex: number) => {
    setSelectedAnswers({
      ...selectedAnswers,
      [currentQuestionIndex]: optionIndex
    });
  };

  const finishExam = async () => {
    let calculatedScore = 0;
    examQuestions.forEach((q, index) => {
      if (selectedAnswers[index] === q.correctAnswer) {
        calculatedScore += 1;
      }
    });
    setScore(calculatedScore);
    setIsFinished(true);
    setIsSubmitting(true);
    
    // Save attempt
    const percentage = Math.round((calculatedScore / examQuestions.length) * 100);
    try {
      await fetch('/api/exams/simulator', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ score: calculatedScore, total: examQuestions.length, passed: percentage >= 50 })
      });
    } catch (e) {
      console.error('Failed to save attempt');
    }
    setIsSubmitting(false);
  };

  if (isLoading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ color: 'var(--primary)' }}>جاري تحميل الأسئلة...</p>
      </div>
    );
  }

  if (examQuestions.length === 0) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
        <div className="glass-card" style={{ padding: '3rem', textAlign: 'center', borderRadius: '24px' }}>
          <AlertTriangle size={64} color="#ef4444" style={{ margin: '0 auto 1.5rem auto' }} />
          <h2 style={{ fontSize: '2rem', marginBottom: '1rem', color: '#fff' }}>لا توجد أسئلة متاحة</h2>
          <p style={{ color: 'rgba(255,255,255,0.7)', marginBottom: '2rem' }}>عذراً، لم نتمكن من العثور على أي أسئلة لمحاكي الامتحانات في الوقت الحالي.</p>
          <Link href="/dashboard" className="btn btn-solid" style={{ padding: '0.8rem 2rem' }}>العودة للوحة التحكم</Link>
        </div>
      </div>
    );
  }

  if (!hasStarted) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
        <div className="glass-card" style={{ maxWidth: '600px', width: '100%', padding: '3rem 2rem', textAlign: 'center', borderRadius: '24px' }}>
          <Timer size={64} color="var(--primary)" style={{ margin: '0 auto 1.5rem auto' }} />
          <h1 style={{ fontSize: '2.5rem', marginBottom: '1rem', color: '#fff' }}>محاكي الامتحان الشامل</h1>
          <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '1.1rem', marginBottom: '2rem', lineHeight: 1.6 }}>
            هذا الامتحان مصمم لاختبار قدراتك في ظروف مشابهة للامتحان الحقيقي. الوقت المخصص هو <strong>10 دقائق</strong>. 
            يمنع استخدام أي مصادر خارجية.
          </p>
          
          <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', padding: '1rem', borderRadius: '12px', marginBottom: '2rem', display: 'flex', alignItems: 'center', gap: '1rem', textAlign: 'right' }}>
            <AlertTriangle color="#ef4444" size={24} />
            <p style={{ margin: 0, color: '#ef4444', fontSize: '0.9rem' }}>بمجرد بدء الامتحان سيبدأ المؤقت ولن تتمكن من إيقافه. تأكد من استعدادك التام.</p>
          </div>

          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
            <Link href="/dashboard" className="btn" style={{ background: 'rgba(255,255,255,0.1)', color: '#fff' }}>إلغاء والعودة</Link>
            <button onClick={() => setHasStarted(true)} className="btn btn-solid" style={{ padding: '0.8rem 2rem', fontSize: '1.1rem', fontWeight: 'bold' }}>بدء الامتحان الآن</button>
          </div>
        </div>
      </div>
    );
  }

  if (isFinished) {
    const percentage = Math.round((score / examQuestions.length) * 100);
    const passed = percentage >= 50;

    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
          className="glass-card" style={{ maxWidth: '600px', width: '100%', padding: '3rem 2rem', textAlign: 'center', borderRadius: '24px' }}
        >
          {passed ? (
            <CheckCircle size={80} color="var(--success)" style={{ margin: '0 auto 1.5rem auto' }} />
          ) : (
            <XCircle size={80} color="#ef4444" style={{ margin: '0 auto 1.5rem auto' }} />
          )}
          
          <h2 style={{ fontSize: '2.5rem', marginBottom: '0.5rem', color: '#fff' }}>النتيجة النهائية</h2>
          <div style={{ fontSize: '4rem', fontWeight: 900, color: passed ? 'var(--success)' : '#ef4444', marginBottom: '1rem' }}>
            {percentage}%
          </div>
          <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '1.2rem', marginBottom: '2rem' }}>
            لقد أجبت بشكل صحيح على <strong>{score}</strong> من أصل <strong>{examQuestions.length}</strong> أسئلة.
          </p>

          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
            <Link href="/dashboard" className="btn btn-solid" style={{ padding: '0.8rem 2rem' }}>العودة للوحة التحكم</Link>
          </div>
        </motion.div>
      </div>
    );
  }

  const currentQ = examQuestions[currentQuestionIndex];

  return (
    <div style={{ minHeight: '100vh', padding: '2rem', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      
      {/* Header Bar */}
      <div style={{ 
        width: '100%', maxWidth: '800px', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        background: 'rgba(10,10,10,0.8)', padding: '1rem 2rem', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.1)',
        marginBottom: '2rem', position: 'sticky', top: '1rem', zIndex: 10, backdropFilter: 'blur(20px)'
      }}>
        <div style={{ fontWeight: 'bold', fontSize: '1.2rem' }}>
          سؤال {currentQuestionIndex + 1} <span style={{ opacity: 0.5, fontSize: '0.9rem' }}>من {examQuestions.length}</span>
        </div>
        
        <div style={{ 
          display: 'flex', alignItems: 'center', gap: '0.5rem', 
          color: timeLeft < 60 ? '#ef4444' : 'var(--primary)',
          fontWeight: 'bold', fontSize: '1.5rem', fontFamily: 'monospace'
        }}>
          <Timer size={24} /> {formatTime(timeLeft)}
        </div>
      </div>

      {/* Question Card */}
      <div style={{ width: '100%', maxWidth: '800px', flex: 1, display: 'flex', flexDirection: 'column' }}>
        <AnimatePresence mode="wait">
          <motion.div
            key={currentQuestionIndex}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
            className="glass-card"
            style={{ padding: '3rem 2rem', borderRadius: '24px', marginBottom: '2rem', flex: 1 }}
          >
            <h2 style={{ fontSize: '1.8rem', lineHeight: 1.6, color: '#fff', marginBottom: '2.5rem' }}>
              {currentQ.text}
            </h2>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {currentQ.options.map((option, idx) => {
                const isSelected = selectedAnswers[currentQuestionIndex] === idx;
                return (
                  <button
                    key={idx}
                    onClick={() => handleSelectOption(idx)}
                    style={{
                      padding: '1.5rem',
                      textAlign: 'right',
                      background: isSelected ? 'rgba(203,161,83,0.15)' : 'rgba(255,255,255,0.03)',
                      border: `2px solid ${isSelected ? 'var(--primary)' : 'rgba(255,255,255,0.1)'}`,
                      borderRadius: '16px',
                      color: '#fff',
                      fontSize: '1.2rem',
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
                      display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
                    }}>
                      {isSelected && <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: 'var(--primary)' }} />}
                    </div>
                    {option}
                  </button>
                );
              })}
            </div>
          </motion.div>
        </AnimatePresence>

        {/* Navigation Footer */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem 0' }}>
          <button 
            onClick={() => setCurrentQuestionIndex(prev => prev - 1)}
            disabled={currentQuestionIndex === 0}
            className="btn"
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', opacity: currentQuestionIndex === 0 ? 0.3 : 1 }}
          >
            السابق <ArrowLeft size={18} /> 
          </button>

          {currentQuestionIndex === examQuestions.length - 1 ? (
            <button 
              onClick={finishExam}
              className="btn btn-solid"
              style={{ padding: '0.8rem 2.5rem', fontSize: '1.1rem' }}
            >
              إنهاء الامتحان
            </button>
          ) : (
            <button 
              onClick={() => setCurrentQuestionIndex(prev => prev + 1)}
              className="btn btn-solid"
              style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
            >
              التالي <ArrowRight size={18} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
