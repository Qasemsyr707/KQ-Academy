'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { PERMISSIONS, PERMISSION_KEYS, PERMISSION_PRESETS, type Permission } from '@/lib/permissions';

type Admin = { id: string; name: string; email: string; isBanned: boolean; adminPermissions: string[] };
export default function PermissionsClient({ admins }: { admins: Admin[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const [query, setQuery] = useState('');
  async function change(admin: Admin, permission: Permission) {
    const expected = admin.adminPermissions.includes(permission);
    setBusy(`${admin.id}:${permission}`); setMessage('');
    try {
      const response = await fetch('/api/admin/permissions', { method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetId: admin.id, permission, expected, granted: !expected }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'تعذّر حفظ الإذن');
      setMessage('تم حفظ الإذن وتسجيل التغيير');
      router.refresh();
    } catch (error) { setMessage(error instanceof Error ? error.message : 'تعذّر الاتصال'); }
    finally { setBusy(null); }
  }
  async function applyPreset(admin: Admin, preset: string) {
    const chosen = PERMISSION_PRESETS[preset];
    if (!chosen || !confirm(`تطبيق مجموعة «${chosen.label}» على ${admin.name}؟ ستُستبدل صلاحياته الحالية.`)) return;
    setBusy(`${admin.id}:preset`); setMessage('');
    try {
      const response = await fetch('/api/admin/permissions', { method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetId: admin.id, permissions: chosen.permissions, expected: admin.adminPermissions }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'تعذّر حفظ الأذونات');
      setMessage('تم تطبيق المجموعة وتسجيل التغييرات');
      router.refresh();
    } catch (error) { setMessage(error instanceof Error ? error.message : 'تعذّر الاتصال'); }
    finally { setBusy(null); }
  }
  return <section aria-label="صلاحيات المدراء">
    <label>بحث عن مدير <input type="search" value={query} onChange={e => setQuery(e.target.value)} placeholder="الاسم أو البريد الإلكتروني" /></label>
    <p role="status" aria-live="polite">{message}</p>
    {admins.filter(a => `${a.name} ${a.email}`.toLowerCase().includes(query.toLowerCase())).map(admin => <fieldset key={admin.id} disabled={busy !== null} style={{ margin: '1rem 0', padding: '1rem', borderRadius: 12 }}>
      <legend>{admin.name} — <bdi>{admin.email}</bdi>{admin.isBanned ? ' (محظور)' : ''}</legend>
      <label style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: '0.75rem' }}>مجموعة جاهزة
        <select value="" onChange={e => applyPreset(admin, e.target.value)}>
          <option value="">اختر مجموعة…</option>
          {Object.entries(PERMISSION_PRESETS).map(([key, preset]) => <option key={key} value={key}>{preset.label}</option>)}
        </select>
      </label>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
        {PERMISSION_KEYS.map(permission => <label key={permission} style={{ display: 'flex', gap: 8, alignItems: 'center', minHeight: 44 }}>
          <input type="checkbox" checked={admin.adminPermissions.includes(permission)} onChange={() => change(admin, permission)} />
          {PERMISSIONS[permission]}{busy === `${admin.id}:${permission}` ? ' …' : ''}
        </label>)}
      </div>
    </fieldset>)}
    {!admins.length && <p>لا توجد حسابات مدراء حالياً.</p>}
  </section>;
}
