'use client';

import { useState } from 'react';
import Link from 'next/link';

type Question = {
  id: number;
  text: string;
  options: string[];
  correctAnswer: number;
  difficulty: 'easy' | 'medium' | 'hard';
};

const questionBank: Question[] = [
  { id: 1, text: 'ما هو ناتج 5 × 5؟', options: ['10', '20', '25', '30'], correctAnswer: 2, difficulty: 'easy' },
  { id: 2, text: 'ما هو ناتج 12 × 12؟', options: ['124', '144', '164', '100'], correctAnswer: 1, difficulty: 'medium' },
  { id: 3, text: 'حل المعادلة: 2x + 5 = 15', options: ['x = 5', 'x = 10', 'x = 3', 'x = 2'], correctAnswer: 0, difficulty: 'medium' },
  { id: 4, text: 'ما هو تكامل الدالة f(x) = 2x؟', options: ['x^2', '2', 'x', '2x^2'], correctAnswer: 0, difficulty: 'hard' },
];

export default function AssessmentFeature() {
  const [currentLevel, setCurrentLevel] = useState<'easy' | 'medium' | 'hard'>('easy');
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [isFinished, setIsFinished] = useState(false);

  const filteredQuestions = questionBank.filter(q => q.difficulty === currentLevel);
  const currentQuestion = filteredQuestions[currentQuestionIndex] || filteredQuestions[0];

  const handleAnswer = (index: number) => {
    if (index === currentQuestion.correctAnswer) {
      setScore(prev => prev + 10);
      // Increase difficulty
      if (currentLevel === 'easy') setCurrentLevel('medium');
      else if (currentLevel === 'medium') setCurrentLevel('hard');
    } else {
      // Decrease difficulty
      if (currentLevel === 'hard') setCurrentLevel('medium');
      else if (currentLevel === 'medium') setCurrentLevel('easy');
    }

    if (currentQuestionIndex + 1 < filteredQuestions.length && currentQuestionIndex < 4) {
      setCurrentQuestionIndex(prev => prev + 1);
    } else {
      setIsFinished(true);
    }
  };

  return (
    <div className="container">
      <nav className="nav">
        <Link href="/">العودة للرئيسية</Link>
        <Link href="/features/parent-dashboard">الميزة التالية ➡️</Link>
      </nav>

      <div className="glass-card" style={{ maxWidth: '800px', margin: '0 auto' }}>
        <h2 className="feature-title">📝 محرك الاختبارات التكيفي</h2>
        <p style={{ marginBottom: '2rem', opacity: 0.8 }}>
          يقوم هذا المحرك بتغيير مستوى صعوبة الأسئلة بناءً على إجاباتك السابقة (مثل نظام GMAT).
        </p>

        {!isFinished ? (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2rem' }}>
              <span>النقاط: {score}</span>
              <span style={{ 
                background: currentLevel === 'easy' ? 'var(--success)' : currentLevel === 'medium' ? 'var(--warning)' : 'var(--danger)', 
                padding: '0.2rem 1rem', 
                borderRadius: '20px',
                fontSize: '0.8rem'
              }}>
                المستوى الحالي: {currentLevel === 'easy' ? 'سهل' : currentLevel === 'medium' ? 'متوسط' : 'صعب'}
              </span>
            </div>

            <div style={{ background: 'var(--secondary)', padding: '2rem', borderRadius: '12px' }}>
              <h3 style={{ marginBottom: '2rem' }}>{currentQuestion?.text}</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {currentQuestion?.options.map((option, idx) => (
                  <button 
                    key={idx} 
                    className="btn" 
                    style={{ background: 'var(--glass)', textAlign: 'right' }}
                    onClick={() => handleAnswer(idx)}
                  >
                    {idx + 1}. {option}
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '3rem 0' }}>
            <h2>انتهى الاختبار! 🎉</h2>
            <p style={{ fontSize: '2rem', margin: '1rem 0', color: 'var(--success)' }}>نتيجتك النهائية: {score}</p>
            <button className="btn" onClick={() => window.location.reload()}>إعادة الاختبار</button>
          </div>
        )}
      </div>
    </div>
  );
}
