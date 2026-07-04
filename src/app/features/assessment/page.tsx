'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Target, CheckCircle2, ChevronRight, BrainCircuit, Activity, Award, BookOpen } from 'lucide-react';
import Link from 'next/link';

type QuizState = 'INTRO' | 'QUIZ' | 'RESULT';

const mockQuestions = [
  { id: 1, text: 'ما هو تسارع الجاذبية الأرضية تقريباً؟', options: ['9.8 m/s²', '10.5 m/s²', '8.9 m/s²', '9.0 m/s²'], correctIndex: 0 },
  { id: 2, text: 'أي من القوى التالية هي قوة غير تلامسية؟', options: ['قوة الاحتكاك', 'الشد', 'الجاذبية', 'القوة العمودية'], correctIndex: 2 },
  { id: 3, text: 'إذا زادت سرعة جسم إلى الضعف، فإن طاقته الحركية:', options: ['تتضاعف', 'تزداد 4 أضعاف', 'لا تتغير', 'تقل للنصف'], correctIndex: 1 },
  { id: 4, text: 'وحدة قياس الشغل في النظام الدولي هي:', options: ['نيوتن', 'واط', 'جول', 'باسكال'], correctIndex: 2 },
];

export default function AssessmentPage() {
  const [state, setState] = useState<QuizState>('INTRO');
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [score, setScore] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  
  const handleStart = () => {
    setState('QUIZ');
    setCurrentQuestion(0);
    setScore(0);
  };

  const handleAnswer = (index: number) => {
    setSelectedAnswer(index);
    setTimeout(() => {
      if (index === mockQuestions[currentQuestion].correctIndex) {
        setScore(prev => prev + 1);
      }
      if (currentQuestion < mockQuestions.length - 1) {
        setCurrentQuestion(prev => prev + 1);
        setSelectedAnswer(null);
      } else {
        setState('RESULT');
      }
    }, 800);
  };

  const getLevelInfo = () => {
    const percentage = (score / mockQuestions.length) * 100;
    if (percentage === 100) return { title: 'خبير', color: '#22c55e', desc: 'أداؤك ممتاز! أنت جاهز للمستويات المتقدمة.' };
    if (percentage >= 50) return { title: 'متوسط', color: '#eab308', desc: 'أساسياتك جيدة، تحتاج لبعض المراجعة لتعزيز مفاهيمك.' };
    return { title: 'مبتدئ', color: '#ef4444', desc: 'لا تقلق! كل خبير كان مبتدئاً. ننصحك بالبدء من كورس الأساسيات.' };
  };

  return (
    <div style={{ minHeight: '100vh', background: '#050505', color: '#fff', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      
      {/* Navbar */}
      <div style={{ padding: '1.5rem 2rem', background: '#111', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', gap: '1rem', position: 'sticky', top: 0, zIndex: 50 }}>
        <Link href="/dashboard" style={{ color: 'rgba(255,255,255,0.5)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
          لوحة التحكم <ChevronRight size={16} />
        </Link>
        <div style={{ width: '40px', height: '40px', background: 'rgba(234, 179, 8, 0.1)', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Target size={24} color="#eab308" />
        </div>
        <h1 style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>اختبر قدراتك</h1>
      </div>

      <div style={{ maxWidth: '800px', margin: '0 auto', padding: '3rem 1.5rem' }}>
        <AnimatePresence mode="wait">
          
          {/* INTRO STATE */}
          {state === 'INTRO' && (
            <motion.div 
              key="intro"
              initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
              style={{ textAlign: 'center', marginTop: '10vh' }}
            >
              <div style={{ width: '100px', height: '100px', background: 'rgba(234, 179, 8, 0.1)', borderRadius: '50%', margin: '0 auto 2rem auto', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <BrainCircuit size={48} color="#eab308" />
              </div>
              <h2 style={{ fontSize: '2.5rem', fontWeight: '900', marginBottom: '1rem' }}>حدد مستواك في الفيزياء</h2>
              <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '1.1rem', marginBottom: '3rem', maxWidth: '500px', margin: '0 auto 3rem auto', lineHeight: 1.6 }}>
                أجب عن 4 أسئلة سريعة لنقوم بتقييم مستواك الحالي واقتراح أفضل خطة دراسية تناسبك.
              </p>
              <button 
                onClick={handleStart}
                style={{ 
                  background: 'linear-gradient(135deg, var(--primary), #eab308)', color: '#000', 
                  border: 'none', padding: '1rem 3rem', borderRadius: '30px', 
                  fontSize: '1.2rem', fontWeight: 'bold', cursor: 'pointer',
                  boxShadow: '0 10px 30px rgba(234, 179, 8, 0.3)', display: 'inline-flex', alignItems: 'center', gap: '0.5rem'
                }}
              >
                ابدأ الاختبار الآن <ChevronRight size={20} />
              </button>
            </motion.div>
          )}

          {/* QUIZ STATE */}
          {state === 'QUIZ' && (
            <motion.div 
              key="quiz"
              initial={{ opacity: 0, x: 50 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -50 }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                <span style={{ fontSize: '1.1rem', fontWeight: 'bold', color: 'rgba(255,255,255,0.6)' }}>
                  سؤال {currentQuestion + 1} من {mockQuestions.length}
                </span>
                <div style={{ display: 'flex', gap: '0.3rem' }}>
                  {mockQuestions.map((_, idx) => (
                    <div key={idx} style={{ 
                      width: '40px', height: '6px', borderRadius: '3px', 
                      background: idx <= currentQuestion ? 'var(--primary)' : 'rgba(255,255,255,0.1)' 
                    }} />
                  ))}
                </div>
              </div>

              <div style={{ background: '#111', padding: '3rem 2rem', borderRadius: '24px', border: '1px solid rgba(255,255,255,0.05)' }}>
                <h3 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '2.5rem', lineHeight: 1.5 }}>
                  {mockQuestions[currentQuestion].text}
                </h3>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  {mockQuestions[currentQuestion].options.map((opt, idx) => {
                    const isSelected = selectedAnswer === idx;
                    const isCorrect = idx === mockQuestions[currentQuestion].correctIndex;
                    let bgColor = 'rgba(255,255,255,0.03)';
                    let borderColor = 'rgba(255,255,255,0.1)';
                    
                    if (selectedAnswer !== null) {
                      if (isCorrect) {
                        bgColor = 'rgba(34, 197, 94, 0.1)';
                        borderColor = '#22c55e';
                      } else if (isSelected) {
                        bgColor = 'rgba(239, 68, 68, 0.1)';
                        borderColor = '#ef4444';
                      }
                    } else if (isSelected) {
                      borderColor = 'var(--primary)';
                    }

                    return (
                      <button
                        key={idx}
                        onClick={() => selectedAnswer === null && handleAnswer(idx)}
                        disabled={selectedAnswer !== null}
                        style={{
                          background: bgColor,
                          border: `2px solid ${borderColor}`,
                          padding: '1.25rem',
                          borderRadius: '16px',
                          color: '#fff',
                          fontSize: '1.1rem',
                          textAlign: 'right',
                          cursor: selectedAnswer === null ? 'pointer' : 'default',
                          transition: 'all 0.2s',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center'
                        }}
                      >
                        {opt}
                        {selectedAnswer !== null && isCorrect && <CheckCircle2 color="#22c55e" size={20} />}
                      </button>
                    );
                  })}
                </div>
              </div>
            </motion.div>
          )}

          {/* RESULT STATE */}
          {state === 'RESULT' && (
            <motion.div 
              key="result"
              initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
              style={{ textAlign: 'center', marginTop: '5vh' }}
            >
              <div style={{ 
                width: '120px', height: '120px', background: 'rgba(34, 197, 94, 0.1)', 
                borderRadius: '50%', margin: '0 auto 2rem auto', display: 'flex', 
                alignItems: 'center', justifyContent: 'center' 
              }}>
                <Award size={64} color="#22c55e" />
              </div>
              
              <h2 style={{ fontSize: '2rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>انتهى التقييم!</h2>
              <div style={{ fontSize: '1.5rem', marginBottom: '2rem' }}>
                نتيجتك: <span style={{ color: 'var(--primary)', fontWeight: '900' }}>{score}</span> / {mockQuestions.length}
              </div>

              <div style={{ 
                background: '#111', padding: '2rem', borderRadius: '24px', 
                border: '1px solid rgba(255,255,255,0.05)', marginBottom: '2rem' 
              }}>
                <div style={{ display: 'inline-block', padding: '0.5rem 1.5rem', borderRadius: '20px', background: `${getLevelInfo().color}20`, color: getLevelInfo().color, fontWeight: 'bold', marginBottom: '1rem' }}>
                  المستوى: {getLevelInfo().title}
                </div>
                <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '1.1rem', lineHeight: 1.6 }}>
                  {getLevelInfo().desc}
                </p>
              </div>

              <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
                <Link href="/courses" style={{ 
                  background: 'var(--primary)', color: '#000', padding: '1rem 2rem', 
                  borderRadius: '16px', fontWeight: 'bold', textDecoration: 'none',
                  display: 'flex', alignItems: 'center', gap: '0.5rem'
                }}>
                  <BookOpen size={20} /> عرض الكورسات المقترحة
                </Link>
                <button 
                  onClick={handleStart}
                  style={{ 
                    background: 'rgba(255,255,255,0.05)', color: '#fff', border: '1px solid rgba(255,255,255,0.1)', 
                    padding: '1rem 2rem', borderRadius: '16px', fontWeight: 'bold', cursor: 'pointer'
                  }}
                >
                  إعادة الاختبار
                </button>
              </div>
            </motion.div>
          )}
          
        </AnimatePresence>
      </div>
    </div>
  );
}
