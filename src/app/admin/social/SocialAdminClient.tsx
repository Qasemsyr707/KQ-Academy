'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ExternalLink, Save, Trash2 } from 'lucide-react';
import SocialIcon from '@/components/social/SocialIcon';
import { SOCIAL_PLATFORMS, SOCIAL_PLATFORM_KEYS, type SocialPlatform } from '@/lib/social-links';

type Row = { platform: string; url: string; isActive: boolean; order: number };
type Draft = { url: string; isActive: boolean; order: number; saved: boolean };

export default function SocialAdminClient({ initial }: { initial: Row[] }) {
  const router = useRouter();
  const [drafts, setDrafts] = useState<Record<string, Draft>>(() => Object.fromEntries(SOCIAL_PLATFORM_KEYS.map((key, i) => {
    const row = initial.find(r => r.platform === key);
    return [key, row ? { url: row.url, isActive: row.isActive, order: row.order, saved: true } : { url: '', isActive: true, order: i, saved: false }];
  })));
  const [busy, setBusy] = useState<string | null>(null);
  const [messages, setMessages] = useState<Record<string, { ok: boolean; text: string }>>({});
  const set = (key: string, patch: Partial<Draft>) => setDrafts(d => ({ ...d, [key]: { ...d[key], ...patch } }));
  const say = (key: string, ok: boolean, text: string) => setMessages(m => ({ ...m, [key]: { ok, text } }));

  async function save(key: SocialPlatform) {
    setBusy(key); say(key, true, '');
    try {
      const d = drafts[key];
      const res = await fetch('/api/admin/social-links', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ platform: key, url: d.url, isActive: d.isActive, order: d.order }) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'تعذّر الحفظ');
      set(key, { url: data.link.url, saved: true });
      say(key, true, 'تم الحفظ');
      router.refresh();
    } catch (e) { say(key, false, e instanceof Error ? e.message : 'تعذّر الاتصال'); }
    finally { setBusy(null); }
  }
  async function remove(key: SocialPlatform) {
    if (!confirm(`حذف رابط ${SOCIAL_PLATFORMS[key].label}؟`)) return;
    setBusy(key);
    try {
      const res = await fetch(`/api/admin/social-links?platform=${key}`, { method: 'DELETE', headers: { 'Content-Type': 'application/json' } });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'تعذّر الحذف');
      set(key, { url: '', saved: false });
      say(key, true, 'تم حذف الرابط');
      router.refresh();
    } catch (e) { say(key, false, e instanceof Error ? e.message : 'تعذّر الاتصال'); }
    finally { setBusy(null); }
  }

  return <div style={{ display: 'grid', gap: '1rem' }}>
    {SOCIAL_PLATFORM_KEYS.map(key => {
      const d = drafts[key];
      const m = messages[key];
      return <section key={key} aria-label={SOCIAL_PLATFORMS[key].label} style={{ background: 'var(--ink-3)', border: `1px solid ${d.saved && d.isActive ? 'var(--gold-400)' : 'rgba(255,255,255,0.08)'}`, borderRadius: 16, padding: '1rem 1.25rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10, flexWrap: 'wrap' }}>
          <span style={{ display: 'inline-grid', placeItems: 'center', width: 38, height: 38, borderRadius: 10, background: 'var(--gold-soft)', color: 'var(--gold-300)' }}><SocialIcon platform={key} size={20} /></span>
          <h2 style={{ fontSize: '1.05rem', margin: 0 }}>{SOCIAL_PLATFORMS[key].label}</h2>
          <span style={{ fontSize: '0.8rem', opacity: 0.7 }}>{d.saved ? (d.isActive ? 'ظاهر في الموقع' : 'محفوظ ومخفي') : 'غير مضاف'}</span>
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center' }}>
          <input className="input-field" dir="ltr" type="url" inputMode="url" value={d.url} maxLength={500} placeholder={`https://${SOCIAL_PLATFORMS[key].domains[0]}/...`}
            style={{ flex: '1 1 260px', minWidth: 0 }} aria-label={`رابط ${SOCIAL_PLATFORMS[key].label}`} onChange={e => set(key, { url: e.target.value })} />
          <label style={{ display: 'flex', gap: 6, alignItems: 'center', whiteSpace: 'nowrap' }}><input type="checkbox" checked={d.isActive} onChange={e => set(key, { isActive: e.target.checked })} /> مفعّل</label>
          <label style={{ display: 'flex', gap: 6, alignItems: 'center', whiteSpace: 'nowrap' }}>الترتيب<input className="input-field" type="number" min={0} max={100} value={d.order} onChange={e => set(key, { order: Number(e.target.value) })} style={{ width: 70 }} dir="ltr" /></label>
        </div>
        <div style={{ display: 'flex', gap: 8, marginTop: 10, flexWrap: 'wrap', alignItems: 'center' }}>
          <button type="button" className="btn btn-solid" disabled={busy !== null || !d.url.trim()} onClick={() => save(key)}><Save size={16} /> حفظ</button>
          {d.saved && <a className="btn" href={d.url} target="_blank" rel="noopener noreferrer"><ExternalLink size={16} /> فتح الرابط</a>}
          {d.saved && <button type="button" className="btn" disabled={busy !== null} onClick={() => remove(key)}><Trash2 size={16} /> حذف</button>}
          {m?.text && <span role="status" style={{ color: m.ok ? '#22c55e' : '#f87171' }}>{m.text}</span>}
        </div>
      </section>;
    })}
  </div>;
}
