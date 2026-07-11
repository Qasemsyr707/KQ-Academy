'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { PlusCircle, Video, GripVertical, Trash2, Edit2, ArrowRight, Paperclip, CheckSquare, Radio } from 'lucide-react';
import Link from 'next/link';

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

  // Attachment State
  const [addingAttachmentTo, setAddingAttachmentTo] = useState<string | null>(null);
  const [attachmentName, setAttachmentName] = useState('');
  const [attachmentUrl, setAttachmentUrl] = useState('');

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
    if (!newLessonTitle || (!newLessonVideoFile && !isLiveLesson)) {
      alert('يرجى إدخال عنوان الدرس واختيار ملف الفيديو');
      return;
    }

    setIsUploading(true);
    let finalVideoUrl = null;

    try {
      if (!isLiveLesson && newLessonVideoFile) {
        // 1. Create Video Object in Bunny
        setUploadProgress(0);
        const createRes = await fetch('/api/bunny/create-video', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ title: newLessonTitle })
        });

        if (!createRes.ok) {
          throw new Error('فشل في تهيئة الفيديو على الخادم');
        }

        const { videoId, libraryId } = await createRes.json();

        // 2. Upload using Tus
        await new Promise<void>((resolve, reject) => {
          // Dynamic import of tus-js-client to avoid SSR issues if any
          import('tus-js-client').then((tus) => {
            const upload = new tus.Upload(newLessonVideoFile, {
              endpoint: 'https://video.bunnycdn.com/tusupload',
              retryDelays: [0, 3000, 5000, 10000, 20000],
              headers: {
                AuthorizationSignature: videoId,
                AuthorizationExpire: (Math.floor(Date.now() / 1000) + 3600).toString(), // 1 hour
                VideoId: videoId,
                LibraryId: libraryId,
              },
              metadata: {
                filename: newLessonVideoFile.name,
                filetype: newLessonVideoFile.type
              },
              onError: (error) => {
                reject(error);
              },
              onProgress: (bytesUploaded, bytesTotal) => {
                const percentage = ((bytesUploaded / bytesTotal) * 100).toFixed(0);
                setUploadProgress(Number(percentage));
              },
              onSuccess: () => {
                finalVideoUrl = `https://iframe.mediadelivery.net/embed/${libraryId}/${videoId}`;
                resolve();
              }
            });

            upload.start();
          }).catch(reject);
        });
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
    } catch (e: any) {
      console.error(e);
      alert(e.message || 'حدث خطأ أثناء رفع الفيديو');
    } finally {
      setIsUploading(false);
      setUploadProgress(null);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    // Set file name automatically if not set
    if (!attachmentName) {
      setAttachmentName(file.name);
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setAttachmentUrl(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleAddAttachment = async (lessonId: string) => {
    if (!attachmentName || !attachmentUrl) {
      alert('الرجاء كتابة اسم المرفق واختيار الملف أو وضع رابطه');
      return;
    }
    try {
      const res = await fetch('/api/attachments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: attachmentName, url: attachmentUrl, lessonId })
      });
      if (res.ok) {
        setAttachmentName('');
        setAttachmentUrl('');
        setAddingAttachmentTo(null);
        alert('تم إضافة المرفق بنجاح');
        router.refresh();
      }
    } catch (e) {
      alert('Error adding attachment');
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

  return (
    <div style={{ padding: '2rem', maxWidth: '800px', margin: '0 auto', color: '#fff' }}>
      <Link href="/instructor/courses" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', color: 'rgba(255,255,255,0.6)', textDecoration: 'none', marginBottom: '2rem' }}>
        <ArrowRight size={20} /> العودة للكورسات
      </Link>

      <h1 style={{ fontSize: '2rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>منهج الكورس: {course.title}</h1>
      <p style={{ opacity: 0.7, marginBottom: '2rem' }}>قم بتقسيم كورس الخاص بك إلى فصول، وأضف الدروس والمرفقات والاختبارات.</p>

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
                           <button onClick={() => setAddingAttachmentTo(lesson.id)} style={{ background: 'none', border: 'none', color: 'var(--primary)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.8rem' }}>
                             <Paperclip size={14} /> أضف مرفق
                           </button>
                           <button style={{ background: 'none', border: 'none', color: 'var(--danger, #ef4444)', cursor: 'pointer' }}><Trash2 size={16} /></button>
                        </div>
                      </div>

                      {/* Add Attachment Form inside Lesson */}
                      {addingAttachmentTo === lesson.id && (
                        <div style={{ marginTop: '1rem', background: 'rgba(0,0,0,0.3)', padding: '1.5rem', borderRadius: '12px', border: '1px solid rgba(203,161,83,0.2)' }}>
                           <h4 style={{ fontSize: '0.9rem', color: '#cba153', marginBottom: '1rem' }}>رفع ملف مرفق (PDF, صور, أو ملفات مضغوطة)</h4>
                           <input 
                            type="text" 
                            placeholder="اسم الملف (مثال: ملخص الدرس PDF)"
                            value={attachmentName}
                            onChange={(e) => setAttachmentName(e.target.value)}
                            style={{ width: '100%', padding: '0.8rem', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', borderRadius: '8px', marginBottom: '1rem' }}
                          />
                          
                          <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem' }}>
                            <div style={{ flex: 1, position: 'relative', overflow: 'hidden', background: 'rgba(203,161,83,0.1)', border: '1px dashed #cba153', borderRadius: '8px', padding: '1rem', textAlign: 'center', cursor: 'pointer' }}>
                              <span style={{ fontSize: '0.85rem', color: '#cba153' }}>{attachmentUrl && attachmentUrl.startsWith('data:') ? 'تم اختيار الملف بنجاح ✅' : '📥 اضغط هنا لرفع ملف من جهازك'}</span>
                              <input 
                                type="file" 
                                accept=".pdf,.png,.jpg,.jpeg,.zip,.rar,.doc,.docx"
                                onChange={handleFileUpload}
                                style={{ position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, opacity: 0, cursor: 'pointer', width: '100%' }}
                              />
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', color: 'rgba(255,255,255,0.5)', fontSize: '0.8rem' }}>أو</div>
                            <input 
                              type="url" 
                              placeholder="رابط خارجي للملف (إن وُجد)"
                              value={attachmentUrl && !attachmentUrl.startsWith('data:') ? attachmentUrl : ''}
                              onChange={(e) => {
                                if(!attachmentUrl.startsWith('data:')) {
                                  setAttachmentUrl(e.target.value);
                                }
                              }}
                              style={{ flex: 1, padding: '0.8rem', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', borderRadius: '8px' }}
                            />
                          </div>

                          <div style={{ display: 'flex', gap: '0.5rem' }}>
                            <button onClick={() => handleAddAttachment(lesson.id)} style={{ padding: '0.6rem 1.2rem', background: 'var(--primary)', color: '#000', borderRadius: '8px', fontWeight: 'bold', border: 'none', cursor: 'pointer', fontSize: '0.9rem' }}>حفظ المرفق</button>
                            <button onClick={() => { setAddingAttachmentTo(null); setAttachmentUrl(''); setAttachmentName(''); }} style={{ padding: '0.6rem 1.2rem', background: 'transparent', color: '#fff', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.2)', cursor: 'pointer', fontSize: '0.9rem' }}>إلغاء</button>
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
                    value={newLessonTitle}
                    onChange={(e) => setNewLessonTitle(e.target.value)}
                    style={{ width: '100%', padding: '0.8rem', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', borderRadius: '8px', marginBottom: '0.8rem' }}
                  />
                  <div style={{ marginBottom: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <input 
                      type="checkbox" 
                      id={`isLive-${chapter.id}`}
                      checked={isLiveLesson}
                      onChange={(e) => setIsLiveLesson(e.target.checked)}
                      style={{ cursor: 'pointer' }}
                    />
                    <label htmlFor={`isLive-${chapter.id}`} style={{ cursor: 'pointer', color: 'rgba(255,255,255,0.8)' }}>هل هذا الدرس بث مباشر (Live)؟</label>
                  </div>

                  {!isLiveLesson ? (
                    <div style={{ marginBottom: '1rem' }}>
                      <label style={{ display: 'block', marginBottom: '0.5rem', color: 'rgba(255,255,255,0.7)', fontSize: '0.9rem' }}>ملف الفيديو للدرس (MP4)</label>
                      <input 
                        type="file" 
                        accept="video/mp4,video/x-m4v,video/x-matroska,video/avi,video/quicktime,video/*"
                        onChange={(e) => {
                          if (e.target.files && e.target.files.length > 0) {
                            setNewLessonVideoFile(e.target.files[0]);
                          }
                        }}
                        style={{ width: '100%', padding: '0.8rem', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', borderRadius: '8px' }}
                      />
                      {uploadProgress !== null && (
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
                    <button disabled={isUploading} onClick={() => setAddingLessonTo(null)} style={{ padding: '0.5rem 1rem', background: 'transparent', color: '#fff', borderRadius: '4px', border: '1px solid rgba(255,255,255,0.2)', cursor: isUploading ? 'not-allowed' : 'pointer', opacity: isUploading ? 0.7 : 1 }}>إلغاء</button>
                  </div>
                </div>
              ) : (
                <div style={{ display: 'flex', gap: '1rem' }}>
                  <button 
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
