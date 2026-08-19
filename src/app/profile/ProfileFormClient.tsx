'use client';

import { useState } from 'react';
import { Settings } from 'lucide-react';

export default function ProfileFormClient({ user }: { user: any }) {
  const [loading, setLoading] = useState(false);
  const [bio, setBio] = useState(user.bio || '');
  const [message, setMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    try {
      const res = await fetch('/api/user/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bio })
      });

      if (!res.ok) {
        throw new Error('فشل في حفظ البيانات');
      }

      setMessage('تم حفظ التعديلات بنجاح ✔️');
    } catch (err: any) {
      setMessage('حدث خطأ: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="glass-card" style={{ padding: '2rem' }}>
      <h3 style={{ fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <Settings size={20} color="var(--primary)" /> إعدادات الحساب
      </h3>
      
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', color: 'rgba(255,255,255,0.7)' }}>الاسم الكامل</label>
            <input type="text" defaultValue={user.name} disabled style={{ width: '100%', padding: '0.8rem', borderRadius: '8px', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.5)' }} />
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', color: 'rgba(255,255,255,0.7)' }}>البريد الإلكتروني</label>
            <input type="email" defaultValue={user.email} disabled style={{ width: '100%', padding: '0.8rem', borderRadius: '8px', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.5)' }} />
          </div>
        </div>
        
        {/* We kept the phone number disabled as requested by the user */}
        <div>
          <label style={{ display: 'block', marginBottom: '0.5rem', color: 'rgba(255,255,255,0.7)' }}>رقم الهاتف</label>
          <input type="text" defaultValue={user.phone || ''} placeholder="غير متوفر" disabled style={{ width: '100%', padding: '0.8rem', borderRadius: '8px', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.5)' }} />
        </div>

        <div>
          <label style={{ display: 'block', marginBottom: '0.5rem', color: 'rgba(255,255,255,0.7)' }}>نبذة عني (للمدربين)</label>
          <textarea 
            value={bio} 
            onChange={e => setBio(e.target.value)} 
            placeholder="اكتب نبذة مختصرة عن خبراتك ومؤهلاتك ليتعرف عليك الطلاب..." 
            rows={4}
            style={{ width: '100%', padding: '0.8rem', borderRadius: '8px', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff' }} 
          />
          <p style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.5)', marginTop: '0.5rem' }}>
            ستظهر هذه النبذة في قسم "عن المدرب" في صفحات الكورسات الخاصة بك.
          </p>
        </div>

        {message && (
          <div style={{ color: message.includes('خطأ') ? 'var(--danger)' : '#22c55e', fontWeight: 'bold' }}>
            {message}
          </div>
        )}

        <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
          <button type="submit" disabled={loading} className="btn btn-solid" style={{ padding: '0.8rem 2rem', borderRadius: '8px', fontWeight: 'bold' }}>
            {loading ? 'جاري الحفظ...' : 'حفظ التعديلات'}
          </button>
        </div>
      </form>
    </div>
  );
}
