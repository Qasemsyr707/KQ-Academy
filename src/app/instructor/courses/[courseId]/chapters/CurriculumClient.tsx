'use client';

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { PlusCircle, Video, GripVertical, Trash2, Edit2, ArrowRight, Paperclip, CheckSquare, Radio } from 'lucide-react';
import Link from 'next/link';
import { BunnyUploadPaused, useBunnyUpload } from '@/hooks/use-bunny-upload';
import { BunnyUploadStatus } from '@/components/BunnyUploadStatus';
import { AttachmentLinks } from '@/components/AttachmentLinks';

export default function CurriculumClient({ course }: { course: any }) {
  const [chapters, setChapters] = useState(course.chapters || []);
  const [isAddingChapter, setIsAddingChapter] = useState(false);
  const [newChapterTitle, setNewChapterTitle] = useState('');
  
  const [addingLessonTo, setAddingLessonTo] = useState<string | null>(null);
  const [newLessonTitle, setNewLessonTitle] = useState('');
  const [newLessonVideoFile, setNewLessonVideoFile] = useState<File | null>(null);
  const [isLiveLesson, setIsLiveLesson] = useState(false);
  const [liveLessonStartTime, setLiveLessonStartTime] = useState('');
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const lessonUpload = useBunnyUpload({ courseId: course.id, purpose: 'lesson' });
  const lessonSaving = useRef(false);

  // Attachment State
  const [addingAttachmentTo, setAddingAttachmentTo] = useState<string | null>(null);
  const [attachmentName, setAttachmentName] = useState('');
  const [attachmentUrl, setAttachmentUrl] = useState('');
  const [isUploadingAttachment, setIsUploadingAttachment] = useState(false);
  const [isSavingAttachment, setIsSavingAttachment] = useState(false);
  const [attachmentOriginalName, setAttachmentOriginalName] = useState('');
  const [attachmentError, setAttachmentError] = useState('');
  const attachmentBusy = useRef(false);

  // Quiz State
  const [addingQuizTo, setAddingQuizTo] = useState<string | null>(null);
  const [quizTitle, setQuizTitle] = useState('');

  const router = useRouter();

  const handleAddChapter = async () => {
    if (!newChapterTitle) return;
    try {
      const res = await fetch('/api/chapters', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: newChapterTitle, courseId: course.id })
      });
      if (res.ok) {
        const { chapter } = await res.json();
        chapter.lessons = []; // initialize
        chapter.quizzes = [];
        setChapters([...chapters, chapter]);
        setNewChapterTitle('');
        setIsAddingChapter(false);
        router.refresh();
      }
    } catch (e) {
      alert('Error adding chapter');
    }
  };

  const handleAddLesson = async (chapterId: string) => {
    if (lessonSaving.current) return;
    if (!newLessonTitle || (!newLessonVideoFile && !isLiveLesson)) {
      alert('يرجى إدخال عنوان الدرس واختيار ملف الفيديو');
      return;
    }

    lessonSaving.current = true;
    setIsUploading(true);
    let finalVideoUrl = null;

    try {
      if (!isLiveLesson && newLessonVideoFile) {
        if (newLessonVideoFile.type.startsWith('video/')) {
          setUploadProgress(0);
          const uploaded = await lessonUpload.upload(newLessonVideoFile, newLessonTitle);
          finalVideoUrl = uploaded.embedUrl;
        } else {
          // Non-video file (audio, pdf, images, etc.) -> Cloud Upload
          setUploadProgress(10);
          const formData = new FormData();
          formData.append('file', newLessonVideoFile);
          formData.append('type', 'document');
          formData.append('courseId', course.id);
          
          const uploadRes = await fetch('/api/upload', {
            method: 'POST',
            body: formData
          });
          
          const uploaded = await uploadRes.json();
          if (!uploadRes.ok) throw new Error(uploaded.error || 'فشل رفع الملف الأصلي');
          const { url } = uploaded;
          finalVideoUrl = url;
          setUploadProgress(100);
        }
      }

      // 3. Save Lesson to Database
      const res = await fetch('/api/lessons', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          title: newLessonTitle, 
          videoUrl: finalVideoUrl, 
          chapterId,
          isLive: isLiveLesson,
          liveStartTime: isLiveLesson ? liveLessonStartTime : null
        })
      });
      
      if (res.ok) {
        const { lesson } = await res.json();
        lesson.attachments = [];
        setChapters(chapters.map((ch: any) => {
          if (ch.id === chapterId) {
            return { ...ch, lessons: [...ch.lessons, lesson] };
          }
          return ch;
        }));
        lessonUpload.complete();
        setNewLessonTitle('');
        setNewLessonVideoFile(null);
        setIsLiveLesson(false);
        setLiveLessonStartTime('');
        setAddingLessonTo(null);
        setUploadProgress(null);
        router.refresh();
      } else {
        const data = await res.json();
        alert(data.error || 'حدث خطأ');
      }
    } catch (e: unknown) {
      if (!(e instanceof BunnyUploadPaused)) alert(e instanceof Error ? e.message : 'حدث خطأ أثناء رفع الفيديو');
    } finally {
      lessonSaving.current = false;
      setIsUploading(false);
      setUploadProgress(null);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || attachmentBusy.current) return;
    e.target.value = '';
    
    // Set file name automatically if not set
    if (!attachmentName) {
      setAttachmentName(file.name);
    }

    attachmentBusy.current = true;
    setIsUploadingAttachment(true);
    setAttachmentError('');
    setAttachmentUrl('');
    setAttachmentOriginalName(file.name);
    const formData = new FormData();
    formData.append('file', file);
    formData.append('type', 'document');
    formData.append('courseId', course.id);
    try {
      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'فشل رفع الملف الأصلي');
      if (typeof data.url !== 'string' || !data.url.startsWith('/api/files/')) throw new Error('لم يتم حفظ رابط صالح للملف الأصلي');
      setAttachmentUrl(data.url);
    } catch (err) {
      setAttachmentError(err instanceof Error ? err.message : 'خطأ أثناء رفع الملف الأصلي');
    } finally {
      attachmentBusy.current = false;
      setIsUploadingAttachment(false);
    }
  };

  const handleAddAttachment = async (lessonId: string) => {
    if (attachmentBusy.current) return;
    if (!attachmentName || !attachmentUrl) {
      setAttachmentError('الرجاء كتابة اسم المرفق ورفع ملفه الأصلي');
      return;
    }
    attachmentBusy.current = true;
    setIsSavingAttachment(true);
    setAttachmentError('');
    try {
      const res = await fetch('/api/attachments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: attachmentName, url: attachmentUrl, lessonId })
      });
      if (res.ok) {
        const data = await res.json();
        if (data.attachment) {
          setChapters((current: any[]) => current.map(chapter => ({
            ...chapter,
            lessons: chapter.lessons?.map((lesson: any) => lesson.id === lessonId
              ? { ...lesson, attachments: [...(lesson.attachments || []), data.attachment] }
              : lesson),
          })));
        }
        setAttachmentName('');
        setAttachmentUrl('');
        setAttachmentOriginalName('');
        setAddingAttachmentTo(null);
        alert('تم إضافة المرفق بنجاح');
        router.refresh();
      } else {
        const data = await res.json();
        throw new Error(data.error || 'تعذر حفظ المرفق');
      }
    } catch (e) {
      setAttachmentError(e instanceof Error ? e.message : 'تعذر حفظ المرفق');
    } finally {
      attachmentBusy.current = false;
      setIsSavingAttachment(false);
    }
  };

  const handleAddQuiz = async (chapterId: string) => {
    if (!quizTitle) return;
    try {
      const res = await fetch('/api/quizzes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: quizTitle, chapterId })
      });
      if (res.ok) {
        setQuizTitle('');
        setAddingQuizTo(null);
        alert('تم إضافة الاختبار! لبرمجة الأسئلة الرجاء إضافة واجهة أخرى لاحقاً');
        router.refresh();
      }
    } catch (e) {
      alert('Error adding quiz');
    }
  };

  const handlePublish = async () => {
    if (!confirm('هل أنت متأكد من نشر هذا الكورس للطلاب؟')) return;
    
    try {
      const res = await fetch(`/api/courses/${course.id}/publish`, {
        method: 'POST'
      });
      if (res.ok) {
        alert('تم نشر الكورس بنجاح!');
        router.push('/instructor/courses');
      } else {
        const data = await res.json();
        alert(data.error || 'فشل نشر الكورس');
      }
    } catch (e) {
      alert('حدث خطأ أثناء النشر');
    }
  };

  return (
    <div style={{ padding: '2rem', maxWidth: '800px', margin: '0 auto', color: '#fff' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <Link href="/instructor/courses" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', color: 'rgba(255,255,255,0.6)', textDecoration: 'none' }}>
          <ArrowRight size={20} /> العودة للكورسات
        </Link>
        {course.status !== 'PUBLISHED' && (
          <button onClick={handlePublish} style={{ padding: '0.8rem 1.5rem', background: 'var(--success, #22c55e)', color: '#fff', borderRadius: '8px', border: 'none', cursor: 'pointer', fontWeight: 'bold' }}>
            نشر الكورس للطلاب 🚀
          </button>
        )}
      </div>

      <h1 style={{ fontSize: '2rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>منهج الكورس: {course.title}</h1>
      <p style={{ opacity: 0.7, marginBottom: '2rem' }}>قم بتقسيم كورس الخاص بك إلى فصول، وأضف الدروس والمرفقات والاختبارات.</p>
      {course.attachments?.map((att: any) => <AttachmentLinks key={att.id} attachment={att} />)}

      {/* Chapters List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', marginBottom: '2rem' }}>
        {chapters.map((chapter: any, index: number) => (
          <div key={chapter.id} style={{ background: '#111', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)', overflow: 'hidden' }}>
            {/* Chapter Header */}
            <div style={{ padding: '1rem 1.5rem', background: 'rgba(255,255,255,0.02)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', fontWeight: 'bold' }}>
                <GripVertical size={20} color="rgba(255,255,255,0.3)" style={{ cursor: 'grab' }} />
                الفصل {index + 1}: {chapter.title}
              </div>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.5)', cursor: 'pointer' }}><Edit2 size={16} /></button>
                <button style={{ background: 'none', border: 'none', color: 'var(--danger, #ef4444)', cursor: 'pointer' }}><Trash2 size={16} /></button>
              </div>
            </div>

            {/* Lessons List */}
            <div style={{ padding: '1.5rem' }}>
              {chapter.attachments?.map((att: any) => <AttachmentLinks key={att.id} attachment={att} />)}
              {chapter.lessons?.length === 0 ? (
                <p style={{ opacity: 0.5, textAlign: 'center', marginBottom: '1rem' }}>لا يوجد دروس في هذا الفصل بعد.</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1.5rem' }}>
                  {chapter.lessons?.map((lesson: any) => (
                    <div key={lesson.id} style={{ display: 'flex', flexDirection: 'column', padding: '0.8rem 1rem', background: 'rgba(255,255,255,0.05)', borderRadius: '8px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
                          {lesson.isLive ? (
                            <Radio size={16} color="var(--danger, #ef4444)" />
                          ) : (
                            <Video size={16} color="var(--primary)" />
                          )}
                          <span>
                            {lesson.title} 
                            {lesson.isLive && <span style={{fontSize: '0.7rem', color: '#ef4444', background: 'rgba(239,68,68,0.1)', padding: '0.2rem 0.5rem', borderRadius: '10px', marginRight: '0.5rem'}}>بث مباشر</span>}
                          </span>
                        </div>
                        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                           {lesson.isLive && (
                             <Link href={`/instructor/courses/${course.id}/live/${lesson.id}`} style={{ background: 'var(--danger, #ef4444)', color: '#fff', border: 'none', padding: '0.3rem 0.8rem', borderRadius: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.8rem', textDecoration: 'none' }}>
                               <Radio size={14} /> استوديو البث
                             </Link>
                           )}
                           <button disabled={isUploadingAttachment || isSavingAttachment} onClick={() => { setAddingAttachmentTo(lesson.id); setAttachmentError(''); setAttachmentUrl(''); setAttachmentOriginalName(''); setAttachmentName(''); }} style={{ background: 'none', border: 'none', color: 'var(--primary)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.8rem' }}>
                             <Paperclip size={14} /> أضف مرفق
                           </button>
                           <button style={{ background: 'none', border: 'none', color: 'var(--danger, #ef4444)', cursor: 'pointer' }}><Trash2 size={16} /></button>
                        </div>
                      </div>

                      {lesson.attachments?.map((att: any) => <AttachmentLinks key={att.id} attachment={att} />)}
                      {/* Add Attachment Form inside Lesson */}
                      {addingAttachmentTo === lesson.id && (
                        <div style={{ marginTop: '1rem', background: 'rgba(0,0,0,0.3)', padding: '1.5rem', borderRadius: '12px', border: '1px solid rgba(203,161,83,0.2)' }}>
                           <h4 style={{ fontSize: '0.9rem', color: '#cba153', marginBottom: '1rem' }}>رفع ملف مرفق (PDF, صور, أو ملفات مضغوطة)</h4>
                           <input 
                            type="text" 
                            placeholder="اسم الملف (مثال: ملخص الدرس PDF)"
                            disabled={isUploadingAttachment || isSavingAttachment}
                            value={attachmentName}
                            onChange={(e) => setAttachmentName(e.target.value)}
                            style={{ width: '100%', padding: '0.8rem', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', borderRadius: '8px', marginBottom: '1rem' }}
                          />
                          
                          <div style={{ marginBottom: '1rem' }}>
                            <input
                              type="file"
                              accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.txt,.csv,.zip,.rar,image/*,audio/*"
                              aria-label="اختر الملف الأصلي للمرفق"
                              disabled={isUploadingAttachment || isSavingAttachment}
                              onChange={handleFileUpload}
                              style={{ width: '100%' }}
                            />
                            <p style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.65)' }}>ارفع الملف الأصلي من جهازك؛ يُحفظ دون تحويله إلى صورة، بحد أقصى 20MiB.</p>
                            {isUploadingAttachment && <p role="status">جاري رفع الملف الأصلي...</p>}
                            {attachmentUrl && <p style={{ color: 'var(--success)', fontSize: '0.85rem' }}>تم رفع الملف الأصلي: {attachmentOriginalName}</p>}
                            {attachmentError && <p role="alert" style={{ color: '#f87171', fontSize: '0.85rem' }}>{attachmentError}</p>}
                          </div>

                          <div style={{ display: 'flex', gap: '0.5rem' }}>
                            <button disabled={isUploadingAttachment || isSavingAttachment || !attachmentUrl} onClick={() => handleAddAttachment(lesson.id)} style={{ padding: '0.6rem 1.2rem', background: 'var(--primary)', color: '#000', borderRadius: '8px', fontWeight: 'bold', border: 'none', cursor: 'pointer', fontSize: '0.9rem' }}>حفظ المرفق</button>
                            <button disabled={isUploadingAttachment || isSavingAttachment} onClick={() => { setAddingAttachmentTo(null); setAttachmentUrl(''); setAttachmentOriginalName(''); setAttachmentName(''); setAttachmentError(''); }} style={{ padding: '0.6rem 1.2rem', background: 'transparent', color: '#fff', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.2)', cursor: 'pointer', fontSize: '0.9rem' }}>إلغاء</button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Add Lesson Form */}
              {addingLessonTo === chapter.id ? (
                <div style={{ background: 'rgba(0,0,0,0.5)', padding: '1rem', borderRadius: '8px', border: '1px dashed rgba(255,255,255,0.2)' }}>
                  <input 
                    type="text" 
                    placeholder="عنوان الدرس (مثال: مقدمة في React)"
                    disabled={isUploading || lessonUpload.locked}
                    value={newLessonTitle}
                    onChange={(e) => setNewLessonTitle(e.target.value)}
                    style={{ width: '100%', padding: '0.8rem', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', borderRadius: '8px', marginBottom: '0.8rem' }}
                  />
                  <div style={{ marginBottom: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <input 
                      type="checkbox" 
                      id={`isLive-${chapter.id}`}
                      disabled={isUploading || lessonUpload.locked}
                      checked={isLiveLesson}
                      onChange={(e) => setIsLiveLesson(e.target.checked)}
                      style={{ cursor: 'pointer' }}
                    />
                    <label htmlFor={`isLive-${chapter.id}`} style={{ cursor: 'pointer', color: 'rgba(255,255,255,0.8)' }}>هل هذا الدرس بث مباشر (Live)؟</label>
                  </div>

                  {!isLiveLesson ? (
                    <div style={{ marginBottom: '1rem' }}>
                      <label style={{ display: 'block', marginBottom: '0.5rem', color: 'rgba(255,255,255,0.7)', fontSize: '0.9rem' }}>ملف الدرس (فيديو، صوت، صورة، مستند)</label>
                      <input 
                        type="file" 
                        accept="video/*,audio/*,image/*,.pdf,.doc,.docx,.zip,.rar"
                        disabled={isUploading || lessonUpload.locked}
                        onChange={(e) => {
                          if (e.target.files && e.target.files.length > 0) {
                            setNewLessonVideoFile(e.target.files[0]);
                          }
                        }}
                        style={{ width: '100%', padding: '0.8rem', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', borderRadius: '8px' }}
                      />
                      <BunnyUploadStatus state={lessonUpload.state} progress={lessonUpload.progress} onPause={lessonUpload.pause} onResume={() => { void handleAddLesson(chapter.id); }} busy={isUploading} />
                      {!lessonUpload.state && uploadProgress !== null && (
                        <div style={{ marginTop: '0.5rem', width: '100%', background: 'rgba(255,255,255,0.1)', borderRadius: '4px', overflow: 'hidden' }}>
                          <div style={{ height: '8px', width: `${uploadProgress}%`, background: 'var(--success)', transition: 'width 0.3s' }}></div>
                          <div style={{ fontSize: '0.8rem', marginTop: '0.2rem', color: 'var(--success)', textAlign: 'right' }}>{uploadProgress}%</div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div style={{ marginBottom: '1rem' }}>
                      <label style={{ display: 'block', marginBottom: '0.5rem', color: 'rgba(255,255,255,0.7)', fontSize: '0.9rem' }}>تاريخ ووقت الجلسة (اختياري)</label>
                      <input 
                        type="datetime-local" 
                        value={liveLessonStartTime}
                        onChange={(e) => setLiveLessonStartTime(e.target.value)}
                        style={{ width: '100%', padding: '0.8rem', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', borderRadius: '8px' }}
                      />
                    </div>
                  )}
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button disabled={isUploading} onClick={() => handleAddLesson(chapter.id)} style={{ padding: '0.5rem 1rem', background: 'var(--primary)', color: '#000', borderRadius: '4px', fontWeight: 'bold', border: 'none', cursor: isUploading ? 'not-allowed' : 'pointer', opacity: isUploading ? 0.7 : 1 }}>
                      {isUploading ? 'جاري الرفع والحفظ...' : 'حفظ الدرس'}
                    </button>
                    <button disabled={isUploading || lessonUpload.locked} onClick={() => setAddingLessonTo(null)} style={{ padding: '0.5rem 1rem', background: 'transparent', color: '#fff', borderRadius: '4px', border: '1px solid rgba(255,255,255,0.2)', cursor: isUploading ? 'not-allowed' : 'pointer', opacity: isUploading ? 0.7 : 1 }}>إلغاء</button>
                  </div>
                </div>
              ) : (
                <div style={{ display: 'flex', gap: '1rem' }}>
                  <button 
                    disabled={isUploading || lessonUpload.locked}
                    onClick={() => setAddingLessonTo(chapter.id)}
                    style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'transparent', color: 'var(--primary)', border: 'none', cursor: 'pointer', fontWeight: 'bold' }}
                  >
                    <PlusCircle size={16} /> إضافة درس جديد
                  </button>

                  <button 
                    onClick={() => setAddingQuizTo(chapter.id)}
                    style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'transparent', color: 'var(--warning)', border: 'none', cursor: 'pointer', fontWeight: 'bold' }}
                  >
                    <CheckSquare size={16} /> إضافة اختبار (Quiz)
                  </button>
                </div>
              )}

              {/* Add Quiz Form */}
              {addingQuizTo === chapter.id && (
                <div style={{ background: 'rgba(203, 161, 83, 0.1)', padding: '1rem', borderRadius: '8px', border: '1px dashed rgba(203, 161, 83, 0.5)', marginTop: '1rem' }}>
                   <input 
                    type="text" 
                    placeholder="عنوان الاختبار (مثال: اختبار الفصل الأول)"
                    value={quizTitle}
                    onChange={(e) => setQuizTitle(e.target.value)}
                    style={{ width: '100%', padding: '0.8rem', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', borderRadius: '8px', marginBottom: '0.8rem' }}
                  />
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button onClick={() => handleAddQuiz(chapter.id)} style={{ padding: '0.5rem 1rem', background: 'var(--warning)', color: '#000', borderRadius: '4px', fontWeight: 'bold', border: 'none', cursor: 'pointer' }}>إنشاء الاختبار</button>
                    <button onClick={() => setAddingQuizTo(null)} style={{ padding: '0.5rem 1rem', background: 'transparent', color: '#fff', borderRadius: '4px', border: '1px solid rgba(255,255,255,0.2)', cursor: 'pointer' }}>إلغاء</button>
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Add Chapter Form */}
      {isAddingChapter ? (
        <div style={{ background: '#111', padding: '1.5rem', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
           <input 
              type="text" 
              placeholder="عنوان الفصل (مثال: الأساسيات)"
              value={newChapterTitle}
              onChange={(e) => setNewChapterTitle(e.target.value)}
              style={{ width: '100%', padding: '1rem', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', borderRadius: '8px', marginBottom: '1rem' }}
            />
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button onClick={handleAddChapter} style={{ padding: '0.8rem 1.5rem', background: 'var(--primary)', color: '#000', borderRadius: '8px', fontWeight: 'bold', border: 'none', cursor: 'pointer' }}>حفظ الفصل</button>
              <button onClick={() => setIsAddingChapter(false)} style={{ padding: '0.8rem 1.5rem', background: 'transparent', color: '#fff', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.2)', cursor: 'pointer' }}>إلغاء</button>
            </div>
        </div>
      ) : (
        <button 
          onClick={() => setIsAddingChapter(true)}
          style={{ width: '100%', padding: '1.5rem', background: 'rgba(255,255,255,0.02)', border: '2px dashed rgba(255,255,255,0.1)', borderRadius: '12px', color: '#fff', fontSize: '1.1rem', cursor: 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem' }}
        >
          <PlusCircle size={20} /> أضف فصلاً جديداً
        </button>
      )}

    </div>
  );
}
