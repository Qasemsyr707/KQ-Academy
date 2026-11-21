'use client';

import { useEffect, useState } from 'react';
import { FileText, Loader2, Plus, Trash2, Upload, X } from 'lucide-react';

export type EditorTarget =
  | { mode: 'create'; kind: 'CHAPTER' | 'FINAL'; courseId?: string; chapterId?: string; context: string; type?: 'AUTOMATIC' | 'MANUAL_FILE' }
  | { mode: 'edit'; quizId: string };
export type PickerCourse = { id: string; title: string; chapters: { id: string; title: string }[] };
const FILE_ACCEPT = '.pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.txt';

type Question = { text: string; options: string[]; correctAnswer: number; points: number };
const emptyQuestion = (): Question => ({ text: '', options: ['', ''], correctAnswer: 0, points: 1 });

/**
 * Create or edit a chapter quiz (multiple choice, or a document the student answers with a file) or the
 * course final exam. Automatic quizzes are graded on the server; file answers by the instructor.
 */
export default function QuizEditor({ target, onClose, courses = [], storage }: {
  target: EditorTarget; onClose: (saved: boolean) => void; courses?: PickerCourse[]; storage?: { ready: boolean; message: string | null };
}) {
  const [loading, setLoading] = useState(target.mode === 'edit');
  const [type, setType] = useState<string>(target.mode === 'create' ? target.type ?? 'AUTOMATIC' : 'AUTOMATIC');
  const [courseId, setCourseId] = useState(target.mode === 'create' ? target.courseId ?? courses[0]?.id ?? '' : '');
  const [chapterId, setChapterId] = useState(target.mode === 'create' ? target.chapterId ?? '' : '');
  const [fileUrl, setFileUrl] = useState('');
  const [fileName, setFileName] = useState('');
  const [totalMarks, setTotalMarks] = useState(100);
  const [uploading, setUploading] = useState(false);
  const pick = target.mode === 'create' && target.kind === 'CHAPTER' && !target.chapterId;
  const pickerChapters = courses.find(c => c.id === courseId)?.chapters ?? [];
  const [kind, setKind] = useState(target.mode === 'create' ? target.kind : 'CHAPTER');
  const [title, setTitle] = useState(target.mode === 'create' ? (target.kind === 'FINAL' ? `الاختبار النهائي: ${target.context}` : `اختبار نهاية الفصل: ${target.context}`) : '');
  const [instructions, setInstructions] = useState('');
  const [passingPercent, setPassingPercent] = useState(60);
  const [maxAttempts, setMaxAttempts] = useState('');
  const [isPublished, setIsPublished] = useState(true);
  const [required, setRequired] = useState(false);
  const [questions, setQuestions] = useState<Question[]>([emptyQuestion()]);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (target.mode !== 'edit') return;
    fetch(`/api/quizzes/${target.quizId}/manage`).then(r => r.json().then(d => ({ ok: r.ok, d }))).then(({ ok, d }) => {
      if (!ok) { setError(d.error || 'تعذّر تحميل الاختبار'); return; }
      const q = d.quiz;
      setType(q.type); setKind(q.kind); setTitle(q.title); setInstructions(q.instructions || ''); setPassingPercent(q.passingPercent);
      setMaxAttempts(q.maxAttempts ? String(q.maxAttempts) : ''); setIsPublished(q.isPublished); setRequired(q.requiredForCertificate);
      setCourseId(q.courseId ?? ''); if (q.fileUrl) { setFileUrl(q.fileUrl); setFileName('الملف الحالي'); } if (q.totalMarks) setTotalMarks(q.totalMarks);
      if (q.questions.length) setQuestions(q.questions.map((x: Question) => ({ text: x.text, options: x.options, correctAnswer: x.correctAnswer, points: x.points })));
    }).catch(() => setError('تعذّر الاتصال')).finally(() => setLoading(false));
  }, [target]);

  const update = (i: number, patch: Partial<Question>) => setQuestions(qs => qs.map((q, j) => j === i ? { ...q, ...patch } : q));

  // The document is uploaded as the instructor's private file for this course, then linked on save.
  async function upload(file: File) {
    setError(''); setUploading(true);
    try {
      const form = new FormData();
      form.append('file', file); form.append('type', 'document');
      if (courseId) form.append('courseId', courseId);
      const res = await fetch('/api/upload', { method: 'POST', body: form });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.url) throw new Error(data.error || 'تعذّر رفع الملف');
      setFileUrl(data.url); setFileName(data.filename || file.name);
    } catch (e) { setError(e instanceof Error ? e.message : 'تعذّر رفع الملف'); }
    finally { setUploading(false); }
  }

  async function save() {
    setError('');
    if (target.mode === 'create' && target.kind === 'CHAPTER' && !(target.chapterId || chapterId)) { setError('اختر الكورس والفصل'); return; }
    if (type === 'MANUAL_FILE' && !fileUrl) { setError('ارفع ملف الاختبار أولاً'); return; }
    setBusy(true);
    const settings = { title, instructions, passingPercent, maxAttempts: maxAttempts ? Number(maxAttempts) : null, isPublished, requiredForCertificate: required };
    const body = type === 'AUTOMATIC' ? { ...settings, questions } : { ...settings, fileUrl, totalMarks };
    try {
      const res = target.mode === 'create'
        ? await fetch('/api/quizzes/create', { method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...body, type, kind: target.kind, courseId: target.courseId ?? courseId, chapterId: target.chapterId ?? chapterId }) })
        : await fetch(`/api/quizzes/${target.quizId}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'تعذّر الحفظ');
      onClose(true);
    } catch (e) { setError(e instanceof Error ? e.message : 'تعذّر الاتصال'); }
    finally { setBusy(false); }
  }

  const field = { display: 'grid', gap: 6, marginBottom: '0.9rem' } as const;
  return (
    <div role="dialog" aria-modal="true" aria-label="محرر الاختبار" style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'grid', placeItems: 'center', padding: '1rem', zIndex: 50 }}>
      <div dir="rtl" style={{ background: 'var(--ink-2)', color: '#fff', borderRadius: 18, padding: 'clamp(1rem, 3vw, 1.75rem)', width: 'min(860px, 100%)', maxHeight: '90vh', overflow: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h2>{target.mode === 'create' ? (kind === 'FINAL' ? 'إنشاء الاختبار النهائي' : type === 'MANUAL_FILE' ? 'إنشاء اختبار بملف' : 'إنشاء اختبار نهاية الفصل') : 'تعديل الاختبار'}</h2>
          <button type="button" className="btn" onClick={() => onClose(false)} aria-label="إغلاق"><X size={18} /></button>
        </div>
        {loading ? <p>جاري التحميل…</p> : <>
          {target.mode === 'create' && target.kind === 'CHAPTER' && (
            <div role="radiogroup" aria-label="نوع الاختبار" style={{ display: 'flex', gap: 8, marginBottom: '1rem', flexWrap: 'wrap' }}>
              {([['AUTOMATIC', 'أسئلة اختيار من متعدد'], ['MANUAL_FILE', 'اختبار بملف']] as const).map(([value, label]) => (
                <button key={value} type="button" role="radio" aria-checked={type === value} className={type === value ? 'btn btn-solid' : 'btn'} onClick={() => setType(value)}>{label}</button>
              ))}
            </div>
          )}
          {pick && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
              <label style={field}>الكورس
                <select className="input-field" value={courseId} onChange={e => { setCourseId(e.target.value); setChapterId(''); setFileUrl(''); setFileName(''); }}>
                  {courses.length === 0 && <option value="">لا توجد كورسات</option>}
                  {courses.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
                </select>
              </label>
              <label style={field}>الفصل
                <select className="input-field" value={chapterId} onChange={e => setChapterId(e.target.value)}>
                  <option value="">{pickerChapters.length ? '— اختر الفصل —' : 'أضف فصلاً للكورس أولاً'}</option>
                  {pickerChapters.map(ch => <option key={ch.id} value={ch.id}>{ch.title}</option>)}
                </select>
              </label>
            </div>
          )}
          <label style={field}>العنوان<input className="input-field" value={title} maxLength={200} onChange={e => setTitle(e.target.value)} /></label>
          <label style={field}>تعليمات للطالب قبل البدء<textarea className="input-field" rows={3} value={instructions} maxLength={5000} onChange={e => setInstructions(e.target.value)} placeholder="مثال: لديك محاولتان، والنجاح من 60%." /></label>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
            <label style={field}>نسبة النجاح (%)<input className="input-field" type="number" min={1} max={100} value={passingPercent} onChange={e => setPassingPercent(Number(e.target.value))} dir="ltr" /></label>
            <label style={field}>عدد المحاولات (فارغ = غير محدود)<input className="input-field" type="number" min={1} max={100} value={maxAttempts} onChange={e => setMaxAttempts(e.target.value)} dir="ltr" /></label>
          </div>
          <label style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8 }}><input type="checkbox" checked={isPublished} onChange={e => setIsPublished(e.target.checked)} /> منشور ومتاح للطلاب</label>
          <label style={{ display: 'flex', gap: 8, alignItems: 'flex-start', marginBottom: '1rem' }}>
            <input type="checkbox" checked={required} onChange={e => setRequired(e.target.checked)} style={{ marginTop: 4 }} />
            <span>النجاح فيه شرط لإصدار الشهادة<br /><small style={{ opacity: 0.7 }}>يُطبَّق على من يسجل بعد تفعيله، ولا يُطلب إذا كان الاختبار مخفياً أو بلا أسئلة.</small></span>
          </label>

          {type === 'AUTOMATIC' ? <>
            <h3 style={{ margin: '1rem 0' }}>الأسئلة ({questions.length})</h3>
            {questions.map((q, i) => (
              <fieldset key={i} style={{ border: '1px solid rgba(255,255,255,0.1)', borderRadius: 14, padding: '1rem', marginBottom: '1rem' }}>
                <legend>السؤال {i + 1}</legend>
                <textarea className="input-field" rows={2} value={q.text} maxLength={2000} onChange={e => update(i, { text: e.target.value })} placeholder="نص السؤال" aria-label={`نص السؤال ${i + 1}`} />
                {q.options.map((option, j) => (
                  <div key={j} style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 8 }}>
                    <input type="radio" name={`correct-${i}`} checked={q.correctAnswer === j} onChange={() => update(i, { correctAnswer: j })} aria-label={`الخيار ${j + 1} هو الصحيح`} />
                    <input className="input-field" value={option} maxLength={500} onChange={e => update(i, { options: q.options.map((o, k) => k === j ? e.target.value : o) })} placeholder={`الخيار ${j + 1}`} />
                    {q.options.length > 2 && <button type="button" className="btn" aria-label="حذف الخيار" onClick={() => update(i, { options: q.options.filter((_, k) => k !== j), correctAnswer: q.correctAnswer === j ? 0 : q.correctAnswer > j ? q.correctAnswer - 1 : q.correctAnswer })}><X size={14} /></button>}
                  </div>
                ))}
                <div style={{ display: 'flex', gap: 8, marginTop: 10, flexWrap: 'wrap', alignItems: 'center' }}>
                  {q.options.length < 8 && <button type="button" className="btn" onClick={() => update(i, { options: [...q.options, ''] })}><Plus size={14} /> خيار</button>}
                  <label style={{ display: 'flex', gap: 6, alignItems: 'center' }}>العلامة<input className="input-field" type="number" min={0.5} max={100} step={0.5} value={q.points} onChange={e => update(i, { points: Number(e.target.value) })} style={{ width: 90 }} dir="ltr" /></label>
                  {questions.length > 1 && <button type="button" className="btn" onClick={() => setQuestions(qs => qs.filter((_, j) => j !== i))}><Trash2 size={14} /> حذف السؤال</button>}
                </div>
              </fieldset>
            ))}
            <button type="button" className="btn" onClick={() => setQuestions(qs => [...qs, emptyQuestion()])}><Plus size={16} /> إضافة سؤال</button>
          </> : <>
            <h3 style={{ margin: '1rem 0 0.5rem' }}>ملف الاختبار</h3>
            {storage && !storage.ready && <p role="alert" style={{ color: '#f87171', marginBottom: 8 }}>تخزين المستندات غير مهيأ على الخادم: {storage.message}</p>}
            <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap', padding: '1rem', border: '1px dashed rgba(255,255,255,0.25)', borderRadius: 14 }}>
              <label className="btn" style={{ display: 'inline-flex', gap: 6, alignItems: 'center', cursor: uploading ? 'wait' : 'pointer' }}>
                {uploading ? <Loader2 size={16} className="kq-spin" /> : <Upload size={16} />} {fileUrl ? 'استبدال الملف' : 'رفع الملف'}
                <input type="file" accept={FILE_ACCEPT} hidden disabled={uploading} onChange={e => { const f = e.target.files?.[0]; e.target.value = ''; if (f) void upload(f); }} />
              </label>
              {fileUrl ? <a href={fileUrl} target="_blank" rel="noopener noreferrer" style={{ display: 'inline-flex', gap: 6, alignItems: 'center', color: 'var(--gold-300)' }}><FileText size={16} /> {fileName || 'عرض الملف'}</a>
                : <span style={{ opacity: 0.65, fontSize: '0.9rem' }}>PDF أو Word أو PowerPoint أو Excel، حتى 20 MiB</span>}
            </div>
            <label style={{ ...field, marginTop: '1rem', maxWidth: 260 }}>العلامة القصوى<input className="input-field" type="number" min={1} max={1000} value={totalMarks} onChange={e => setTotalMarks(Number(e.target.value))} dir="ltr" /></label>
            <p style={{ opacity: 0.7, fontSize: '0.9rem' }}>يحمّل الطالب الملف ويرفع إجابته، ثم تصحّحها من «تصحيح اختبارات الملفات» فيظهر له الناتج والنجاح أو الرسوب.</p>
          </>}

          {error && <p role="alert" style={{ color: '#f87171', marginTop: '1rem' }}>{error}</p>}
          <div style={{ display: 'flex', gap: 8, marginTop: '1.25rem' }}>
            <button type="button" className="btn btn-solid" disabled={busy} onClick={save}>{busy ? 'جاري الحفظ…' : 'حفظ الاختبار'}</button>
            <button type="button" className="btn" onClick={() => onClose(false)}>إلغاء</button>
          </div>
        </>}
      </div>
      <style>{`.kq-spin{animation:kqspin 1s linear infinite}@keyframes kqspin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}
