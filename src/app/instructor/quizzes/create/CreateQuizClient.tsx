'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Save, Plus, ArrowRight, Trash2, Bot, Loader2, UploadCloud, FileText } from 'lucide-react';
import Link from 'next/link';

export default function CreateQuizClient({ courses }: { courses: any[] }) {
  const [courseId, setCourseId] = useState(courses[0]?.id || '');
  const [chapterId, setChapterId] = useState('');
  const [title, setTitle] = useState('');
  const [quizType, setQuizType] = useState('AUTOMATIC'); // AUTOMATIC or MANUAL_FILE
  const [passingScore, setPassingScore] = useState(50);
  
  // States for AUTOMATIC
  const [questions, setQuestions] = useState([{ text: '', options: ['', '', '', ''], correctAnswer: 0, points: 1 }]);
  const [aiContext, setAiContext] = useState('');
  const [isAiLoading, setIsAiLoading] = useState(false);

  // States for MANUAL_FILE
  const [fileUrl, setFileUrl] = useState('');
  const [totalMarks, setTotalMarks] = useState(100);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const selectedCourse = courses.find(c => c.id === courseId);
  const chapters = selectedCourse?.chapters || [];

  const handleAddQuestion = () => {
    setQuestions([...questions, { text: '', options: ['', '', '', ''], correctAnswer: 0, points: 1 }]);
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
    if (field === 'points') newQ[index].points = value;
    if (field === 'option' && optionIndex !== undefined) {
      newQ[index].options[optionIndex] = value;
    }
    setQuestions(newQ);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    const formData = new FormData();
    formData.append('file', file);
    formData.append('type', 'document');

    try {
      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData
      });
      if (res.ok) {
        const data = await res.json();
        setFileUrl(data.url);
      } else {
        alert('فشل رفع الملف. يرجى التأكد من حجم الملف.');
      }
    } catch (error) {
      alert('خطأ في الاتصال بالخادم أثناء الرفع.');
    }
    setIsUploading(false);
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
          message: `قم بتوليد 3 أسئلة اختيار من متعدد (MCQ) باللغة العربية بناءً على النص التالي:\n\n${aiContext}\n\nيجب أن يكون الرد بصيغة JSON حصراً بهذا الهيكل: [{"text": "السؤال", "options": ["خيار1", "خيار2", "خيار3", "خيار4"], "correctAnswer": 0, "points": 2}]` 
        })
      });
      if (res.ok) {
        const data = await res.json();
        let generatedQuestions = [];
        try {
          const jsonStr = data.reply.replace(/```json/g, '').replace(/```/g, '').trim();
          generatedQuestions = JSON.parse(jsonStr);
          if (Array.isArray(generatedQuestions) && generatedQuestions.length > 0) {
            setQuestions([...questions, ...generatedQuestions.map(q => ({...q, points: q.points || 1}))]);
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
    if (!courseId || !chapterId || !title) {
      alert('يرجى تعبئة جميع الحقول الأساسية');
      return;
    }

    if (quizType === 'AUTOMATIC' && questions.length === 0) {
      alert('يرجى إضافة سؤال واحد على الأقل للاختبار المؤتمت');
      return;
    }

    if (quizType === 'MANUAL_FILE' && !fileUrl) {
      alert('يرجى رفع ملف الاختبار');
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
          type: quizType,
          passingScore: Number(passingScore),
          totalMarks: quizType === 'MANUAL_FILE' ? Number(totalMarks) : null,
          fileUrl: quizType === 'MANUAL_FILE' ? fileUrl : null,
          questions: quizType === 'AUTOMATIC' ? questions : []
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

      <h1 style={{ fontSize: '2rem', fontWeight: 'bold', marginBottom: '2rem' }}>إنشاء اختبار احترافي 📝</h1>

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

            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>عنوان الاختبار</label>
              <input 
                required
                type="text" 
                placeholder="مثال: الاختبار النهائي الشامل"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                style={{ width: '100%', padding: '1rem', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', borderRadius: '8px', fontSize: '1.05rem' }}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>نوع الاختبار</label>
                <select 
                  value={quizType} 
                  onChange={(e) => setQuizType(e.target.value)}
                  style={{ width: '100%', padding: '1rem', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', borderRadius: '8px', fontSize: '1.05rem' }}
                >
                  <option value="AUTOMATIC" style={{ background: '#111' }}>أسئلة مؤتمتة (اختيار من متعدد)</option>
                  <option value="MANUAL_FILE" style={{ background: '#111' }}>رفع ملف جاهز (يصحح يدوياً)</option>
                </select>
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>علامة النجاح</label>
                <input 
                  required
                  type="number" 
                  min="1"
                  value={passingScore}
                  onChange={(e) => setPassingScore(Number(e.target.value))}
                  style={{ width: '100%', padding: '1rem', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', borderRadius: '8px', fontSize: '1.05rem' }}
                />
              </div>
            </div>
          </div>

          {quizType === 'MANUAL_FILE' && (
            <div style={{ background: '#111', padding: '2rem', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.05)', marginBottom: '2rem' }}>
              <h2 style={{ fontSize: '1.2rem', marginBottom: '1.5rem', fontWeight: 'bold', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <FileText size={20} color="var(--primary)" /> إعدادات ملف الاختبار
              </h2>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>ملف الاختبار (PDF, Word...)</label>
                  <div 
                    onClick={() => fileInputRef.current?.click()}
                    style={{ padding: '2rem', border: '2px dashed rgba(255,255,255,0.2)', borderRadius: '12px', textAlign: 'center', cursor: 'pointer', background: 'rgba(255,255,255,0.02)' }}
                  >
                    {isUploading ? (
                      <Loader2 size={30} className="animate-spin" style={{ margin: '0 auto', color: 'var(--primary)' }} />
                    ) : fileUrl ? (
                      <div>
                        <FileText size={30} color="var(--success)" style={{ margin: '0 auto 1rem auto' }} />
                        <span style={{ color: 'var(--success)', fontWeight: 'bold' }}>تم رفع الملف بنجاح!</span>
                      </div>
                    ) : (
                      <div>
                        <UploadCloud size={30} color="rgba(255,255,255,0.5)" style={{ margin: '0 auto 1rem auto' }} />
                        <span style={{ color: 'rgba(255,255,255,0.7)' }}>اضغط لرفع ملف الاختبار</span>
                      </div>
                    )}
                  </div>
                  <input type="file" ref={fileInputRef} onChange={handleFileUpload} style={{ display: 'none' }} accept=".pdf,.doc,.docx,.jpg,.png" />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>العلامة الكلية للاختبار</label>
                  <input 
                    required
                    type="number" 
                    min="1"
                    value={totalMarks}
                    onChange={(e) => setTotalMarks(Number(e.target.value))}
                    style={{ width: '100%', padding: '1rem', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', borderRadius: '8px', fontSize: '1.05rem' }}
                  />
                  <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.85rem', marginTop: '0.5rem' }}>
                    في هذا النوع من الاختبارات، سيقوم الطالب بتحميل الملف ثم يرفع ملف إجابته لك لتقوم بتصحيحه وإعطائه درجة من هذه العلامة الكلية.
                  </p>
                </div>
              </div>
            </div>
          )}

          {quizType === 'AUTOMATIC' && (
            <>
              {/* AI Generator */}
              <div style={{ background: 'linear-gradient(135deg, rgba(203, 161, 83, 0.1) 0%, rgba(5, 5, 5, 0.9) 100%)', padding: '2rem', borderRadius: '16px', border: '1px solid var(--primary)', marginBottom: '2rem' }}>
                <h2 style={{ fontSize: '1.2rem', marginBottom: '1rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Bot size={24} color="var(--primary)" /> المساعد الذكي (توليد الأسئلة أوتوماتيكياً)
                </h2>
                <p style={{ color: 'rgba(255,255,255,0.6)', marginBottom: '1rem', fontSize: '0.9rem' }}>
                  قم بلصق محتوى الدرس هنا، وسيقوم الذكاء الاصطناعي باستخراج الأسئلة وتحديد العلامة وإضافتها للأسفل.
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
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                  <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>الأسئلة ({questions.length})</h2>
                  <div style={{ background: 'rgba(255,255,255,0.1)', padding: '0.5rem 1rem', borderRadius: '8px' }}>
                    مجموع العلامات: <strong style={{ color: 'var(--primary)' }}>{questions.reduce((sum, q) => sum + Number(q.points || 0), 0)}</strong>
                  </div>
                </div>
                
                {questions.map((q, qIndex) => (
                  <div key={qIndex} style={{ background: '#111', padding: '2rem', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.05)', marginBottom: '1.5rem', position: 'relative' }}>
                    <button 
                      type="button" 
                      onClick={() => handleRemoveQuestion(qIndex)}
                      style={{ position: 'absolute', top: '1.5rem', left: '1.5rem', background: 'rgba(239, 68, 68, 0.1)', border: 'none', color: '#ef4444', padding: '0.5rem', borderRadius: '8px', cursor: 'pointer' }}
                    >
                      <Trash2 size={18} />
                    </button>
                    
                    <div style={{ display: 'grid', gridTemplateColumns: '4fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
                      <div>
                        <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold', color: 'var(--primary)' }}>السؤال رقم {qIndex + 1}</label>
                        <input 
                          required
                          type="text" 
                          placeholder="اكتب نص السؤال هنا..."
                          value={q.text}
                          onChange={(e) => handleQuestionChange(qIndex, 'text', e.target.value)}
                          style={{ width: '100%', padding: '1rem', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', borderRadius: '8px', fontSize: '1.05rem' }}
                        />
                      </div>
                      <div>
                        <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold', color: '#10b981' }}>علامة السؤال</label>
                        <input 
                          required
                          type="number" 
                          min="0.5"
                          step="0.5"
                          value={q.points}
                          onChange={(e) => handleQuestionChange(qIndex, 'points', Number(e.target.value))}
                          style={{ width: '100%', padding: '1rem', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', borderRadius: '8px', fontSize: '1.05rem', textAlign: 'center' }}
                        />
                      </div>
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
            </>
          )}

          <button 
            type="submit" 
            disabled={isLoading || chapters.length === 0}
            style={{ width: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem', padding: '1.2rem', background: 'var(--primary)', color: '#000', borderRadius: '8px', fontWeight: 'bold', border: 'none', cursor: (isLoading || chapters.length === 0) ? 'not-allowed' : 'pointer', fontSize: '1.2rem' }}
          >
            {isLoading ? 'جاري الحفظ...' : <><Save size={24} /> حفظ الاختبار واعتماده</>}
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
