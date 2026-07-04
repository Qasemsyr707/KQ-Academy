'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Save, Plus, ArrowRight, Trash2, Bot, Loader2 } from 'lucide-react';
import Link from 'next/link';

export default function CreateQuizClient({ courses }: { courses: any[] }) {
  const [courseId, setCourseId] = useState(courses[0]?.id || '');
  const [chapterId, setChapterId] = useState('');
  const [title, setTitle] = useState('');
  const [questions, setQuestions] = useState([{ text: '', options: ['', '', '', ''], correctAnswer: 0 }]);
  const [isLoading, setIsLoading] = useState(false);
  const [aiContext, setAiContext] = useState('');
  const [isAiLoading, setIsAiLoading] = useState(false);
  const router = useRouter();

  const selectedCourse = courses.find(c => c.id === courseId);
  const chapters = selectedCourse?.chapters || [];

  const handleAddQuestion = () => {
    setQuestions([...questions, { text: '', options: ['', '', '', ''], correctAnswer: 0 }]);
  };

  const handleRemoveQuestion = (index: number) => {
    const newQ = [...questions];
    newQ.splice(index, 1);
    setQuestions(newQ);
  };

  const handleQuestionChange = (index: number, field: string, value: any, optionIndex?: number) => {
    const newQ = [...questions];
    if (field === 'text') newQ[index].text = value;
    if (field === 'correctAnswer') newQ[index].correctAnswer = value;
    if (field === 'option' && optionIndex !== undefined) {
      newQ[index].options[optionIndex] = value;
    }
    setQuestions(newQ);
  };

  const handleGenerateAI = async () => {
    if (!aiContext) {
      alert('الرجاء إدخال نص الموضوع أو المحتوى لتوليد الأسئلة منه');
      return;
    }
    setIsAiLoading(true);
    try {
      const res = await fetch('/api/ai-tutor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          message: `قم بتوليد 3 أسئلة اختيار من متعدد (MCQ) باللغة العربية بناءً على النص التالي:\n\n${aiContext}\n\nيجب أن يكون الرد بصيغة JSON حصراً بهذا الهيكل: [{"text": "السؤال", "options": ["خيار1", "خيار2", "خيار3", "خيار4"], "correctAnswer": 0}]` 
        })
      });
      if (res.ok) {
        const data = await res.json();
        // Parsing the AI response (assuming the AI tutor returns the JSON string in its 'reply' or 'response')
        let generatedQuestions = [];
        try {
          const jsonStr = data.reply.replace(/```json/g, '').replace(/```/g, '').trim();
          generatedQuestions = JSON.parse(jsonStr);
          if (Array.isArray(generatedQuestions) && generatedQuestions.length > 0) {
            setQuestions([...questions, ...generatedQuestions]);
            alert('تم توليد الأسئلة بنجاح!');
          }
        } catch (e) {
          alert('فشل في تحليل رد الذكاء الاصطناعي كـ JSON. حاول مرة أخرى.');
        }
      }
    } catch (e) {
      alert('حدث خطأ أثناء الاتصال بالذكاء الاصطناعي.');
    }
    setIsAiLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!courseId || !chapterId || !title || questions.length === 0) {
      alert('يرجى تعبئة جميع الحقول وإضافة سؤال واحد على الأقل');
      return;
    }
    setIsLoading(true);
    try {
      const res = await fetch('/api/quizzes/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          chapterId,
          questions
        })
      });

      if (res.ok) {
        alert('تم حفظ الاختبار بنجاح!');
        router.push('/instructor/quizzes');
      } else {
        const data = await res.json();
        alert(data.error || 'حدث خطأ أثناء الحفظ');
      }
    } catch (error) {
      alert('خطأ في الاتصال بالخادم');
    }
    setIsLoading(false);
  };

  return (
    <div style={{ padding: '2rem', maxWidth: '900px', margin: '0 auto', color: '#fff' }}>
      <Link href="/instructor/quizzes" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', color: 'rgba(255,255,255,0.6)', textDecoration: 'none', marginBottom: '2rem' }}>
        <ArrowRight size={20} /> العودة للاختبارات
      </Link>

      <h1 style={{ fontSize: '2rem', fontWeight: 'bold', marginBottom: '2rem' }}>إنشاء اختبار جديد 📝</h1>

      {courses.length === 0 ? (
        <div style={{ padding: '3rem', textAlign: 'center', background: 'rgba(255,255,255,0.05)', borderRadius: '16px' }}>
          <h3 style={{ fontSize: '1.2rem', marginBottom: '1rem' }}>ليس لديك أي كورسات حالياً</h3>
          <Link href="/instructor/courses/create" className="btn btn-solid" style={{ textDecoration: 'none', display: 'inline-block' }}>أنشئ كورسك الأول الآن</Link>
        </div>
      ) : (
        <form onSubmit={handleSubmit}>
          {/* Quiz Details */}
          <div style={{ background: '#111', padding: '2rem', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.05)', marginBottom: '2rem' }}>
            <h2 style={{ fontSize: '1.2rem', marginBottom: '1.5rem', fontWeight: 'bold', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '0.8rem' }}>التفاصيل الأساسية</h2>
            
            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>اختيار الكورس</label>
              <select 
                value={courseId} 
                onChange={(e) => {
                  setCourseId(e.target.value);
                  setChapterId('');
                }}
                style={{ width: '100%', padding: '1rem', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', borderRadius: '8px', fontSize: '1.05rem' }}
              >
                {courses.map(c => (
                  <option key={c.id} value={c.id} style={{ background: '#111' }}>{c.title}</option>
                ))}
              </select>
            </div>

            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>الفصل</label>
              <select 
                value={chapterId} 
                onChange={(e) => setChapterId(e.target.value)}
                style={{ width: '100%', padding: '1rem', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', borderRadius: '8px', fontSize: '1.05rem' }}
                required
              >
                <option value="" disabled style={{ background: '#111' }}>-- اختر الفصل --</option>
                {chapters.map((ch: any) => (
                  <option key={ch.id} value={ch.id} style={{ background: '#111' }}>{ch.title}</option>
                ))}
              </select>
            </div>

            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>عنوان الاختبار</label>
              <input 
                required
                type="text" 
                placeholder="مثال: اختبار منتصف الدورة"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                style={{ width: '100%', padding: '1rem', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', borderRadius: '8px', fontSize: '1.05rem' }}
              />
            </div>
          </div>

          {/* AI Generator */}
          <div style={{ background: 'linear-gradient(135deg, rgba(203, 161, 83, 0.1) 0%, rgba(5, 5, 5, 0.9) 100%)', padding: '2rem', borderRadius: '16px', border: '1px solid var(--primary)', marginBottom: '2rem' }}>
            <h2 style={{ fontSize: '1.2rem', marginBottom: '1rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Bot size={24} color="var(--primary)" /> المساعد الذكي (توليد الأسئلة أوتوماتيكياً)
            </h2>
            <p style={{ color: 'rgba(255,255,255,0.6)', marginBottom: '1rem', fontSize: '0.9rem' }}>
              قم بلصق محتوى الدرس هنا، وسيقوم الذكاء الاصطناعي باستخراج الأسئلة بشكل دقيق وإضافتها للأسفل مباشرة.
            </p>
            <textarea 
              value={aiContext}
              onChange={(e) => setAiContext(e.target.value)}
              placeholder="اكتب أو الصق نص الدرس هنا..."
              style={{ width: '100%', height: '100px', padding: '1rem', background: 'rgba(0,0,0,0.5)', border: '1px solid rgba(203, 161, 83, 0.3)', color: '#fff', borderRadius: '8px', fontSize: '1rem', resize: 'none', marginBottom: '1rem' }}
            />
            <button 
              type="button"
              onClick={handleGenerateAI}
              disabled={isAiLoading}
              style={{ padding: '0.8rem 1.5rem', background: 'var(--primary)', color: '#000', borderRadius: '8px', fontWeight: 'bold', border: 'none', cursor: isAiLoading ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
            >
              {isAiLoading ? <Loader2 size={18} className="animate-spin" /> : <Bot size={18} />}
              {isAiLoading ? 'جاري التوليد (قد يستغرق بضع ثوان)...' : 'توليد 3 أسئلة الآن'}
            </button>
          </div>

          {/* Questions Editor */}
          <div style={{ marginBottom: '2rem' }}>
            <h2 style={{ fontSize: '1.5rem', marginBottom: '1.5rem', fontWeight: 'bold' }}>الأسئلة ({questions.length})</h2>
            
            {questions.map((q, qIndex) => (
              <div key={qIndex} style={{ background: '#111', padding: '2rem', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.05)', marginBottom: '1.5rem', position: 'relative' }}>
                <button 
                  type="button" 
                  onClick={() => handleRemoveQuestion(qIndex)}
                  style={{ position: 'absolute', top: '1.5rem', left: '1.5rem', background: 'rgba(239, 68, 68, 0.1)', border: 'none', color: '#ef4444', padding: '0.5rem', borderRadius: '8px', cursor: 'pointer' }}
                >
                  <Trash2 size={18} />
                </button>
                
                <div style={{ marginBottom: '1.5rem' }}>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold', color: 'var(--primary)' }}>السؤال رقم {qIndex + 1}</label>
                  <input 
                    required
                    type="text" 
                    placeholder="اكتب نص السؤال هنا..."
                    value={q.text}
                    onChange={(e) => handleQuestionChange(qIndex, 'text', e.target.value)}
                    style={{ width: '100%', padding: '1rem', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', borderRadius: '8px', fontSize: '1.05rem', paddingRight: '1.5rem' }}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem' }}>
                  {q.options.map((opt, optIndex) => (
                    <div key={optIndex} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(255,255,255,0.02)', padding: '0.5rem', borderRadius: '8px', border: q.correctAnswer === optIndex ? '1px solid var(--success)' : '1px solid rgba(255,255,255,0.05)' }}>
                      <input 
                        type="radio" 
                        name={`correct-${qIndex}`} 
                        checked={q.correctAnswer === optIndex}
                        onChange={() => handleQuestionChange(qIndex, 'correctAnswer', optIndex)}
                        style={{ accentColor: 'var(--success)', width: '20px', height: '20px', cursor: 'pointer' }}
                      />
                      <input 
                        required
                        type="text" 
                        placeholder={`الخيار ${optIndex + 1}`}
                        value={opt}
                        onChange={(e) => handleQuestionChange(qIndex, 'option', e.target.value, optIndex)}
                        style={{ flex: 1, padding: '0.8rem', background: 'transparent', border: 'none', color: '#fff', fontSize: '1rem', outline: 'none' }}
                      />
                    </div>
                  ))}
                </div>
              </div>
            ))}

            <button 
              type="button" 
              onClick={handleAddQuestion}
              style={{ width: '100%', padding: '1.5rem', background: 'rgba(255,255,255,0.05)', border: '2px dashed rgba(255,255,255,0.2)', color: '#fff', borderRadius: '12px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', fontSize: '1.1rem', fontWeight: 'bold', transition: 'all 0.3s' }}
            >
              <Plus size={24} /> إضافة سؤال جديد يدوياً
            </button>
          </div>

          <button 
            type="submit" 
            disabled={isLoading || chapters.length === 0}
            style={{ width: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem', padding: '1.2rem', background: 'var(--primary)', color: '#000', borderRadius: '8px', fontWeight: 'bold', border: 'none', cursor: (isLoading || chapters.length === 0) ? 'not-allowed' : 'pointer', fontSize: '1.2rem' }}
          >
            {isLoading ? 'جاري الحفظ...' : <><Save size={24} /> حفظ ونشر الاختبار</>}
          </button>
        </form>
      )}
      <style>{`
        .animate-spin { animation: spin 1s linear infinite; }
        @keyframes spin { 100% { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
