'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

type Earning = {
  id: string; amount: number; status: string; createdAt: string; baseAmount: number | null; baseCurrency: string | null;
  ratePercent: number | null; reason: string | null; legacy: boolean; owner: { id: string; name: string }; buyer: { name: string };
};
const STATUS: Record<string, string> = { PENDING: 'قيد المراجعة', APPROVED: 'معتمدة', PAID: 'حُوّلت للمحفظة', REVERSED: 'ملغاة' };

export default function ReferralsAdminClient({ viewerId, commissionPercent, referredUsers, totals, topReferrers, earnings }: {
  viewerId: string; commissionPercent: number; referredUsers: number;
  totals: { status: string; amount: number; count: number }[];
  topReferrers: { name: string; amount: number; count: number }[];
  earnings: Earning[];
}) {
  const router = useRouter();
  const [percent, setPercent] = useState(String(commissionPercent));
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [filter, setFilter] = useState('PENDING');
  const [reason, setReason] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);

  async function call(method: string, body: object, done: string) {
    setBusy(true); setMessage('');
    try {
      const res = await fetch('/api/admin/referrals', { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'تعذّر تنفيذ العملية');
      setMessage(data.changed !== undefined ? `${done}: ${data.changed}` : done);
      setSelected(new Set()); setReason('');
      router.refresh();
    } catch (e) { setMessage(e instanceof Error ? e.message : 'تعذّر الاتصال'); }
    finally { setBusy(false); }
  }

  const shown = earnings.filter(e => filter === 'ALL' || e.status === filter);
  const total = (status: string) => totals.find(t => t.status === status);
  const card = { background: 'var(--ink-3)', borderRadius: 14, padding: '1rem', border: '1px solid rgba(255,255,255,0.06)' };
  return <div style={{ display: 'grid', gap: '1.25rem' }}>
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: 12 }}>
      <div style={card}><div style={{ opacity: 0.7 }}>مستخدمون سجّلوا بإحالة</div><strong style={{ fontSize: '1.5rem' }}>{referredUsers}</strong></div>
      {['PENDING', 'APPROVED', 'PAID', 'REVERSED'].map(s => <div key={s} style={card}>
        <div style={{ opacity: 0.7 }}>{STATUS[s]}</div><strong style={{ fontSize: '1.5rem' }}>${(total(s)?.amount ?? 0).toFixed(2)}</strong>
        <div style={{ fontSize: '0.8rem', opacity: 0.6 }}>{total(s)?.count ?? 0} عمولة</div>
      </div>)}
    </div>

    <section style={card}>
      <h2 style={{ fontSize: '1.1rem', marginBottom: 8 }}>نسبة العمولة</h2>
      <p style={{ opacity: 0.7, fontSize: '0.9rem', marginBottom: 8 }}>تُطبَّق على العمولات الجديدة فقط، ولا تغيّر العمولات المسجّلة. 0 يوقف إنشاء عمولات جديدة.</p>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
        <input className="input-field" type="number" min={0} max={50} step={0.5} value={percent} onChange={e => setPercent(e.target.value)} style={{ width: 110 }} dir="ltr" aria-label="نسبة العمولة" /> %
        <button type="button" className="btn btn-solid" disabled={busy} onClick={() => call('PUT', { commissionPercent: Number(percent) }, 'تم حفظ النسبة')}>حفظ</button>
      </div>
    </section>

    {topReferrers.length > 0 && <section style={card}>
      <h2 style={{ fontSize: '1.1rem', marginBottom: 8 }}>أكثر المُحيلين</h2>
      <ol style={{ margin: 0, paddingInlineStart: '1.2rem' }}>{topReferrers.map((r, i) => <li key={i}>{r.name}: ${r.amount.toFixed(2)} ({r.count} عمولة)</li>)}</ol>
    </section>}

    <section style={card}>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', marginBottom: 10 }}>
        <h2 style={{ fontSize: '1.1rem', margin: 0 }}>سجل العمولات</h2>
        <select value={filter} onChange={e => { setFilter(e.target.value); setSelected(new Set()); }} aria-label="تصفية">
          <option value="PENDING">قيد المراجعة</option><option value="APPROVED">معتمدة</option><option value="PAID">محوّلة</option><option value="REVERSED">ملغاة</option><option value="ALL">الكل</option>
        </select>
      </div>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 10 }}>
        <button type="button" className="btn btn-solid" disabled={busy || !selected.size} onClick={() => call('POST', { ids: [...selected], decision: 'APPROVE', reason: reason || null }, 'عمولات اعتُمدت')}>اعتماد المحدد ({selected.size})</button>
        <input className="input-field" value={reason} onChange={e => setReason(e.target.value)} placeholder="سبب الإلغاء (مطلوب للإلغاء)" style={{ flex: '1 1 220px' }} />
        <button type="button" className="btn" disabled={busy || !selected.size || !reason.trim()} onClick={() => call('POST', { ids: [...selected], decision: 'REVERSE', reason }, 'عمولات أُلغيت')}>إلغاء المحدد</button>
      </div>
      <p role="status" aria-live="polite" style={{ minHeight: '1.4em', color: 'var(--gold-300)' }}>{message}</p>
      {!shown.length ? <p style={{ opacity: 0.7 }}>لا توجد عمولات في هذا التصنيف.</p> : <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', textAlign: 'right', borderCollapse: 'collapse', minWidth: 720 }}>
          <thead><tr><th></th><th>التاريخ</th><th>المُحيل</th><th>المشتري</th><th>قيمة الدفع</th><th>العمولة</th><th>الحالة</th><th>ملاحظة</th></tr></thead>
          <tbody>{shown.map(e => {
            const selectable = e.owner.id !== viewerId && (e.status === 'APPROVED' || (e.status === 'PENDING' && !e.legacy));
            return <tr key={e.id} style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
              <td><input type="checkbox" disabled={!selectable} checked={selected.has(e.id)} aria-label="تحديد" onChange={ev => setSelected(s => { const n = new Set(s); if (ev.target.checked) n.add(e.id); else n.delete(e.id); return n; })} /></td>
              <td>{new Date(e.createdAt).toLocaleDateString('ar')}</td><td>{e.owner.name}</td><td>{e.buyer.name}</td>
              <td>{e.baseAmount != null ? `${e.baseAmount} ${e.baseCurrency === 'SYP' ? 'ل.س' : '$'}` : 'سجل قديم'}</td>
              <td>${e.amount.toFixed(2)}{e.ratePercent ? ` (${e.ratePercent}%)` : ''}</td>
              <td>{STATUS[e.status] ?? e.status}{e.legacy && e.status === 'PENDING' ? ' (سجل قديم قابل للتحويل)' : ''}</td><td>{e.reason ?? ''}</td>
            </tr>;
          })}</tbody>
        </table>
      </div>}
    </section>
  </div>;
}
