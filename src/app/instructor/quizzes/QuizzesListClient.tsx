'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowRight, FileEdit, Plus, Award, BarChart3, Trash2, Pencil, EyeOff, ShieldCheck, FileUp, Sparkles, AlertTriangle } from 'lucide-react';
import QuizEditor, { type EditorTarget } from './QuizEditor';

export type QuizSummary = {
  id: string; title: string; type: string; isPublished: boolean; requiredForCertificate: boolean; maxAttempts: number | null;
  passingPercent: number; questions: number; attempts: number;
};
export type CourseExams = {
  id: string; title: string; status: string; ownCourse?: boolean;
  chapters: { id: string; title: string; quizzes: QuizSummary[] }[];
  finalExam: QuizSummary | null;
};

type Results = {
  quiz: { title: string; passingPercent: number; maxAttempts: number | null };
  stats: { attempts: number; students: number; passedStudents: number; passRate: number; pendingGrading: number };
  students: { name: string; attempts: number; best: number | null; passed: boolean }[];
};

const badge = (on: boolean, yes: string, no: string, color: string) => (
  <span style={{ fontSize: '0.75rem', padding: '0.15rem 0.55rem', borderRadius: 999, background: on ? `${color}22` : 'rgba(255,255,255,0.06)', color: on ? color : 'rgba(255,255,255,0.55)', border: `1px solid ${on ? color : 'rgba(255,255,255,0.1)'}` }}>
    {on ? yes : no}
  </span>
);

export default function QuizzesListClient({ courses, storage, staff = false, openFileQuiz = false }: {
  courses: CourseExams[]; storage: { ready: boolean; message: string | null }; staff?: boolean; openFileQuiz?: boolean;
}) {
  const router = useRouter();
  const fileQuiz = (courseId?: string, chapterId?: string, context = ''): EditorTarget =>
    ({ mode: 'create', kind: 'CHAPTER', type: 'MANUAL_FILE', courseId, chapterId, context: context || 'اختبار بملف' });
  const [editor, setEditor] = useState<EditorTarget | null>(openFileQuiz && courses.length ? fileQuiz() : null);
  const pickerCourses = courses.map(c => ({ id: c.id, title: c.title, chapters: c.chapters.map(ch => ({ id: ch.id, title: ch.title })) }));
  const [results, setResults] = useState<Results | null>(null);
  const [scope, setScope] = useState<'all' | 'mine' | 'others'>('all');
  const [search, setSearch] = useState('');
  const visibleCourses = courses.filter(course =>
    (!staff || scope === 'all' || (scope === 'mine' ? course.ownCourse !== false : course.ownCourse === false))
    && course.title.toLocaleLowerCase().includes(search.trim().toLocaleLowerCase()));
  const [message, setMessage] = useState('');

  async function showResults(id: string) {
    setMessage('');
    const res = await fetch(`/api/quizzes/${id}/results`);
    const data = await res.json().catch(() => ({}));
    if (!res.ok) { setMessage(data.error || 'تعذّر تحميل النتائج'); return; }
    setResults(data);
  }
  async function remove(quiz: QuizSummary) {
    if (!confirm(quiz.attempts ? `للاختبار «${quiz.title}» محاولات محفوظة، فسيُخفى ولن يكون شرطاً للشهادة. متابعة؟` : `حذف «${quiz.title}» نهائياً؟`)) return;
    const res = await fetch(`/api/quizzes/${quiz.id}`, { method: 'DELETE', headers: { 'Content-Type': 'application/json' } });
    const data = await res.json().catch(() => ({}));
    setMessage(res.ok ? (data.message || 'تم الحذف') : (data.error || 'تعذّر الحذف'));
    router.refresh();
  }

  const row = (quiz: QuizSummary) => (
    <div key={quiz.id} style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', alignItems: 'center', justifyContent: 'space-between', padding: '0.8rem 1rem', borderRadius: 12, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
      <div style={{ display: 'grid', gap: 6 }}>
        <strong>{quiz.title}</strong>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {badge(quiz.isPublished, 'منشور', 'مخفي', '#22c55e')}
          {badge(quiz.requiredForCertificate, 'شرط للشهادة', 'اختياري للتدريب', '#c9a45c')}
          <span style={{ fontSize: '0.8rem', opacity: 0.7 }}>{quiz.type === 'AUTOMATIC' ? `${quiz.questions} سؤال` : 'اختبار بملف'} • نجاح {quiz.passingPercent}% • {quiz.maxAttempts ? `${quiz.maxAttempts} محاولات` : 'محاولات غير محدودة'} • {quiz.attempts} محاولة طلاب</span>
        </div>
      </div>
      <div style={{ display: 'flex', gap: 6 }}>
        <button type="button" className="btn" onClick={() => setEditor({ mode: 'edit', quizId: quiz.id })} aria-label={`تعديل ${quiz.title}`}><Pencil size={16} /> تعديل</button>
        <button type="button" className="btn" onClick={() => showResults(quiz.id)}><BarChart3 size={16} /> النتائج</button>
        <button type="button" className="btn" onClick={() => remove(quiz)} aria-label={`حذف ${quiz.title}`}><Trash2 size={16} /></button>
      </div>
    </div>
  );

  return (
    <div dir="rtl" style={{ padding: 'clamp(1rem, 3vw, 2rem)', maxWidth: 1100, margin: '0 auto', color: '#fff' }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <Link href="/instructor" aria-label="العودة" style={{ display: 'inline-flex', background: 'rgba(255,255,255,0.05)', padding: '0.5rem', borderRadius: '50%', color: '#fff' }}><ArrowRight size={20} /></Link>
          <h1 style={{ fontSize: 'clamp(1.4rem, 4vw, 2rem)', fontWeight: 'bold' }}>الاختبارات والامتحانات</h1>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          <Link href="/instructor/quizzes/submissions" className="btn" style={{ display: 'flex', alignItems: 'center', gap: 6 }}><FileEdit size={18} /> تصحيح اختبارات الملفات</Link>
          <button type="button" className="btn" disabled={!courses.length} onClick={() => setEditor(fileQuiz())} style={{ display: 'flex', alignItems: 'center', gap: 6 }}><FileUp size={18} /> اختبار بملف</button>
          <Link href="/instructor/quizzes/ai" className="btn btn-solid" style={{ display: 'flex', alignItems: 'center', gap: 6 }}><Sparkles size={18} /> توليد اختبار بالذكاء الاصطناعي</Link>
        </div>
      </div>
      <p style={{ opacity: 0.75, marginBottom: '1.5rem', lineHeight: 1.8 }}>
        لكل فصل اختبار اختياري في نهايته، وللكورس اختبار نهائي اختياري. «منشور» يعني أن الطلاب يستطيعون حلّه،
        و«شرط للشهادة» يعني أن النجاح فيه مطلوب لإصدار الشهادة. تفعيل الشرط يطبَّق على الطلاب الذين يسجلون بعد تفعيله فقط.
      </p>
      <p role="status" aria-live="polite" style={{ minHeight: '1.4em', color: 'var(--gold-300)' }}>{message}</p>

      {!storage.ready && (
        <p role="alert" style={{ display: 'flex', gap: 8, alignItems: 'flex-start', color: '#fca5a5', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 12, padding: '0.75rem 1rem', marginBottom: '1rem' }}>
          <AlertTriangle size={18} style={{ flexShrink: 0, marginTop: 3 }} /> اختبارات الملفات غير متاحة حتى يُضبط تخزين المستندات على الخادم: {storage.message}
        </p>
      )}
      {courses.length > 0 && <section aria-label="تصفية الكورسات" style={{ background: 'var(--ink-3)', border: '1px solid rgba(201,164,92,.2)', borderRadius: 14, padding: 14, marginBottom: 18, display: 'grid', gap: 12 }}>
        {staff && <div role="group" aria-label="نطاق الكورسات" style={{ display: 'flex', gap: 7, flexWrap: 'wrap' }}>
          {([['all', 'جميع الكورسات'], ['mine', 'كورساتي'], ['others', 'كورسات المدربين']] as const).map(([value, label]) => <button key={value} type="button" aria-pressed={scope === value} className={scope === value ? 'btn btn-solid' : 'btn'} onClick={() => setScope(value)}>{label} ({value === 'all' ? courses.length : courses.filter(c => value === 'mine' ? c.ownCourse !== false : c.ownCourse === false).length})</button>)}
        </div>}
        <label style={{ display: 'grid', gap: 6 }}>بحث باسم الكورس
          <input className="input-field" value={search} maxLength={120} onChange={e => setSearch(e.target.value)} placeholder="اكتب اسم الكورس..." aria-label="بحث في الكورسات" />
        </label>
        <span role="status" style={{ opacity: .75, fontSize: 13 }}>يظهر {visibleCourses.length} من {courses.length} كورس. اضغط اسم الكورس لعرض فصوله واختباراته.</span>
        {visibleCourses.length === 0 && <button type="button" className="btn" onClick={() => { setScope('all'); setSearch(''); }}>إعادة عرض جميع الكورسات</button>}
      </section>}
      {courses.length === 0 && (
        <p style={{ lineHeight: 1.9 }}>{staff ? 'لا توجد كورسات على المنصة بعد.' : 'لا يوجد كورس مسجّل باسم حسابك كمدرّب.'} <Link href="/instructor/courses/create" style={{ color: 'var(--primary)' }}>أنشئ كورساً</Link> لإضافة الاختبارات.</p>
      )}
      {visibleCourses.map(course => (
        <details key={course.id} style={{ background: 'var(--ink-3)', borderRadius: 18, padding: 'clamp(1rem, 3vw, 1.5rem)', marginBottom: '1.5rem', border: '1px solid rgba(255,255,255,0.06)' }}>
          <summary style={{ fontSize: '1.15rem', fontWeight: 700, cursor: 'pointer', marginBottom: '1rem', lineHeight: 1.7, color: 'var(--gold-200)', outlineOffset: 4 }}>{course.title}{staff && course.ownCourse === false ? <small style={{ opacity: 0.7, fontSize: '0.8rem' }}> • مدرّب آخر</small> : null}<span style={{ opacity: 0.6, fontSize: 12, marginInlineStart: 12 }}>({course.chapters.length} فصل)</span></summary>
          {course.chapters.length === 0 && <p style={{ opacity: 0.7 }}>أضف فصولاً للكورس أولاً.</p>}
          {course.chapters.map(chapter => (
            <div key={chapter.id} style={{ marginBottom: '1rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <h3 style={{ fontSize: '1rem', opacity: 0.9 }}>{chapter.title}</h3>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  <button type="button" className="btn" onClick={() => setEditor({ mode: 'create', kind: 'CHAPTER', chapterId: chapter.id, courseId: course.id, context: chapter.title })}><Plus size={16} /> اختبار نهاية الفصل</button>
                  <button type="button" className="btn" onClick={() => setEditor(fileQuiz(course.id, chapter.id, chapter.title))}><FileUp size={16} /> اختبار بملف</button>
                </div>
              </div>
              <div style={{ display: 'grid', gap: 8 }}>{chapter.quizzes.length ? chapter.quizzes.map(row) : <p style={{ fontSize: '0.85rem', opacity: 0.55 }}>لا يوجد اختبار لهذا الفصل.</p>}</div>
            </div>
          ))}
          <div style={{ marginTop: '1.25rem', padding: '1rem', borderRadius: 14, border: '1px solid var(--gold-400)', background: 'var(--gold-soft)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, marginBottom: 8, flexWrap: 'wrap' }}>
              <h3 style={{ fontSize: '1.05rem', display: 'flex', gap: 8, alignItems: 'center' }}><Award size={18} color="var(--gold-300)" /> الاختبار النهائي للكورس</h3>
              {!course.finalExam && <button type="button" className="btn" onClick={() => setEditor({ mode: 'create', kind: 'FINAL', courseId: course.id, context: course.title })}><Plus size={16} /> إضافة اختبار نهائي</button>}
            </div>
            {course.finalExam ? row(course.finalExam) : <p style={{ fontSize: '0.9rem', opacity: 0.75 }}>لا يوجد اختبار نهائي: الشهادة لا تتطلبه.</p>}
          </div>
        </details>
      ))}

      {editor && <QuizEditor target={editor} courses={pickerCourses} storage={storage} onClose={saved => { setEditor(null); if (saved) { setMessage('تم حفظ الاختبار'); router.refresh(); } }} />}

      {results && (
        <div role="dialog" aria-modal="true" aria-label="نتائج الاختبار" onClick={() => setResults(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'grid', placeItems: 'center', padding: '1rem', zIndex: 50 }}>
          <div onClick={e => e.stopPropagation()} style={{ background: 'var(--ink-2)', borderRadius: 18, padding: '1.5rem', width: 'min(720px, 100%)', maxHeight: '85vh', overflow: 'auto' }}>
            <h2 style={{ marginBottom: '1rem' }}>نتائج: {results.quiz.title}</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 10, marginBottom: '1rem' }}>
              {[['الطلاب', results.stats.students], ['الناجحون', results.stats.passedStudents], ['نسبة النجاح', `${results.stats.passRate}%`], ['المحاولات', results.stats.attempts], ['بانتظار التصحيح', results.stats.pendingGrading]].map(([label, value]) => (
                <div key={label as string} style={{ background: 'rgba(255,255,255,0.04)', padding: '0.8rem', borderRadius: 12 }}><div style={{ opacity: 0.7, fontSize: '0.8rem' }}>{label}</div><strong style={{ fontSize: '1.3rem' }}>{value}</strong></div>
              ))}
            </div>
            {results.students.length === 0 ? <p>لم يحاول أي طالب بعد.</p> : (
              <table style={{ width: '100%', textAlign: 'right', borderCollapse: 'collapse' }}>
                <thead><tr><th>الطالب</th><th>المحاولات</th><th>أفضل نتيجة</th><th>الحالة</th></tr></thead>
                <tbody>{results.students.map((s, i) => <tr key={i} style={{ borderTop: '1px solid rgba(255,255,255,0.08)' }}><td>{s.name}</td><td>{s.attempts}</td><td>{s.best ?? '—'}</td><td>{s.passed ? <span style={{ color: '#22c55e' }}><ShieldCheck size={14} /> ناجح</span> : 'لم ينجح بعد'}</td></tr>)}</tbody>
              </table>
            )}
            <button type="button" className="btn" style={{ marginTop: '1rem' }} onClick={() => setResults(null)}><EyeOff size={16} /> إغلاق</button>
          </div>
        </div>
      )}
    </div>
  );
}
