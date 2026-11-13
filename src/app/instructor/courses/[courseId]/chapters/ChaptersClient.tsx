'use client';

import React, { useRef, useState } from 'react';
import Link from 'next/link';
import { Video, PlusCircle, ArrowRight, Settings, Trash2, X, LockOpen, Lock, Paperclip, Pencil } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { BunnyUploadPaused, useBunnyUpload } from '@/hooks/use-bunny-upload';
import { BunnyUploadStatus } from '@/components/BunnyUploadStatus';
import { AttachmentLinks } from '@/components/AttachmentLinks';
import { LessonVideoEditor } from '@/components/LessonVideoEditor';

export default function ChaptersClient({ course }: { course: any }) {
  const router = useRouter();
  const [isAdding, setIsAdding] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [isFree, setIsFree] = useState(false);
  const [loading, setLoading] = useState(false);

  // Edit Chapter State
  const [isEditingChapter, setIsEditingChapter] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editIsFree, setEditIsFree] = useState(false);
  const [isEditingLoading, setIsEditingLoading] = useState(false);

  // Intro Video State
  const [isAddingIntroVideo, setIsAddingIntroVideo] = useState(false);
  const [isIntroUploading, setIsIntroUploading] = useState(false);
  const [introVideoFile, setIntroVideoFile] = useState<File | null>(null);
  const introUpload = useBunnyUpload({ courseId: course.id, purpose: 'preview' });
  const introSaving = useRef(false);

  // Video editing is separate from the lesson attachment controls.
  const [lessonEditor, setLessonEditor] = useState<{ chapterId: string; lesson?: { id: string; title: string; videoUrl?: string | null } } | null>(null);
  const [lessonSuccess, setLessonSuccess] = useState('');

  // Attachment State
  const [isAddingAttachment, setIsAddingAttachment] = useState<{ type: 'course' | 'chapter' | 'lesson', id: string } | null>(null);
  const [attachmentName, setAttachmentName] = useState('');
  const [attachmentFile, setAttachmentFile] = useState<File | null>(null);
  const [isUploadingAttachment, setIsUploadingAttachment] = useState(false);
  const [attachmentError, setAttachmentError] = useState('');
  const attachmentSaving = useRef(false);

  // Course Includes State
  const [isEditingIncludes, setIsEditingIncludes] = useState(false);
  const [includes, setIncludes] = useState<string[]>(course.includes || []);
  const [newFeature, setNewFeature] = useState('');
  const [isIncludesLoading, setIsIncludesLoading] = useState(false);

  const addFeature = () => {
    if (newFeature.trim() !== '') {
      setIncludes([...includes, newFeature.trim()]);
      setNewFeature('');
    }
  };

  const removeFeature = (index: number) => {
    setIncludes(includes.filter((_, i) => i !== index));
  };

  const handleUpdateIncludes = async () => {
    setIsIncludesLoading(true);
    try {
      const res = await fetch(`/api/courses/${course.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ includes })
      });
      if (res.ok) {
        setIsEditingIncludes(false);
        router.refresh();
      } else {
        alert('فصل تحديث ميزات الكورس');
      }
    } catch (e) {
      alert('خطأ في الاتصال');
    }
    setIsIncludesLoading(false);
  };

  const handleAddChapter = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    setLoading(true);
    try {
      const res = await fetch('/api/chapters', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: newTitle,
          courseId: course.id,
          isFree: isFree
        })
      });

      if (res.ok) {
        setNewTitle('');
        setIsFree(false);
        setIsAdding(false);
        router.refresh(); // Reload to show new chapter
      } else {
        alert('حدث خطأ أثناء إضافة الفصل');
      }
    } catch (error) {
      console.error(error);
      alert('خطأ في الاتصال بالخادم');
    }
    setLoading(false);
  };

  const handleEditChapter = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editTitle.trim() || !isEditingChapter) return;

    setIsEditingLoading(true);
    try {
      const res = await fetch(`/api/chapters/${isEditingChapter}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: editTitle,
          isFree: editIsFree
        })
      });

      if (res.ok) {
        setIsEditingChapter(null);
        router.refresh();
      } else {
        alert('حدث خطأ أثناء تعديل الفصل');
      }
    } catch (error) {
      console.error(error);
      alert('خطأ في الاتصال بالخادم');
    }
    setIsEditingLoading(false);
  };

  const handleDeleteChapter = async (chapterId: string) => {
    if (!confirm('هل أنت متأكد من حذف هذا الفصل بجميع دروسه؟ (هذا الإجراء لا يمكن التراجع عنه)')) return;

    try {
      const res = await fetch(`/api/chapters/${chapterId}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        router.refresh();
      } else {
        alert('حدث خطأ أثناء حذف الفصل');
      }
    } catch (error) {
      console.error(error);
      alert('خطأ في الاتصال بالخادم');
    }
  };

  const handleAddAttachment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (attachmentSaving.current || !attachmentName.trim() || !attachmentFile || !isAddingAttachment) return;

    attachmentSaving.current = true;
    setAttachmentError('');
    setIsUploadingAttachment(true);
    try {
      const formData = new FormData();
      formData.append('file', attachmentFile);
      formData.append('type', 'document');
      formData.append('courseId', course.id);
      
      const uploadRes = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });
      
      const uploaded = await uploadRes.json();
      if (!uploadRes.ok) throw new Error(uploaded.error || 'فشل رفع الملف الأصلي');
      const { url } = uploaded;
      if (typeof url !== 'string' || !url.startsWith('/api/files/')) throw new Error('لم يتم حفظ رابط صالح للملف الأصلي');

      const payload: any = { name: attachmentName, url };
      if (isAddingAttachment.type === 'course') payload.courseId = isAddingAttachment.id;
      if (isAddingAttachment.type === 'chapter') payload.chapterId = isAddingAttachment.id;
      if (isAddingAttachment.type === 'lesson') payload.lessonId = isAddingAttachment.id;

      const res = await fetch('/api/attachments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        setAttachmentName('');
        setAttachmentFile(null);
        setIsAddingAttachment(null);
        router.refresh();
      } else {
        const data = await res.json();
        throw new Error(data.error || 'حدث خطأ أثناء حفظ المرفق');
      }
    } catch (error) {
      setAttachmentError(error instanceof Error ? error.message : 'خطأ أثناء رفع المرفق');
    } finally {
      attachmentSaving.current = false;
      setIsUploadingAttachment(false);
    }
  };

  const handleDeleteAttachment = async (id: string) => {
    if (!confirm('هل أنت متأكد من حذف هذا المرفق؟')) return;
    try {
      const res = await fetch(`/api/attachments/${id}`, { method: 'DELETE' });
      if (res.ok) router.refresh();
      else alert('حدث خطأ أثناء الحذف');
    } catch (error) {
      console.error(error);
      alert('خطأ في الاتصال');
    }
  };

  const renderAttachments = (attachments: any[]) => {
    if (!attachments || attachments.length === 0) return null;
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '0.5rem', padding: '0.8rem', background: 'rgba(255,255,255,0.02)', borderRadius: '8px' }}>
        {attachments.map((att: any) => (
          <div key={att.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.9rem' }}>
            <AttachmentLinks attachment={att} />
            <button onClick={() => handleDeleteAttachment(att.id)} style={{ color: '#ef4444', background: 'transparent', border: 'none', cursor: 'pointer', padding: '0.2rem' }}>
              <Trash2 size={16} />
            </button>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div style={{ padding: '2rem 5%', minHeight: '100vh', background: 'var(--background)', color: '#fff' }}>
      <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
        
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
          <div>
            <Link href="/instructor/courses" style={{ color: 'rgba(255,255,255,0.5)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
              <ArrowRight size={16} /> العودة للكورسات
            </Link>
            <h1 style={{ fontSize: '2rem', fontWeight: 'bold' }}>إدارة محتوى الكورس</h1>
            <p style={{ color: 'var(--primary)', fontWeight: 'bold' }}>{course.title}</p>
          </div>
          <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
            <button onClick={() => setIsEditingIncludes(true)} className="btn" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(255,255,255,0.05)' }}>
              <Settings size={20} /> ميزات الكورس
            </button>
            <button onClick={() => setIsAddingAttachment({ type: 'course', id: course.id })} className="btn" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(255,255,255,0.05)' }}>
              <Paperclip size={20} /> مرفقات عامة
            </button>
            <button onClick={() => setIsAddingIntroVideo(true)} className="btn" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', borderColor: 'var(--primary)', color: 'var(--primary)' }}>
              <Video size={20} /> فيديو مقدمة
            </button>
            <button onClick={() => setIsAdding(true)} className="btn btn-solid" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <PlusCircle size={20} /> فصل جديد
            </button>
          </div>
        </div>
        
        {lessonSuccess && <p role="status" style={{ padding: '1rem', background: 'rgba(203,161,83,0.08)', border: '1px solid rgba(203,161,83,0.25)', borderRadius: '10px', color: 'var(--primary)', marginBottom: '1rem' }}>{lessonSuccess}</p>}
        {renderAttachments(course.attachments)}

        {course.previewVideoUrl && (
          <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--primary)', borderRadius: '16px', padding: '1rem', marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <div style={{ background: 'rgba(203,161,83,0.1)', padding: '0.8rem', borderRadius: '50%' }}>
                <Video size={24} color="var(--primary)" />
              </div>
              <div>
                <h3 style={{ fontWeight: 'bold', margin: 0 }}>فيديو المقدمة (معاينة الكورس)</h3>
                <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.9rem', margin: 0 }}>تم رفع فيديو المقدمة بنجاح، وهو جاهز للعرض للطلاب.</p>
              </div>
            </div>
            <button onClick={() => setIsAddingIntroVideo(true)} className="btn" style={{ padding: '0.5rem 1rem', fontSize: '0.9rem' }}>تغيير الفيديو</button>
          </div>
        )}

        {course.chapters.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '4rem', background: 'rgba(255,255,255,0.02)', borderRadius: '16px', border: '1px dashed rgba(255,255,255,0.1)' }}>
            <Video size={48} color="rgba(255,255,255,0.2)" style={{ margin: '0 auto 1rem auto' }} />
            <h3 style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>لا يوجد فصول حتى الآن</h3>
            <p style={{ color: 'rgba(255,255,255,0.5)', marginBottom: '1.5rem' }}>ابدأ بإضافة الفصل الأول لتتمكن من إضافة الدروس إليه.</p>
            <button onClick={() => setIsAdding(true)} className="btn btn-solid">إضافة الفصل الأول</button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            {course.chapters.map((chapter: any, index: number) => (
              <div key={chapter.id} className="glass-card" style={{ padding: '1.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '1rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <h3 style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>{index + 1}. {chapter.title}</h3>
                    {chapter.isFree ? (
                      <span style={{ fontSize: '0.8rem', background: 'rgba(34,197,94,0.1)', color: '#22c55e', padding: '0.2rem 0.6rem', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                        <LockOpen size={14} /> مجاني للعامة
                      </span>
                    ) : (
                      <span style={{ fontSize: '0.8rem', background: 'rgba(234,179,8,0.1)', color: '#eab308', padding: '0.2rem 0.6rem', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                        <Lock size={14} /> مدفوع (للمشتركين)
                      </span>
                    )}
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button onClick={() => setIsAddingAttachment({ type: 'chapter', id: chapter.id })} className="btn" style={{ padding: '0.4rem', color: '#10b981' }} title="إضافة مرفق للفصل">
                      <Paperclip size={18} />
                    </button>
                    <button 
                      onClick={() => {
                        setEditTitle(chapter.title);
                        setEditIsFree(chapter.isFree);
                        setIsEditingChapter(chapter.id);
                      }} 
                      className="btn" 
                      style={{ padding: '0.4rem', color: '#3b82f6' }}
                    >
                      <Settings size={18} />
                    </button>
                    <button 
                      onClick={() => handleDeleteChapter(chapter.id)} 
                      className="btn" 
                      style={{ padding: '0.4rem', color: '#ef4444' }}
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>
                
                {renderAttachments(chapter.attachments)}
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', paddingRight: '1rem', borderRight: '2px solid rgba(255,255,255,0.1)' }}>
                  {chapter.lessons.length === 0 ? (
                    <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.9rem' }}>لا يوجد دروس في هذا الفصل.</p>
                  ) : (
                    chapter.lessons.map((lesson: any, idx: number) => (
                      <div key={lesson.id} style={{ display: 'flex', flexDirection: 'column', background: 'rgba(0,0,0,0.3)', padding: '0.8rem 1rem', borderRadius: '8px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <Video size={16} color="var(--primary)" />
                            <span>الدرس {idx + 1}: {lesson.title}</span>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            {!lesson.isLive && (
                              <button onClick={() => { setLessonSuccess(''); setLessonEditor({ chapterId: chapter.id, lesson }); }} className="btn" style={{ padding: '0.2rem', color: 'var(--primary)' }} title="تعديل الدرس ومصدر الفيديو" aria-label={`تعديل الدرس: ${lesson.title}`}>
                                <Pencil size={16} />
                              </button>
                            )}
                            <button onClick={() => setIsAddingAttachment({ type: 'lesson', id: lesson.id })} className="btn" style={{ padding: '0.2rem', color: '#10b981' }} title="إضافة مرفق للدرس">
                              <Paperclip size={16} />
                            </button>
                            {lesson.isLive && (
                              <Link 
                                href={`/courses/${course.id}/learn?lessonId=${lesson.id}`} 
                                target="_blank"
                                style={{ fontSize: '0.8rem', background: 'rgba(239, 68, 68, 0.2)', color: '#ef4444', padding: '0.2rem 0.5rem', borderRadius: '12px', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.2rem', fontWeight: 'bold' }}
                                title="الدخول للقاعة"
                              >
                                <Video size={12} /> دخول القاعة
                              </Link>
                            )}
                            <span style={{ fontSize: '0.8rem', background: lesson.isLive ? 'rgba(244,63,94,0.1)' : 'rgba(255,255,255,0.1)', color: lesson.isLive ? '#f43f5e' : '#fff', padding: '0.2rem 0.5rem', borderRadius: '12px' }}>
                              {lesson.isLive ? 'بث مباشر' : 'فيديو مسجل'}
                            </span>
                          </div>
                        </div>
                        {renderAttachments(lesson.attachments)}
                      </div>
                    ))
                  )}
                  <button onClick={() => { setLessonSuccess(''); setLessonEditor({ chapterId: chapter.id }); }} style={{ marginTop: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--primary)', background: 'transparent', border: '1px dashed var(--primary)', padding: '0.5rem', borderRadius: '8px', cursor: 'pointer', alignSelf: 'flex-start' }}>
                    <PlusCircle size={16} /> إضافة درس جديد
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Add Chapter Modal */}
        {isAdding && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
            <div className="glass-card" style={{ width: '100%', maxWidth: '500px', padding: '2rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>إضافة فصل جديد</h2>
                <button onClick={() => setIsAdding(false)} className="btn" style={{ padding: '0.5rem' }}><X size={20} /></button>
              </div>
              
              <form onSubmit={handleAddChapter} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem' }}>اسم الفصل</label>
                  <input
                    type="text"
                    required
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    className="input-field"
                    placeholder="مثال: مقدمة في التسويق"
                  />
                </div>
                
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', background: 'rgba(255,255,255,0.02)', padding: '1rem', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)' }}>
                  <input
                    type="checkbox"
                    id="isFree"
                    checked={isFree}
                    onChange={(e) => setIsFree(e.target.checked)}
                    style={{ width: '20px', height: '20px', cursor: 'pointer' }}
                  />
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <label htmlFor="isFree" style={{ fontWeight: 'bold', cursor: 'pointer' }}>فصل مجاني (متاح للجميع)</label>
                    <span style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.5)' }}>إذا قمت بتفعيل هذا الخيار، سيتمكن أي زائر من مشاهدة الفيديوهات داخل هذا الفصل بدون الحاجة لدفع قيمة الكورس (مثالي كعينة ترويجية).</span>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                  <button type="submit" disabled={loading} className="btn btn-solid" style={{ flex: 1 }}>
                    {loading ? 'جاري الإضافة...' : 'حفظ الفصل'}
                  </button>
                  <button type="button" onClick={() => setIsAdding(false)} className="btn" style={{ flex: 1, background: 'rgba(255,255,255,0.1)' }}>
                    إلغاء
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Edit Chapter Modal */}
        {isEditingChapter && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
            <div className="glass-card" style={{ width: '100%', maxWidth: '500px', padding: '2rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>تعديل الفصل</h2>
                <button onClick={() => setIsEditingChapter(null)} className="btn" style={{ padding: '0.5rem' }}><X size={20} /></button>
              </div>
              
              <form onSubmit={handleEditChapter} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem' }}>اسم الفصل</label>
                  <input
                    type="text"
                    required
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    className="input-field"
                    placeholder="مثال: مقدمة في التسويق"
                  />
                </div>
                
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', background: 'rgba(255,255,255,0.02)', padding: '1rem', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)' }}>
                  <input
                    type="checkbox"
                    id="editIsFree"
                    checked={editIsFree}
                    onChange={(e) => setEditIsFree(e.target.checked)}
                    style={{ width: '20px', height: '20px', cursor: 'pointer' }}
                  />
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <label htmlFor="editIsFree" style={{ fontWeight: 'bold', cursor: 'pointer' }}>فصل مجاني (متاح للجميع)</label>
                    <span style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.5)' }}>إذا قمت بتفعيل هذا الخيار، سيتمكن أي زائر من مشاهدة الفيديوهات داخل هذا الفصل.</span>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                  <button type="submit" disabled={isEditingLoading} className="btn btn-solid" style={{ flex: 1 }}>
                    {isEditingLoading ? 'جاري الحفظ...' : 'حفظ التعديلات'}
                  </button>
                  <button type="button" onClick={() => setIsEditingChapter(null)} className="btn" style={{ flex: 1, background: 'rgba(255,255,255,0.1)' }}>
                    إلغاء
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {lessonEditor && (
          <LessonVideoEditor
            courseId={course.id}
            chapterId={lessonEditor.chapterId}
            lesson={lessonEditor.lesson}
            onClose={() => setLessonEditor(null)}
            onSaved={message => { setLessonSuccess(message); setLessonEditor(null); router.refresh(); }}
          />
        )}

        {/* Add Intro Video Modal */}
        {isAddingIntroVideo && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
            <div className="glass-card" style={{ width: '100%', maxWidth: '500px', padding: '2rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>رفع فيديو مقدمة الكورس</h2>
                <button disabled={isIntroUploading || introUpload.locked} onClick={() => setIsAddingIntroVideo(false)} className="btn" style={{ padding: '0.5rem' }}><X size={20} /></button>
              </div>
              
              <form onSubmit={async (e) => {
                e.preventDefault();
                if (introSaving.current || !introVideoFile) return;
                introSaving.current = true;
                setIsIntroUploading(true);
                try {
                  const uploaded = await introUpload.upload(introVideoFile, 'Intro: ' + course.title);
                  const finalVideoUrl = uploaded.embedUrl;
                  
                  // Update Course in DB
                  const res = await fetch(`/api/courses/${course.id}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ previewVideoUrl: finalVideoUrl })
                  });

                  if (res.ok) {
                    introUpload.complete();
                    setIsAddingIntroVideo(false);
                    setIntroVideoFile(null);
                    router.refresh();
                  } else {
                    alert('فشل حفظ الفيديو');
                  }
                } catch(err) {
                  if (!(err instanceof BunnyUploadPaused)) alert(err instanceof Error ? err.message : 'خطأ أثناء رفع الفيديو');
                } finally {
                  introSaving.current = false;
                  setIsIntroUploading(false);
                }
              }} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem' }}>ملف فيديو المقدمة</label>
                  <input
                    disabled={isIntroUploading || introUpload.locked}
                    type="file"
                    accept="video/*"
                    required
                    onChange={(e) => setIntroVideoFile(e.target.files ? e.target.files[0] : null)}
                    className="input-field"
                    style={{ padding: '0.8rem' }}
                  />
                  <BunnyUploadStatus state={introUpload.state} progress={introUpload.progress} onPause={introUpload.pause} busy={isIntroUploading} />
                  <p style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.5)', marginTop: '0.5rem' }}>
                    هذا الفيديو سيظهر لجميع الزوار في صفحة تفاصيل الكورس (مجاناً) لتشجيعهم على الاشتراك.
                  </p>
                </div>
                
                <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                  <button type="submit" disabled={isIntroUploading} className="btn btn-solid" style={{ flex: 1 }}>
                    {isIntroUploading ? 'جاري الرفع...' : 'رفع وحفظ'}
                  </button>
                  <button type="button" disabled={isIntroUploading || introUpload.locked} onClick={() => setIsAddingIntroVideo(false)} className="btn" style={{ flex: 1, background: 'rgba(255,255,255,0.1)' }}>
                    إلغاء
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Add Attachment Modal */}
        {isAddingAttachment && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
            <div className="glass-card" style={{ width: '100%', maxWidth: '500px', padding: '2rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>إضافة مرفق جديد</h2>
                <button disabled={isUploadingAttachment} onClick={() => setIsAddingAttachment(null)} className="btn" style={{ padding: '0.5rem' }}><X size={20} /></button>
              </div>
              
              <form onSubmit={handleAddAttachment} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem' }}>اسم المرفق (مثال: ملخص الدرس PDF)</label>
                  <input
                    type="text"
                    required
                    disabled={isUploadingAttachment}
                    value={attachmentName}
                    onChange={(e) => setAttachmentName(e.target.value)}
                    className="input-field"
                    placeholder="اسم الملف"
                  />
                </div>

                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem' }}>اختر الملف</label>
                  <input
                    type="file"
                    required
                    accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.txt,.csv,.zip,.rar,image/*,audio/*"
                    disabled={isUploadingAttachment}
                    onChange={(e) => {
                      const file = e.target.files?.[0] ?? null;
                      setAttachmentFile(file);
                      setAttachmentError('');
                      if (file && !attachmentName.trim()) setAttachmentName(file.name);
                    }}
                    className="input-field"
                    style={{ padding: '0.8rem' }}
                  />
                  <p style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.65)', marginTop: '0.5rem' }}>اختر الملف الأصلي من جهازك؛ سيُحفظ كما هو مع صفحاته، بحد أقصى 20MiB.</p>
                </div>
                {attachmentError && <p role="alert" style={{ color: '#f87171' }}>{attachmentError}</p>}
                
                <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                  <button type="submit" disabled={isUploadingAttachment} className="btn btn-solid" style={{ flex: 1 }}>
                    {isUploadingAttachment ? 'جاري الرفع...' : 'رفع المرفق'}
                  </button>
                  <button type="button" disabled={isUploadingAttachment} onClick={() => setIsAddingAttachment(null)} className="btn" style={{ flex: 1, background: 'rgba(255,255,255,0.1)' }}>
                    إلغاء
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Edit Includes Modal */}
        {isEditingIncludes && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
            <div className="glass-card" style={{ width: '100%', maxWidth: '500px', padding: '2rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>ميزات الكورس (يتضمن الكورس)</h2>
                <button onClick={() => setIsEditingIncludes(false)} className="btn" style={{ padding: '0.5rem' }}><X size={20} /></button>
              </div>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                <div>
                  <p style={{ fontSize: '0.9rem', color: 'rgba(255,255,255,0.5)', marginBottom: '1rem' }}>أضف الميزات التي سيحصل عليها الطالب عند الاشتراك. (مثال: متابعة شخصية، شهادة معتمدة).</p>
                  
                  <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
                    <input 
                      type="text" 
                      value={newFeature} 
                      onChange={e => setNewFeature(e.target.value)} 
                      onKeyDown={(e) => { if(e.key === 'Enter') { e.preventDefault(); addFeature(); } }}
                      placeholder="أدخل ميزة جديدة..." 
                      style={{ flex: 1, padding: '0.8rem', borderRadius: '8px', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff' }} 
                    />
                    <button type="button" onClick={addFeature} className="btn btn-solid" style={{ padding: '0 1.5rem', borderRadius: '8px' }}>إضافة</button>
                  </div>

                  {includes.length > 0 ? (
                    <ul style={{ listStyle: 'none', padding: 0, display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '200px', overflowY: 'auto' }}>
                      {includes.map((feature, idx) => (
                        <li key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(0,0,0,0.4)', padding: '0.8rem 1rem', borderRadius: '8px' }}>
                          <span style={{ fontSize: '0.9rem' }}>{feature}</span>
                          <button type="button" onClick={() => removeFeature(idx)} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer' }}><Trash2 size={16} /></button>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.9rem', textAlign: 'center', padding: '1rem' }}>لا توجد ميزات مخصصة. سيتم عرض الميزات الافتراضية للطلاب.</p>
                  )}
                </div>
                
                <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                  <button type="button" onClick={handleUpdateIncludes} disabled={isIncludesLoading} className="btn btn-solid" style={{ flex: 1 }}>
                    {isIncludesLoading ? 'جاري الحفظ...' : 'حفظ التعديلات'}
                  </button>
                  <button type="button" onClick={() => setIsEditingIncludes(false)} className="btn" style={{ flex: 1, background: 'rgba(255,255,255,0.1)' }}>
                    إلغاء
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
