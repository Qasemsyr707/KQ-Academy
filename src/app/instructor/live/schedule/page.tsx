'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Video, Calendar, Clock, PlusCircle } from 'lucide-react';
import Link from 'next/link';

export default function ScheduleLivePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    // Mock logic
    setTimeout(() => {
      alert('تم جدولة البث بنجاح!');
      router.push('/instructor');
    }, 1000);
  };

  return (
    <div style={{ padding: '2rem 5%', minHeight: '100vh', background: '#050505', color: '#fff' }}>
      <div style={{ maxWidth: '800px', margin: '0 auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
          <h1 style={{ fontSize: '2rem', fontWeight: 'bold' }}>جدولة بث مباشر</h1>
          <Link href="/instructor" className="btn" style={{ padding: '0.5rem 1rem' }}>إلغاء</Link>
        </div>

        <form onSubmit={handleSubmit} className="glass-card" style={{ padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          
          <div style={{ textAlign: 'center', marginBottom: '1rem' }}>
            <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: 'rgba(244, 63, 94, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem auto' }}>
              <Video size={40} color="#f43f5e" />
            </div>
            <h2 style={{ fontSize: '1.2rem', color: 'rgba(255,255,255,0.8)' }}>إنشاء قاعة افتراضية جديدة</h2>
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', color: 'rgba(255,255,255,0.8)' }}>عنوان البث</label>
            <input required type="text" placeholder="مثال: مراجعة شاملة للامتحان النصفي" style={{ width: '100%', padding: '0.8rem', borderRadius: '8px', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff' }} />
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', color: 'rgba(255,255,255,0.8)' }}>الكورس المرتبط</label>
            <select required style={{ width: '100%', padding: '0.8rem', borderRadius: '8px', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', appearance: 'none' }}>
              <option value="">اختر الكورس...</option>
              <option value="1">كورس React المتقدم</option>
              <option value="2">أساسيات الفيزياء</option>
            </select>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', color: 'rgba(255,255,255,0.8)' }}>التاريخ</label>
              <div style={{ position: 'relative' }}>
                <Calendar size={20} color="rgba(255,255,255,0.4)" style={{ position: 'absolute', top: '50%', right: '1rem', transform: 'translateY(-50%)' }} />
                <input required type="date" style={{ width: '100%', padding: '0.8rem 2.5rem 0.8rem 0.8rem', borderRadius: '8px', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', colorScheme: 'dark' }} />
              </div>
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', color: 'rgba(255,255,255,0.8)' }}>الوقت</label>
              <div style={{ position: 'relative' }}>
                <Clock size={20} color="rgba(255,255,255,0.4)" style={{ position: 'absolute', top: '50%', right: '1rem', transform: 'translateY(-50%)' }} />
                <input required type="time" style={{ width: '100%', padding: '0.8rem 2.5rem 0.8rem 0.8rem', borderRadius: '8px', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', colorScheme: 'dark' }} />
              </div>
            </div>
          </div>

          <button type="submit" disabled={loading} className="btn btn-solid" style={{ marginTop: '1rem', padding: '1rem', fontSize: '1.1rem', width: '100%', background: '#f43f5e' }}>
            <PlusCircle size={20} style={{ display: 'inline', verticalAlign: 'middle', marginLeft: '0.5rem' }} />
            {loading ? 'جاري الجدولة...' : 'جدولة البث الآن'}
          </button>
        </form>
      </div>
    </div>
  );
}
