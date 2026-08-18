'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowRight, CheckCircle, Download, FileText, Loader2, Save, User } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function SubmissionsClient({ pendingAttempts }: { pendingAttempts: any[] }) {
  const [attempts, setAttempts] = useState(pendingAttempts);
  const [gradingState, setGradingState] = useState<Record<string, { score: string, loading: boolean }>>({});
  const router = useRouter();

  const handleScoreChange = (id: string, val: string) => {
    setGradingState(prev => ({ ...prev, [id]: { ...prev[id], score: val } }));
  };

  const handleGradeSubmit = async (attemptId: string) => {
    const scoreStr = gradingState[attemptId]?.score;
    if (!scoreStr) return alert('الرجاء إدخال العلامة أولاً');
    
    const score = Number(scoreStr);
    const attempt = attempts.find(a => a.id === attemptId);
    if (!attempt) return;
    
    if (score < 0 || score > (attempt.quiz.totalMarks || 100)) {
      return alert(`العلامة يجب أن تكون بين 0 و ${attempt.quiz.totalMarks || 100}`);
    }

    setGradingState(prev => ({ ...prev, [attemptId]: { ...prev[attemptId], loading: true } }));

    try {
      const res = await fetch('/api/quizzes/grade', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ attemptId, score })
      });
      
      if (res.ok) {
        // Remove from list
        setAttempts(attempts.filter(a => a.id !== attemptId));
      } else {
        const data = await res.json();
        alert(data.error || 'حدث خطأ');
      }
    } catch (e) {
      alert('خطأ في الاتصال');
    }

    setGradingState(prev => ({ ...prev, [attemptId]: { ...prev[attemptId], loading: false } }));
  };

  return (
    <div style={{ padding: '2rem', maxWidth: '1000px', margin: '0 auto', color: '#fff' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <Link href="/instructor/quizzes" style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(255,255,255,0.05)', padding: '0.5rem', borderRadius: '50%', color: '#fff' }}>
            <ArrowRight size={20} />
          </Link>
          <h1 style={{ fontSize: '2rem', fontWeight: 'bold' }}>تصحيح إجابات الطلاب 📝</h1>
        </div>
      </div>

      {attempts.length === 0 ? (
        <div style={{ padding: '4rem', textAlign: 'center', background: '#111', borderRadius: '16px', border: '1px dashed rgba(255,255,255,0.1)' }}>
          <CheckCircle size={48} color="rgba(34, 197, 94, 0.5)" style={{ margin: '0 auto 1rem' }} />
          <h3 style={{ fontSize: '1.2rem', marginBottom: '1rem', color: '#22c55e' }}>تم تصحيح جميع الإجابات!</h3>
          <p style={{ color: 'rgba(255,255,255,0.4)', marginBottom: '2rem' }}>لا يوجد أي ملفات بإنتظار التصحيح حالياً.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {attempts.map(attempt => (
            <div key={attempt.id} style={{ background: '#111', padding: '2rem', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.05)', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '1rem' }}>
                <div style={{ display: 'flex', gap: '1rem' }}>
                  {attempt.user.image ? (
                    <img src={attempt.user.image} alt={attempt.user.name} style={{ width: '50px', height: '50px', borderRadius: '50%', objectFit: 'cover' }} />
                  ) : (
                    <div style={{ width: '50px', height: '50px', borderRadius: '50%', background: 'rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <User size={24} color="rgba(255,255,255,0.5)" />
                    </div>
                  )}
                  <div>
                    <h3 style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>{attempt.user.name}</h3>
                    <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.9rem' }}>{attempt.user.email}</p>
                  </div>
                </div>
                <div style={{ textAlign: 'left' }}>
                  <p style={{ fontSize: '1.1rem', fontWeight: 'bold', color: 'var(--primary)' }}>{attempt.quiz.title}</p>
                  <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.85rem' }}>
                    الكورس: {attempt.quiz.chapter.course.title} <br/> الفصل: {attempt.quiz.chapter.title}
                  </p>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '2rem', alignItems: 'center' }}>
                <div style={{ flex: 1, padding: '1.5rem', background: 'rgba(255,255,255,0.02)', borderRadius: '12px', border: '1px dashed rgba(255,255,255,0.1)', textAlign: 'center' }}>
                  <FileText size={32} color="var(--primary)" style={{ margin: '0 auto 1rem' }} />
                  <a href={attempt.answerFileUrl} target="_blank" rel="noopener noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(203, 161, 83, 0.1)', color: 'var(--warning)', padding: '0.8rem 1.5rem', borderRadius: '8px', fontWeight: 'bold', textDecoration: 'none' }}>
                    <Download size={18} /> تحميل إجابة الطالب
                  </a>
                  {attempt.quiz.fileUrl && (
                    <div style={{ marginTop: '1rem' }}>
                      <a href={attempt.quiz.fileUrl} target="_blank" rel="noopener noreferrer" style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.8rem', textDecoration: 'underline' }}>مشاهدة ملف الأسئلة الأصلي</a>
                    </div>
                  )}
                </div>

                <div style={{ flex: 1, padding: '1.5rem', background: 'rgba(255,255,255,0.02)', borderRadius: '12px' }}>
                  <h4 style={{ marginBottom: '1rem', fontWeight: 'bold' }}>رصد العلامة</h4>
                  <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                    <div style={{ flex: 1, position: 'relative' }}>
                      <input 
                        type="number" 
                        min="0" 
                        max={attempt.quiz.totalMarks || 100}
                        placeholder="العلامة هنا..."
                        value={gradingState[attempt.id]?.score || ''}
                        onChange={(e) => handleScoreChange(attempt.id, e.target.value)}
                        style={{ width: '100%', padding: '1rem', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', borderRadius: '8px', fontSize: '1.1rem' }}
                      />
                      <span style={{ position: 'absolute', left: '1rem', top: '1rem', color: 'rgba(255,255,255,0.5)' }}>/ {attempt.quiz.totalMarks || 100}</span>
                    </div>
                    <button 
                      onClick={() => handleGradeSubmit(attempt.id)}
                      disabled={gradingState[attempt.id]?.loading}
                      style={{ padding: '1rem 2rem', background: 'var(--success)', color: '#000', borderRadius: '8px', fontWeight: 'bold', border: 'none', cursor: gradingState[attempt.id]?.loading ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1.1rem' }}
                    >
                      {gradingState[attempt.id]?.loading ? <Loader2 className="animate-spin" size={20} /> : <Save size={20} />} 
                      حفظ وتصحيح
                    </button>
                  </div>
                  <p style={{ marginTop: '1rem', fontSize: '0.85rem', color: 'rgba(255,255,255,0.5)' }}>
                    علامة النجاح المحددة مسبقاً هي: <strong style={{ color: '#fff' }}>{attempt.quiz.passingScore}</strong>
                  </p>
                </div>
              </div>

            </div>
          ))}
        </div>
      )}
      <style>{`
        .animate-spin { animation: spin 1s linear infinite; }
        @keyframes spin { 100% { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
