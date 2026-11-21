'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { ArrowRight, FileText, Loader2, Plus, Sparkles, Trash2, Upload, X, AlertTriangle, CheckCircle2 } from 'lucide-react';

type Course = { id: string; title: string; hasFinal: boolean; chapters: { id: string; title: string }[] };
type Question = { text: string; options: string[]; correctAnswer: number; points: number };
type Result = { requested: number; generated: number; pages: number; batches: number; rejected: number; duplicates: number; limitation: string | null };
type Props = { courses: Course[]; aiReady: boolean; limits: { maxMiB: number; maxPages: number; defaultCount: number; maxCount: number } };

const field = { display: 'grid', gap: 6, marginBottom: '1rem' } as const;
const card = { background: 'var(--ink-3)', borderRadius: 18, padding: 'clamp(1rem, 3vw, 1.5rem)', border: '1px solid rgba(255,255,255,0.07)', marginBottom: '1.5rem' } as const;

export default function AiQuizClient({ courses, aiReady, limits }: Props) {
  const [courseId, setCourseId] = useState(courses[0]?.id ?? '');
  const [target, setTarget] = useState(''); // chapter id, or 'FINAL'
  const [file, setFile] = useState<File | null>(null);
  const [count, setCount] = useState(limits.defaultCount);
  const [difficulty, setDifficulty] = useState('mixed');
  const [language, setLanguage] = useState('ar');
  const [busy, setBusy] = useState<'generate' | 'save' | null>(null);
  const [error, setError] = useState('');
  const [result, setResult] = useState<Result | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [title, setTitle] = useState('');
  const [passingPercent, setPassingPercent] = useState(60);
  const [maxAttempts, setMaxAttempts] = useState('');
  const [reviewed, setReviewed] = useState(false);
  const [saved, setSaved] = useState(false);
  const course = useMemo(() => courses.find(c => c.id === courseId), [courses, courseId]);

  function chooseFile(f: File | null) {
    setError('');
    if (!f) return setFile(null);
    if (!/\.pdf$/i.test(f.name) || (f.type && f.type !== 'application/pdf')) { setFile(null); return setError('اختر ملف PDF فقط'); }
    if (f.size > limits.maxMiB * 1024 * 1024) { setFile(null); return setError(`حجم الملف أكبر من ${limits.maxMiB} MiB`); }
    setFile(f);
  }

  async function generate() {
    setError(''); setSaved(false);
    if (!courseId) return setError('اختر الكورس');
    if (!target) return setError('اختر الفصل أو الاختبار النهائي');
    if (!file) return setError('ارفع ملف PDF');
    setBusy('generate'); setResult(null); setQuestions([]); setReviewed(false);
    try {
      const form = new FormData();
      form.append('file', file); form.append('courseId', courseId); form.append('count', String(count));
      form.append('difficulty', difficulty); form.append('language', language);
      const res = await fetch('/api/ai/quiz-from-pdf', { method: 'POST', body: form });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'تعذّر توليد الأسئلة');
      setResult(data); setQuestions(data.questions);
      const where = target === 'FINAL' ? 'الاختبار النهائي' : course?.chapters.find(c => c.id === target)?.title;
      setTitle(`${target === 'FINAL' ? '' : 'اختبار: '}${where ?? ''}`.trim());
    } catch (e) { setError(e instanceof Error ? e.message : 'تعذّر الاتصال بالخادم'); }
    finally { setBusy(null); }
  }

  const update = (i: number, patch: Partial<Question>) => { setReviewed(false); setQuestions(qs => qs.map((q, j) => j === i ? { ...q, ...patch } : q)); };
  const remove = (i: number) => { setReviewed(false); setQuestions(qs => qs.filter((_, j) => j !== i)); };

  async function save() {
    setError('');
    if (!reviewed) return setError('أكّد أنك راجعت الأسئلة والإجابات الصحيحة');
    if (!questions.length) return setError('لا توجد أسئلة للحفظ');
    setBusy('save');
    try {
      const res = await fetch('/api/quizzes/create', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'AUTOMATIC', kind: target === 'FINAL' ? 'FINAL' : 'CHAPTER', courseId, chapterId: target === 'FINAL' ? undefined : target,
          title, passingPercent, maxAttempts: maxAttempts ? Number(maxAttempts) : null, questions,
          // Saved hidden and optional: the instructor publishes it (and may make it a certificate requirement)
          // from the quiz manager after a final look, so no student sees unreviewed generated questions.
          isPublished: false, requiredForCertificate: false,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'تعذّر حفظ الاختبار');
      setSaved(true);
    } catch (e) { setError(e instanceof Error ? e.message : 'تعذّر الاتصال بالخادم'); }
    finally { setBusy(null); }
  }

  return (
    <div dir="rtl" style={{ padding: 'clamp(1rem, 3vw, 2rem)', maxWidth: 1000, margin: '0 auto', color: '#fff', fontFamily: "'Cairo', sans-serif" }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
        <Link href="/instructor/quizzes" aria-label="العودة لإدارة الاختبارات" style={{ display: 'inline-flex', background: 'rgba(255,255,255,0.05)', padding: '0.5rem', borderRadius: '50%', color: '#fff' }}><ArrowRight size={20} /></Link>
        <h1 style={{ fontSize: 'clamp(1.4rem, 4vw, 2rem)', fontWeight: 'bold', display: 'flex', gap: 10, alignItems: 'center' }}><Sparkles color="var(--primary)" /> توليد اختبار من ملف PDF</h1>
      </div>
      <p style={{ opacity: 0.8, lineHeight: 1.9, marginBottom: '1.25rem' }}>
        يقرأ الذكاء الاصطناعي صفحات ملفك فعلياً ويقترح أسئلة اختيار من متعدد من محتواه فقط. تراجع الأسئلة وتعدّلها وتحذف غير المناسب،
        ثم يُحفظ الاختبار <strong>مخفياً</strong> لتنشره بنفسك. هذه أداة توليد أسئلة وليست اختباراً تكيفياً.
      </p>

      {!aiReady && <p role="alert" style={{ display: 'flex', gap: 8, color: '#fca5a5', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 12, padding: '0.75rem 1rem', marginBottom: '1rem' }}><AlertTriangle size={18} /> خدمة الذكاء الاصطناعي غير مفعّلة على الخادم (GEMINI_API_KEY غير مضبوط).</p>}

      <section style={card}>
        {courses.length === 0 ? <p>لا توجد كورسات تديرها. <Link href="/instructor/courses/create" style={{ color: 'var(--primary)' }}>أنشئ كورساً</Link></p> : <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
            <label style={field}>الكورس
              <select className="input-field" value={courseId} onChange={e => { setCourseId(e.target.value); setTarget(''); }}>
                {courses.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
              </select>
            </label>
            <label style={field}>الاختبار لـ
              <select className="input-field" value={target} onChange={e => setTarget(e.target.value)}>
                <option value="">— اختر —</option>
                {course?.chapters.map(ch => <option key={ch.id} value={ch.id}>نهاية فصل: {ch.title}</option>)}
                <option value="FINAL" disabled={course?.hasFinal}>الاختبار النهائي للكورس{course?.hasFinal ? ' (موجود مسبقاً)' : ''}</option>
              </select>
            </label>
            <label style={field}>عدد الأسئلة<input className="input-field" type="number" min={1} max={limits.maxCount} value={count} onChange={e => setCount(Number(e.target.value))} dir="ltr" /></label>
            <label style={field}>الصعوبة
              <select className="input-field" value={difficulty} onChange={e => setDifficulty(e.target.value)}>
                <option value="mixed">متنوعة</option><option value="easy">سهلة</option><option value="medium">متوسطة</option><option value="hard">صعبة</option>
              </select>
            </label>
            <label style={field}>اللغة
              <select className="input-field" value={language} onChange={e => setLanguage(e.target.value)}><option value="ar">العربية</option><option value="en">English</option></select>
            </label>
          </div>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap', padding: '1rem', border: '1px dashed rgba(255,255,255,0.25)', borderRadius: 14, marginBottom: '1rem' }}>
            <label className="btn" style={{ display: 'inline-flex', gap: 6, alignItems: 'center', cursor: 'pointer' }}>
              <Upload size={16} /> {file ? 'تغيير الملف' : 'اختيار ملف PDF'}
              <input type="file" accept="application/pdf,.pdf" hidden onChange={e => { chooseFile(e.target.files?.[0] ?? null); e.target.value = ''; }} />
            </label>
            {file ? <span style={{ display: 'inline-flex', gap: 6, alignItems: 'center' }}><FileText size={16} color="var(--gold-300)" /> {file.name} ({(file.size / 1024 / 1024).toFixed(1)} MiB)</span>
              : <span style={{ opacity: 0.65, fontSize: '0.9rem' }}>PDF حتى {limits.maxMiB} MiB و{limits.maxPages} صفحة</span>}
          </div>
          <button type="button" className="btn btn-solid" disabled={busy !== null || !aiReady} onClick={generate} style={{ display: 'inline-flex', gap: 8, alignItems: 'center' }}>
            {busy === 'generate' ? <><Loader2 size={18} className="kq-spin" /> جاري قراءة الملف وتوليد الأسئلة… قد يستغرق دقيقة أو أكثر</> : <><Sparkles size={18} /> توليد الأسئلة</>}
          </button>
        </>}
      </section>

      {error && <p role="alert" style={{ color: '#f87171', marginBottom: '1rem' }}>{error}</p>}

      {result && (
        <section style={card} aria-label="نتيجة التوليد">
          <p role="status" style={{ marginBottom: '0.5rem', fontWeight: 'bold', color: result.generated >= result.requested ? '#22c55e' : '#fbbf24' }}>
            تم توليد {result.generated} سؤالاً صالحاً من أصل {result.requested} مطلوبة (الملف {result.pages} صفحة).
          </p>
          {result.limitation && <p style={{ color: '#fbbf24', marginBottom: '0.5rem' }}>سبب النقص: {result.limitation}</p>}
          {(result.rejected > 0 || result.duplicates > 0) && <p style={{ opacity: 0.7, fontSize: '0.9rem' }}>استُبعد {result.rejected} سؤالاً غير صالح و{result.duplicates} سؤالاً مكرراً.</p>}
        </section>
      )}

      {questions.length > 0 && <>
        <h2 style={{ fontSize: '1.2rem', margin: '0 0 1rem' }}>راجع الأسئلة ({questions.length})</h2>
        {questions.map((q, i) => (
          <fieldset key={i} style={{ border: '1px solid rgba(255,255,255,0.1)', borderRadius: 14, padding: '1rem', marginBottom: '1rem' }}>
            <legend>السؤال {i + 1}</legend>
            <textarea className="input-field" rows={2} value={q.text} maxLength={2000} onChange={e => update(i, { text: e.target.value })} aria-label={`نص السؤال ${i + 1}`} />
            {q.options.map((option, j) => (
              <div key={j} style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 8 }}>
                <input type="radio" name={`ai-correct-${i}`} checked={q.correctAnswer === j} onChange={() => update(i, { correctAnswer: j })} aria-label={`الخيار ${j + 1} هو الصحيح`} />
                <input className="input-field" value={option} maxLength={500} onChange={e => update(i, { options: q.options.map((o, k) => k === j ? e.target.value : o) })} />
                {q.options.length > 2 && <button type="button" className="btn" aria-label="حذف الخيار" onClick={() => update(i, { options: q.options.filter((_, k) => k !== j), correctAnswer: q.correctAnswer === j ? 0 : q.correctAnswer > j ? q.correctAnswer - 1 : q.correctAnswer })}><X size={14} /></button>}
              </div>
            ))}
            <div style={{ display: 'flex', gap: 8, marginTop: 10, flexWrap: 'wrap', alignItems: 'center' }}>
              {q.options.length < 8 && <button type="button" className="btn" onClick={() => update(i, { options: [...q.options, ''] })}><Plus size={14} /> خيار</button>}
              <label style={{ display: 'flex', gap: 6, alignItems: 'center' }}>العلامة<input className="input-field" type="number" min={0.5} max={100} step={0.5} value={q.points} onChange={e => update(i, { points: Number(e.target.value) })} style={{ width: 90 }} dir="ltr" /></label>
              <button type="button" className="btn" onClick={() => remove(i)}><Trash2 size={14} /> حذف السؤال</button>
            </div>
          </fieldset>
        ))}

        <section style={card}>
          <h2 style={{ fontSize: '1.1rem', marginBottom: '1rem' }}>حفظ الاختبار</h2>
          <label style={field}>عنوان الاختبار<input className="input-field" value={title} maxLength={200} onChange={e => setTitle(e.target.value)} /></label>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
            <label style={field}>نسبة النجاح (%)<input className="input-field" type="number" min={1} max={100} value={passingPercent} onChange={e => setPassingPercent(Number(e.target.value))} dir="ltr" /></label>
            <label style={field}>عدد المحاولات (فارغ = غير محدود)<input className="input-field" type="number" min={1} max={100} value={maxAttempts} onChange={e => setMaxAttempts(e.target.value)} dir="ltr" /></label>
          </div>
          <label style={{ display: 'flex', gap: 8, alignItems: 'flex-start', marginBottom: '1rem' }}>
            <input type="checkbox" checked={reviewed} onChange={e => setReviewed(e.target.checked)} style={{ marginTop: 5 }} />
            <span>راجعت كل الأسئلة والإجابات الصحيحة وأتحمّل مسؤولية دقتها.<br /><small style={{ opacity: 0.7 }}>يُحفظ الاختبار مخفياً وغير مطلوب للشهادة؛ تنشره من «إدارة الاختبارات».</small></span>
          </label>
          {saved ? (
            <p role="status" style={{ display: 'flex', gap: 8, alignItems: 'center', color: '#22c55e' }}><CheckCircle2 size={18} /> حُفظ الاختبار كمسودة مخفية. <Link href="/instructor/quizzes" style={{ color: 'var(--primary)' }}>افتح إدارة الاختبارات لنشره</Link></p>
          ) : (
            <button type="button" className="btn btn-solid" disabled={busy !== null || !reviewed} onClick={save}>{busy === 'save' ? 'جاري الحفظ…' : `حفظ ${questions.length} سؤالاً`}</button>
          )}
        </section>
      </>}
      <style>{`.kq-spin{animation:kqspin 1s linear infinite}@keyframes kqspin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}
