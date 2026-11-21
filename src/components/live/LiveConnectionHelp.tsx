'use client';

import { useState } from 'react';
import { Activity, RefreshCw } from 'lucide-react';

type Diagnosis = { ok?: boolean; stage?: string; hostname?: string; missing?: string[]; error?: string;
  probe?: { reachable: boolean; status?: number; elapsedMs: number; detail: string };
  credentials?: string; next?: string };

export default function LiveConnectionHelp({ message }: { message: string }) {
  const [busy, setBusy] = useState(false);
  const [report, setReport] = useState<Diagnosis | null>(null);
  const run = async () => {
    setBusy(true);
    try {
      const res = await fetch('/api/live/diagnostics', { cache: 'no-store', credentials: 'same-origin' });
      setReport(await res.json());
    } catch { setReport({ error: 'تعذر الاتصال بصفحة التشخيص' }); }
    finally { setBusy(false); }
  };
  return <section dir="rtl" role="alert" style={{ padding: '12px 18px', background: '#422c2f', color: '#fff', display: 'grid', gap: 8, border: '1px solid #a34a4d', borderRadius: 10 }}>
    <strong>تعذر الاتصال بخادم البث</strong>
    <span style={{ overflowWrap: 'anywhere', fontSize: 13 }}>{message}</span>
    <p style={{ fontSize: 13, margin: 0, lineHeight: 1.8 }}>
      إذا ظهر Failed to fetch فلا تستخدم أزرار البث قبل نجاح الاتصال. تحقق من عنوان LiveKit ومفاتيحه ومن طلب الاتصال في Network.
    </p>
    <button className="btn" type="button" onClick={() => void run()} disabled={busy} style={{ justifySelf: 'start', display: 'flex', gap: 7, alignItems: 'center' }}>
      {busy ? <RefreshCw size={15} className="kq-spin" /> : <Activity size={15} />} تشخيص الاتصال من الخادم
    </button>
    {report && <div style={{ fontSize: 13, display: 'grid', gap: 5 }}>
      {report.error && <span>{report.error}</span>}
      {report.hostname && <span dir="ltr">LiveKit host: {report.hostname}</span>}
      {report.missing?.length ? <span>متغيرات ناقصة: {report.missing.join(', ')}</span> : null}
      {report.probe && <span>وصول Coolify إلى LiveKit: {report.probe.reachable ? 'متاح' : 'فشل'} ({report.probe.elapsedMs}ms)</span>}
      {report.credentials && <span>التحقق من المفاتيح: {report.credentials === 'valid' ? 'ناجح' : report.credentials === 'not-checked' ? 'لم يُنفذ' : 'لم ينجح'}</span>}
      {report.next && <span>{report.next}</span>}
      {report.ok && <span style={{ color: '#86efac' }}>الخادم يتصل بشكل صحيح؛ إذا استمر الخطأ فالعطل في مسار الشبكة من متصفحك إلى LiveKit.</span>}
    </div>}
  </section>;
}
