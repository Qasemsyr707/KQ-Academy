'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { PlayCircle, CheckCircle, ChevronDown, ChevronUp, Lock, ArrowRight, Menu, X, Award, Star, Paperclip, CheckSquare, MessageCircle, Send, Radio } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import '@livekit/components-styles';
import { LiveKitRoom, VideoConference, RoomAudioRenderer } from '@livekit/components-react';

export default function CoursePlayerClient({ course, chapters }: { course: any, chapters: any[] }) {
  const [activeItem, setActiveItem] = useState<any>(chapters[0]?.lessons?.[0] || chapters[0]?.quizzes?.[0]);
  const [completedItems, setCompletedItems] = useState<string[]>([]);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [openChapters, setOpenChapters] = useState<string[]>([chapters[0]?.id]);
  
  // Certificate & Review States
  const [certId, setCertId] = useState<string | null>(null);
  const [isGeneratingCert, setIsGeneratingCert] = useState(false);
  
  const [showReview, setShowReview] = useState(false);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);
  const [reviewSubmitted, setReviewSubmitted] = useState(false);

  // Quiz State
  const [quizAnswers, setQuizAnswers] = useState<Record<string, number>>({});
  const [quizResult, setQuizResult] = useState<{ score: number, passed: boolean } | null>(null);
  const [isSubmittingQuiz, setIsSubmittingQuiz] = useState(false);

  // Q&A State
  const [questions, setQuestions] = useState<any[]>(course.questions || []);
  const [newQuestionText, setNewQuestionText] = useState('');
  const [isSubmittingQuestion, setIsSubmittingQuestion] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [replyingTo, setReplyingTo] = useState<string | null>(null);

  // Live Session State
  const [liveToken, setLiveToken] = useState('');
  const [isFetchingToken, setIsFetchingToken] = useState(false);

  const router = useRouter();

  useEffect(() => {
    const fetchLiveToken = async () => {
      if (!activeItem || !activeItem.isLive || !activeItem.liveRoomName) return;
      setIsFetchingToken(true);
      try {
        const res = await fetch(`/api/livekit/token?room=${activeItem.liveRoomName}&username=Student_${Math.floor(Math.random() * 1000)}`);
        if (res.ok) {
          const data = await res.json();
          setLiveToken(data.token);
        } else {
          console.error("Failed to fetch token");
        }
      } catch (err) {
        console.error(err);
      }
      setIsFetchingToken(false);
    };

    setLiveToken('');
    if (activeItem && activeItem.isLive) {
      fetchLiveToken();
    }
  }, [activeItem]);

  const toggleChapter = (chapterId: string) => {
    if (openChapters.includes(chapterId)) {
      setOpenChapters(openChapters.filter(id => id !== chapterId));
    } else {
      setOpenChapters([...openChapters, chapterId]);
    }
  };

  const markCompleted = (itemId: string) => {
    if (!completedItems.includes(itemId)) {
      setCompletedItems([...completedItems, itemId]);
    }
  };

  const calculateProgress = () => {
    let totalItems = 0;
    chapters.forEach(c => {
      totalItems += (c.lessons?.length || 0);
      totalItems += (c.quizzes?.length || 0);
    });
    if (totalItems === 0) return 0;
    return Math.round((completedItems.length / totalItems) * 100);
  };

  const handleGenerateCertificate = async () => {
    setIsGeneratingCert(true);
    try {
      const res = await fetch('/api/certificates/issue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ courseId: course.id || 'demo123' })
      });
      const data = await res.json();
      if (res.ok) {
        setCertId(data.certificateId);
      } else {
        alert(data.error);
      }
    } catch (err) {
      alert('حدث خطأ أثناء استخراج الشهادة');
    }
    setIsGeneratingCert(false);
  };

  const handleSubmitReview = async () => {
    setIsSubmittingReview(true);
    try {
      const res = await fetch('/api/reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ courseId: course.id || 'demo123', rating, comment })
      });
      if (res.ok) {
        setReviewSubmitted(true);
      } else {
        const data = await res.json();
        alert(data.error);
      }
    } catch (err) {
      alert('حدث خطأ');
    }
    setIsSubmittingReview(false);
  };

  const handleSubmitQuiz = async () => {
    if (!activeItem || !activeItem.questions) return;
    setIsSubmittingQuiz(true);
    try {
      const res = await fetch('/api/quizzes/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ quizId: activeItem.id, answers: quizAnswers })
      });
      const data = await res.json();
      if (res.ok) {
        setQuizResult({ score: data.attempt.score, passed: data.attempt.passed });
        if (data.attempt.passed) {
          markCompleted(activeItem.id);
        }
      } else {
        alert(data.error);
      }
    } catch (err) {
      alert('Error submitting quiz');
    }
    setIsSubmittingQuiz(false);
  };

  const handleAskQuestion = async () => {
    if (!newQuestionText) return;
    setIsSubmittingQuestion(true);
    try {
      const res = await fetch('/api/qa/questions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: newQuestionText, courseId: course.id })
      });
      if (res.ok) {
        const data = await res.json();
        setQuestions([data.question, ...questions]);
        setNewQuestionText('');
      }
    } catch (e) {
      alert('Error posting question');
    }
    setIsSubmittingQuestion(false);
  };

  const handleReply = async (questionId: string) => {
    if (!replyText) return;
    try {
      const res = await fetch('/api/qa/answers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: replyText, questionId })
      });
      if (res.ok) {
        const data = await res.json();
        setQuestions(questions.map(q => {
          if (q.id === questionId) {
            return { ...q, answers: [...(q.answers || []), data.answer] };
          }
          return q;
        }));
        setReplyText('');
        setReplyingTo(null);
      }
    } catch (e) {
      alert('Error posting reply');
    }
  };

  const progress = calculateProgress();
  const isQuiz = activeItem && 'questions' in activeItem;

  return (
    <div style={{ display: 'flex', height: '100vh', background: '#050505', color: '#fff', overflow: 'hidden' }}>
      
      {/* Main Content (Video / Quiz Player) */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', transition: 'all 0.3s' }}>
        {/* Top Navbar */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1rem 2rem', background: '#0a0a0a', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <button onClick={() => setSidebarOpen(!sidebarOpen)} style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer' }}>
              <Menu size={24} />
            </button>
            <h1 style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>{course.title}</h1>
          </div>
          <Link href="/dashboard" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'rgba(255,255,255,0.6)', textDecoration: 'none' }}>
            العودة للوحة <ArrowRight size={16} />
          </Link>
        </div>

        {/* Dynamic Area (Video OR Quiz) */}
        <div style={{ flex: 1, padding: '2rem', display: 'flex', flexDirection: 'column', overflowY: 'auto' }}>
          <div style={{ width: '100%', maxWidth: '1000px', margin: '0 auto' }}>
            
            {/* If Lesson (Video or Live) */}
            {!isQuiz && activeItem && (
              <>
                {activeItem.isLive ? (
                  <div style={{ position: 'relative', width: '100%', height: '600px', background: '#000', borderRadius: '16px', overflow: 'hidden', boxShadow: '0 10px 30px rgba(0,0,0,0.5)', border: '1px solid var(--danger, #ef4444)' }}>
                    {isFetchingToken ? (
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#fff' }}>جاري الاتصال بالبث المباشر...</div>
                    ) : liveToken ? (
                      <LiveKitRoom
                        video={false}
                        audio={false}
                        token={liveToken}
                        serverUrl={process.env.NEXT_PUBLIC_LIVEKIT_URL}
                        data-lk-theme="default"
                        style={{ height: '100%' }}
                      >
                        <VideoConference />
                        <RoomAudioRenderer />
                      </LiveKitRoom>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#fff' }}>
                        <Radio size={48} color="var(--danger, #ef4444)" style={{ marginBottom: '1rem' }} />
                        <h3 style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>البث المباشر غير متاح حالياً</h3>
                        <p style={{ color: 'rgba(255,255,255,0.7)' }}>الرجاء المحاولة لاحقاً أو التأكد من موعد الجلسة</p>
                      </div>
                    )}
                  </div>
                ) : (
                  <div style={{ position: 'relative', width: '100%', paddingTop: '56.25%', background: '#000', borderRadius: '16px', overflow: 'hidden', boxShadow: '0 10px 30px rgba(0,0,0,0.5)', border: '1px solid rgba(255,255,255,0.05)' }}>
                    <video 
                      src={activeItem.videoUrl} 
                      controls 
                      autoPlay 
                      onEnded={() => markCompleted(activeItem.id)}
                      style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }}
                    />
                  </div>
                )}

                <div style={{ marginTop: '2rem' }}>
                  <h2 style={{ fontSize: '2rem', fontWeight: 'bold', marginBottom: '1rem' }}>{activeItem.title}</h2>
                  <div style={{ display: 'flex', gap: '1rem', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '2rem' }}>
                    <button 
                      onClick={() => markCompleted(activeItem.id)}
                      style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: completedItems.includes(activeItem.id) ? 'rgba(34, 197, 94, 0.1)' : 'var(--primary)', color: completedItems.includes(activeItem.id) ? '#22c55e' : '#000', padding: '0.8rem 1.5rem', borderRadius: '8px', border: 'none', fontWeight: 'bold', cursor: 'pointer' }}
                    >
                      <CheckCircle size={20} />
                      {completedItems.includes(activeItem.id) ? 'تم الإنجاز' : 'تحديد كمكتمل'}
                    </button>
                  </div>
                  
                  {/* Attachments Section */}
                  {activeItem.attachments && activeItem.attachments.length > 0 && (
                    <div style={{ marginTop: '2rem', background: 'rgba(255,255,255,0.02)', padding: '1.5rem', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
                      <h3 style={{ fontSize: '1.2rem', fontWeight: 'bold', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <Paperclip size={20} color="var(--primary)" /> المرفقات والملفات الخاصة بالدرس
                      </h3>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
                        {activeItem.attachments.map((att: any) => (
                          <a key={att.id} href={att.url} target="_blank" rel="noopener noreferrer" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1rem', background: 'rgba(255,255,255,0.05)', borderRadius: '8px', textDecoration: 'none', color: '#fff' }} className="hover:bg-white/10 transition-colors">
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
                              <div style={{ width: '40px', height: '40px', background: 'rgba(203, 161, 83, 0.2)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <Paperclip size={20} color="var(--primary)" />
                              </div>
                              <span style={{ fontWeight: 'bold' }}>{att.name}</span>
                            </div>
                            <span style={{ fontSize: '0.9rem', color: 'var(--primary)' }}>تحميل</span>
                          </a>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Q&A Section */}
                  <div style={{ marginTop: '3rem' }}>
                    <h3 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <MessageCircle size={24} color="var(--primary)" /> الأسئلة والمناقشات
                    </h3>
                    
                    {/* Ask a Question */}
                    <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem' }}>
                      <input 
                        type="text" 
                        placeholder="هل لديك سؤال حول هذا الدرس؟" 
                        value={newQuestionText}
                        onChange={e => setNewQuestionText(e.target.value)}
                        style={{ flex: 1, padding: '1rem', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', borderRadius: '8px' }}
                      />
                      <button onClick={handleAskQuestion} disabled={isSubmittingQuestion} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'var(--primary)', color: '#000', padding: '0 1.5rem', borderRadius: '8px', fontWeight: 'bold', border: 'none', cursor: 'pointer' }}>
                        <Send size={18} /> {isSubmittingQuestion ? 'جاري...' : 'طرح السؤال'}
                      </button>
                    </div>

                    {/* Questions List */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                      {questions.length === 0 ? (
                        <p style={{ color: 'rgba(255,255,255,0.5)', textAlign: 'center' }}>لا توجد أسئلة بعد، كن أول من يسأل!</p>
                      ) : (
                        questions.map(q => (
                          <div key={q.id} style={{ background: 'rgba(255,255,255,0.02)', padding: '1.5rem', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', marginBottom: '0.5rem' }}>
                              <div style={{ width: '30px', height: '30px', background: 'var(--primary)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#000', fontWeight: 'bold', fontSize: '0.8rem' }}>
                                {q.user.name.charAt(0)}
                              </div>
                              <span style={{ fontWeight: 'bold' }}>{q.user.name}</span>
                            </div>
                            <p style={{ color: 'rgba(255,255,255,0.9)', marginBottom: '1rem', lineHeight: 1.6 }}>{q.text}</p>
                            
                            {/* Answers */}
                            {q.answers && q.answers.length > 0 && (
                              <div style={{ marginLeft: '2rem', paddingLeft: '1rem', borderLeft: '2px solid rgba(255,255,255,0.1)', display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '1rem' }}>
                                {q.answers.map((ans: any) => (
                                  <div key={ans.id}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.3rem' }}>
                                      <span style={{ fontWeight: 'bold', fontSize: '0.9rem', color: ans.user.role === 'INSTRUCTOR' || ans.user.role === 'ADMIN' ? 'var(--primary)' : '#fff' }}>{ans.user.name}</span>
                                      {ans.user.role === 'INSTRUCTOR' && <span style={{ background: 'var(--primary)', color: '#000', fontSize: '0.6rem', padding: '0.1rem 0.4rem', borderRadius: '4px', fontWeight: 'bold' }}>المدرب</span>}
                                    </div>
                                    <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.9rem' }}>{ans.text}</p>
                                  </div>
                                ))}
                              </div>
                            )}

                            {replyingTo === q.id ? (
                              <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem' }}>
                                <input 
                                  type="text" 
                                  placeholder="اكتب إجابتك هنا..." 
                                  value={replyText}
                                  onChange={e => setReplyText(e.target.value)}
                                  style={{ flex: 1, padding: '0.8rem', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', borderRadius: '4px', fontSize: '0.9rem' }}
                                />
                                <button onClick={() => handleReply(q.id)} style={{ background: 'var(--primary)', color: '#000', padding: '0 1rem', borderRadius: '4px', fontWeight: 'bold', border: 'none', cursor: 'pointer', fontSize: '0.9rem' }}>رد</button>
                                <button onClick={() => setReplyingTo(null)} style={{ background: 'transparent', color: '#fff', padding: '0 1rem', borderRadius: '4px', border: '1px solid rgba(255,255,255,0.2)', cursor: 'pointer', fontSize: '0.9rem' }}>إلغاء</button>
                              </div>
                            ) : (
                              <button onClick={() => setReplyingTo(q.id)} style={{ background: 'transparent', border: 'none', color: 'rgba(255,255,255,0.5)', cursor: 'pointer', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                                أضف رد
                              </button>
                            )}
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                </div>
              </>
            )}

            {/* If Quiz */}
            {isQuiz && activeItem && (
              <div style={{ background: '#111', padding: '3rem', borderRadius: '24px', border: '1px solid rgba(255,255,255,0.05)', boxShadow: '0 20px 40px rgba(0,0,0,0.5)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '2rem' }}>
                  <div style={{ width: '60px', height: '60px', background: 'rgba(203, 161, 83, 0.1)', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <CheckSquare size={32} color="var(--warning)" />
                  </div>
                  <div>
                    <h2 style={{ fontSize: '2rem', fontWeight: 'bold' }}>{activeItem.title}</h2>
                    <p style={{ color: 'rgba(255,255,255,0.5)' }}>اختبر معلوماتك لفتح الفصول القادمة واستخراج الشهادة.</p>
                  </div>
                </div>

                {quizResult ? (
                  <div style={{ textAlign: 'center', padding: '2rem', background: quizResult.passed ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.1)', borderRadius: '16px' }}>
                    <h3 style={{ fontSize: '1.5rem', fontWeight: 'bold', color: quizResult.passed ? '#22c55e' : '#ef4444', marginBottom: '1rem' }}>
                      {quizResult.passed ? 'نجاح! 🎉' : 'لم تجتز الاختبار 😔'}
                    </h3>
                    <p style={{ fontSize: '1.2rem', marginBottom: '1rem' }}>النتيجة: {quizResult.score}%</p>
                    {quizResult.passed ? (
                      <p style={{ color: 'rgba(255,255,255,0.7)' }}>تم تسجيل الاختبار كمكتمل، يمكنك متابعة الدروس.</p>
                    ) : (
                      <button onClick={() => { setQuizResult(null); setQuizAnswers({}); }} style={{ background: 'var(--primary)', color: '#000', padding: '0.8rem 2rem', borderRadius: '8px', border: 'none', fontWeight: 'bold', cursor: 'pointer' }}>
                        إعادة المحاولة
                      </button>
                    )}
                  </div>
                ) : (
                  <>
                    {activeItem.questions?.length === 0 ? (
                      <p style={{ textAlign: 'center', opacity: 0.5 }}>لم يتم إضافة أسئلة لهذا الاختبار بعد.</p>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                        {activeItem.questions?.map((q: any, qIndex: number) => {
                          const options = typeof q.options === 'string' ? JSON.parse(q.options) : q.options;
                          return (
                            <div key={q.id} style={{ background: 'rgba(255,255,255,0.02)', padding: '1.5rem', borderRadius: '12px' }}>
                              <h4 style={{ fontSize: '1.2rem', fontWeight: 'bold', marginBottom: '1rem' }}>{qIndex + 1}. {q.text}</h4>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                {options.map((opt: string, optIndex: number) => (
                                  <label key={optIndex} style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1rem', background: quizAnswers[q.id] === optIndex ? 'rgba(203, 161, 83, 0.2)' : 'rgba(255,255,255,0.05)', border: quizAnswers[q.id] === optIndex ? '1px solid var(--primary)' : '1px solid transparent', borderRadius: '8px', cursor: 'pointer', transition: 'all 0.2s' }}>
                                    <input 
                                      type="radio" 
                                      name={`question_${q.id}`} 
                                      checked={quizAnswers[q.id] === optIndex}
                                      onChange={() => setQuizAnswers({ ...quizAnswers, [q.id]: optIndex })}
                                      style={{ width: '20px', height: '20px', accentColor: 'var(--primary)' }}
                                    />
                                    <span style={{ fontSize: '1.1rem' }}>{opt}</span>
                                  </label>
                                ))}
                              </div>
                            </div>
                          );
                        })}
                        
                        <button 
                          onClick={handleSubmitQuiz} 
                          disabled={isSubmittingQuiz || Object.keys(quizAnswers).length < activeItem.questions.length}
                          style={{ background: 'var(--primary)', color: '#000', padding: '1rem 2rem', borderRadius: '8px', fontWeight: 'bold', border: 'none', cursor: 'pointer', fontSize: '1.1rem', opacity: (isSubmittingQuiz || Object.keys(quizAnswers).length < activeItem.questions.length) ? 0.5 : 1 }}
                        >
                          {isSubmittingQuiz ? 'جاري التصحيح...' : 'إرسال الإجابات'}
                        </button>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}

            {!activeItem && (
               <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '400px', color: 'rgba(255,255,255,0.5)' }}>
                الرجاء اختيار درس أو اختبار من القائمة
              </div>
            )}

            {/* Achievement Section (Visible only when progress == 100%) */}
            {progress === 100 && (
              <motion.div 
                initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                style={{ marginTop: '2rem', background: 'linear-gradient(135deg, rgba(34, 197, 94, 0.1) 0%, rgba(203, 161, 83, 0.1) 100%)', padding: '2rem', borderRadius: '16px', border: '1px solid rgba(203, 161, 83, 0.3)', textAlign: 'center' }}
              >
                <Award size={48} color="var(--primary)" style={{ margin: '0 auto 1rem auto' }} />
                <h3 style={{ fontSize: '1.8rem', fontWeight: 'bold', marginBottom: '0.5rem', color: '#fff' }}>مبارك إتمام الكورس! 🎉</h3>
                <p style={{ color: 'rgba(255,255,255,0.8)', marginBottom: '2rem' }}>لقد أتممت بنجاح مشاهدة جميع الدروس وحل الاختبارات. يمكنك الآن استخراج شهادتك وتقييم الكورس.</p>
                
                <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem', flexWrap: 'wrap' }}>
                  {certId ? (
                    <Link href={`/verify/${certId}`} target="_blank" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', background: '#22c55e', color: '#000', padding: '0.8rem 2rem', borderRadius: '8px', fontWeight: 'bold', textDecoration: 'none' }}>
                      <CheckCircle size={20} /> عرض الشهادة
                    </Link>
                  ) : (
                    <button onClick={handleGenerateCertificate} disabled={isGeneratingCert} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', background: 'var(--primary)', color: '#000', padding: '0.8rem 2rem', borderRadius: '8px', fontWeight: 'bold', border: 'none', cursor: 'pointer', opacity: isGeneratingCert ? 0.7 : 1 }}>
                      <Award size={20} /> {isGeneratingCert ? 'جاري الاستخراج...' : 'استخراج الشهادة'}
                    </button>
                  )}

                  <button onClick={() => setShowReview(!showReview)} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(255,255,255,0.1)', color: '#fff', padding: '0.8rem 2rem', borderRadius: '8px', fontWeight: 'bold', border: '1px solid rgba(255,255,255,0.2)', cursor: 'pointer' }}>
                    <Star size={20} fill={showReview ? "var(--warning)" : "transparent"} color="var(--warning)" /> تقييم الكورس
                  </button>
                </div>

                {/* Review Form */}
                <AnimatePresence>
                  {showReview && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} style={{ overflow: 'hidden', marginTop: '2rem', textAlign: 'right' }}>
                      {reviewSubmitted ? (
                        <div style={{ background: 'rgba(34, 197, 94, 0.1)', padding: '1rem', borderRadius: '8px', color: '#22c55e', textAlign: 'center' }}>شكراً لك! تم إرسال تقييمك بنجاح.</div>
                      ) : (
                        <div style={{ background: 'rgba(0,0,0,0.5)', padding: '1.5rem', borderRadius: '12px' }}>
                          <h4 style={{ marginBottom: '1rem', fontWeight: 'bold' }}>ما هو تقييمك للكورس؟</h4>
                          <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', flexDirection: 'row-reverse', justifyContent: 'flex-end' }}>
                            {[1, 2, 3, 4, 5].map((star) => (
                              <button key={star} onClick={() => setRating(star)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
                                <Star size={32} fill={star <= rating ? "var(--warning)" : "transparent"} color={star <= rating ? "var(--warning)" : "rgba(255,255,255,0.2)"} />
                              </button>
                            ))}
                          </div>
                          <textarea 
                            placeholder="اكتب رأيك بالكورس والمدرب هنا... (اختياري)"
                            value={comment}
                            onChange={(e) => setComment(e.target.value)}
                            style={{ width: '100%', height: '100px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', padding: '1rem', color: '#fff', marginBottom: '1rem', resize: 'none', fontFamily: 'inherit' }}
                          />
                          <button onClick={handleSubmitReview} disabled={isSubmittingReview} style={{ background: 'var(--primary)', color: '#000', padding: '0.8rem 2rem', borderRadius: '8px', fontWeight: 'bold', border: 'none', cursor: 'pointer' }}>
                            {isSubmittingReview ? 'جاري الإرسال...' : 'إرسال التقييم'}
                          </button>
                        </div>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            )}

          </div>
        </div>
      </div>

      {/* Sidebar (Curriculum) */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div 
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 400, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            style={{ background: '#0a0a0a', borderRight: '1px solid rgba(255,255,255,0.05)', display: 'flex', flexDirection: 'column' }}
          >
            {/* Sidebar Header */}
            <div style={{ padding: '1.5rem', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <h3 style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>محتوى الكورس</h3>
                <button onClick={() => setSidebarOpen(false)} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.5)', cursor: 'pointer' }}>
                  <X size={20} />
                </button>
              </div>
              
              {/* Progress Bar */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', marginBottom: '0.5rem', color: 'rgba(255,255,255,0.7)' }}>
                  <span>نسبة الإنجاز</span>
                  <span style={{ color: 'var(--primary)', fontWeight: 'bold' }}>{progress}%</span>
                </div>
                <div style={{ width: '100%', height: '6px', background: 'rgba(255,255,255,0.1)', borderRadius: '4px', overflow: 'hidden' }}>
                  <div style={{ width: `${progress}%`, height: '100%', background: 'var(--primary)', transition: 'width 0.5s' }} />
                </div>
              </div>
            </div>

            {/* Curriculum List */}
            <div style={{ flex: 1, overflowY: 'auto' }}>
              {chapters.map((chapter, index) => (
                <div key={chapter.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.02)' }}>
                  <button 
                    onClick={() => toggleChapter(chapter.id)}
                    style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1.2rem 1.5rem', background: 'transparent', border: 'none', color: '#fff', cursor: 'pointer', textAlign: 'right' }}
                  >
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                      <span style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.5)' }}>القسم {index + 1}</span>
                      <span style={{ fontWeight: 'bold' }}>{chapter.title}</span>
                    </div>
                    {openChapters.includes(chapter.id) ? <ChevronUp size={20} color="rgba(255,255,255,0.4)" /> : <ChevronDown size={20} color="rgba(255,255,255,0.4)" />}
                  </button>

                  <AnimatePresence>
                    {openChapters.includes(chapter.id) && (
                      <motion.div 
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        style={{ overflow: 'hidden' }}
                      >
                        {/* Lessons */}
                        {chapter.lessons?.map((lesson: any, lessonIdx: number) => {
                          const isActive = activeItem?.id === lesson.id;
                          const isCompleted = completedItems.includes(lesson.id);
                          const hasAttachments = lesson.attachments && lesson.attachments.length > 0;
                          
                          return (
                            <button
                              key={lesson.id}
                              onClick={() => setActiveItem(lesson)}
                              style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '1rem', padding: '1rem 1.5rem', background: isActive ? 'rgba(203, 161, 83, 0.1)' : 'transparent', border: 'none', borderRight: isActive ? '3px solid var(--primary)' : '3px solid transparent', color: isActive ? '#fff' : 'rgba(255,255,255,0.6)', cursor: 'pointer', textAlign: 'right', transition: 'all 0.2s' }}
                              className="hover:bg-white/5"
                            >
                              <div>
                                {isCompleted ? (
                                  <CheckCircle size={18} color="#22c55e" />
                                ) : lesson.isLive ? (
                                  <Radio size={18} color={isActive ? 'var(--danger, #ef4444)' : 'rgba(239, 68, 68, 0.5)'} />
                                ) : (
                                  <PlayCircle size={18} color={isActive ? 'var(--primary)' : 'rgba(255,255,255,0.4)'} />
                                )}
                              </div>
                              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                                <span style={{ fontSize: '0.9rem', fontWeight: isActive ? 'bold' : 'normal' }}>{lessonIdx + 1}. {lesson.title}</span>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                  <span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)' }}>{lesson.duration || 'فيديو'}</span>
                                  {hasAttachments && <Paperclip size={12} color="var(--primary)" />}
                                </div>
                              </div>
                            </button>
                          );
                        })}

                        {/* Quizzes */}
                        {chapter.quizzes?.map((quiz: any, quizIdx: number) => {
                          const isActive = activeItem?.id === quiz.id;
                          const isCompleted = completedItems.includes(quiz.id);
                          
                          return (
                            <button
                              key={quiz.id}
                              onClick={() => setActiveItem(quiz)}
                              style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '1rem', padding: '1rem 1.5rem', background: isActive ? 'rgba(203, 161, 83, 0.1)' : 'transparent', border: 'none', borderRight: isActive ? '3px solid var(--warning)' : '3px solid transparent', color: isActive ? '#fff' : 'rgba(255,255,255,0.6)', cursor: 'pointer', textAlign: 'right', transition: 'all 0.2s' }}
                              className="hover:bg-white/5"
                            >
                              <div>
                                {isCompleted ? (
                                  <CheckCircle size={18} color="#22c55e" />
                                ) : (
                                  <CheckSquare size={18} color={isActive ? 'var(--warning)' : 'rgba(255,255,255,0.4)'} />
                                )}
                              </div>
                              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                                <span style={{ fontSize: '0.9rem', fontWeight: isActive ? 'bold' : 'normal', color: isActive ? 'var(--warning)' : 'inherit' }}>اختبار: {quiz.title}</span>
                                <span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)' }}>{quiz.questions?.length || 0} أسئلة</span>
                              </div>
                            </button>
                          );
                        })}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <style jsx global>{`
        .hover\\:bg-white\\/5:hover { background-color: rgba(255,255,255,0.05) !important; }
        .transition-colors { transition: background-color 0.2s; }
        .hover\\:bg-white\\/10:hover { background-color: rgba(255,255,255,0.1) !important; }
      `}</style>
    </div>
  );
}
