'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { FIELD_LABELS, type ChangeField } from '@/lib/course-change-request-labels';

type Request = { id: string; instructorId: string; changes: Record<string, unknown>; previous: Record<string, unknown>; createdAt: string; course: { id: string; title: string; instructor: { name: string } } };
type PendingCourse = { id: string; title: string; category: string; price: number; priceSYP: number; createdAt: string; instructorId: string; instructor: { name: string }; _count: { chapters: number } };

function Value({ field, value }: { field: string; value: unknown }) {
  if (value === null || value === undefined || value === '') return <em style={{ opacity: 0.6 }}>فارغ</em>;
  if (field === 'thumbnail' && typeof value === 'string' && !value.startsWith('linear-gradient')) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={value} alt="" style={{ maxWidth: 220, maxHeight: 130, borderRadius: 8, objectFit: 'cover' }} />;
  }
  if (Array.isArray(value)) return <ul style={{ margin: 0, paddingInlineStart: '1.2rem' }}>{value.map((v, i) => <li key={i}>{String(v)}</li>)}</ul>;
  if (field === 'price') return <span>${String(value)}</span>;
  if (field === 'priceSYP') return <span>{Number(value).toLocaleString('ar-SY')} ل.س</span>;
  return <span style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{String(value)}</span>;
}

const card = { background: 'var(--surface, rgba(127,127,127,0.06))', border: '1px solid var(--border, rgba(127,127,127,0.25))', borderRadius: 14, padding: '1.25rem', margin: '1rem 0' };

export default function RequestsClient({ viewerId, requests, pendingCourses }: { viewerId: string; requests: Request[]; pendingCourses: PendingCourse[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const [reasons, setReasons] = useState<Record<string, string>>({});

  async function send(key: string, url: string, method: string, body: object) {
    setBusy(key); setMessage('');
    try {
      const response = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || 'تعذّر حفظ القرار');
      setMessage('تم حفظ القرار وإشعار المدرب');
      router.refresh();
    } catch (error) { setMessage(error instanceof Error ? error.message : 'تعذّر الاتصال'); }
    finally { setBusy(null); }
  }

  const reasonBox = (id: string, placeholder: string) => <textarea aria-label={placeholder} placeholder={placeholder} value={reasons[id] || ''}
    onChange={e => setReasons({ ...reasons, [id]: e.target.value })} style={{ width: '100%', minHeight: 60, marginTop: 8 }} />;

  return <section>
    <p role="status" aria-live="polite" style={{ minHeight: '1.5em', fontWeight: 600 }}>{message}</p>

    <h2>كورسات جديدة بانتظار النشر ({pendingCourses.length})</h2>
    {!pendingCourses.length && <p>لا توجد كورسات جديدة بانتظار المراجعة.</p>}
    {pendingCourses.map(course => {
      const own = course.instructorId === viewerId;
      return <article key={course.id} style={card}>
        <h3 style={{ marginTop: 0 }}>{course.title}</h3>
        <p>المدرب: {course.instructor.name} • التصنيف: {course.category} • ${course.price} / {course.priceSYP.toLocaleString('ar-SY')} ل.س • {course._count.chapters} فصل</p>
        <p><a href={`/courses/${course.id}`} target="_blank" rel="noreferrer">معاينة صفحة الكورس</a></p>
        {own && <p>هذا كورسك، ولا يمكنك اعتماده.</p>}
        {reasonBox(course.id, 'سبب الرفض (يظهر للمدرب)')}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 8 }}>
          <button disabled={busy !== null || own} onClick={() => send(course.id, `/api/admin/courses/${course.id}`, 'PUT', { status: 'PUBLISHED' })}>موافقة ونشر</button>
          <button disabled={busy !== null || own || !reasons[course.id]?.trim()} onClick={() => send(course.id, `/api/admin/courses/${course.id}`, 'PUT', { status: 'REJECTED', reason: reasons[course.id] })}>رفض</button>
        </div>
      </article>;
    })}

    <h2 style={{ marginTop: '2rem' }}>طلبات تعديل الكورسات المنشورة ({requests.length})</h2>
    {!requests.length && <p>لا توجد طلبات تعديل مفتوحة.</p>}
    {requests.map(request => {
      const own = request.instructorId === viewerId;
      return <article key={request.id} style={card}>
        <h3 style={{ marginTop: 0 }}>{request.course.title}</h3>
        <p>المدرب: {request.course.instructor.name} • أُرسل: {new Date(request.createdAt).toLocaleString('ar-JO', { timeZone: 'Asia/Amman' })}</p>
        <div style={{ overflowX: 'auto' }}><table style={{ width: '100%', textAlign: 'right', borderCollapse: 'collapse' }}>
          <thead><tr><th>الحقل</th><th>القيمة الحالية</th><th>القيمة المقترحة</th></tr></thead>
          <tbody>{Object.keys(request.changes).map(field => <tr key={field} style={{ borderTop: '1px solid var(--border, rgba(127,127,127,0.25))', verticalAlign: 'top' }}>
            <td style={{ padding: 8, fontWeight: 600 }}>{FIELD_LABELS[field as ChangeField] ?? field}</td>
            <td style={{ padding: 8 }}><Value field={field} value={request.previous[field]} /></td>
            <td style={{ padding: 8 }}><Value field={field} value={request.changes[field]} /></td>
          </tr>)}</tbody>
        </table></div>
        {own && <p>هذا طلبك، ولا يمكنك مراجعته.</p>}
        {reasonBox(request.id, 'السبب (مطلوب عند الرفض)')}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 8 }}>
          <button disabled={busy !== null || own} onClick={() => send(request.id, `/api/admin/course-requests/${request.id}`, 'POST', { decision: 'APPROVE', reason: reasons[request.id] || null })}>موافقة وتطبيق</button>
          <button disabled={busy !== null || own || !reasons[request.id]?.trim()} onClick={() => send(request.id, `/api/admin/course-requests/${request.id}`, 'POST', { decision: 'REJECT', reason: reasons[request.id] })}>رفض</button>
        </div>
      </article>;
    })}
  </section>;
}
