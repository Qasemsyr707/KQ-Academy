'use client';

import Link from 'next/link';

export default function ParentDashboardFeature() {
  return (
    <div className="container">
      <nav className="nav">
        <Link href="/">العودة للرئيسية</Link>
        <Link href="/features/community">الميزة التالية ➡️</Link>
      </nav>

      <div className="glass-card" style={{ maxWidth: '1000px', margin: '0 auto' }}>
        <h2 className="feature-title">📊 لوحة تحكم أولياء الأمور</h2>
        <p style={{ marginBottom: '2rem', opacity: 0.8 }}>
          منصة لمتابعة تقدم الأبناء، الدرجات، ونسبة الحضور بشكل فوري مع إشعارات ذكية.
        </p>

        <div className="grid">
          {/* Student Profile Card */}
          <div style={{ background: 'var(--secondary)', padding: '1.5rem', borderRadius: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
              <div style={{ width: '60px', height: '60px', borderRadius: '50%', background: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem' }}>👨‍🎓</div>
              <div>
                <h3>أحمد محمد</h3>
                <p style={{ color: 'var(--success)' }}>الصف العاشر</p>
              </div>
            </div>
            <p><strong>آخر دخول:</strong> منذ ساعتين</p>
            <p><strong>الوقت المستغرق اليوم:</strong> 3 ساعات</p>
          </div>

          {/* Progress Card */}
          <div style={{ background: 'var(--secondary)', padding: '1.5rem', borderRadius: '12px' }}>
            <h3 style={{ marginBottom: '1rem' }}>التقدم العام</h3>
            <div style={{ marginBottom: '1rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                <span>الرياضيات</span>
                <span>85%</span>
              </div>
              <div style={{ width: '100%', background: 'var(--glass)', height: '8px', borderRadius: '4px' }}>
                <div style={{ width: '85%', background: 'var(--primary)', height: '100%', borderRadius: '4px' }}></div>
              </div>
            </div>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                <span>الفيزياء</span>
                <span>60%</span>
              </div>
              <div style={{ width: '100%', background: 'var(--glass)', height: '8px', borderRadius: '4px' }}>
                <div style={{ width: '60%', background: 'var(--warning)', height: '100%', borderRadius: '4px' }}></div>
              </div>
            </div>
          </div>

          {/* Alerts Card */}
          <div style={{ background: 'var(--secondary)', padding: '1.5rem', borderRadius: '12px', gridColumn: '1 / -1' }}>
            <h3 style={{ marginBottom: '1rem' }}>الإشعارات الذكية (COPPA Compliant)</h3>
            <ul style={{ listStyle: 'none', padding: 0 }}>
              <li style={{ padding: '1rem', borderLeft: '4px solid var(--warning)', background: 'var(--glass)', marginBottom: '0.5rem', borderRadius: '0 8px 8px 0' }}>
                ⚠️ <strong>تنبيه:</strong> انخفض أداء أحمد في مادة الفيزياء في آخر اختبارين. يقترح المساعد الذكي حجز حصة مراجعة.
              </li>
              <li style={{ padding: '1rem', borderLeft: '4px solid var(--success)', background: 'var(--glass)', borderRadius: '0 8px 8px 0' }}>
                ✅ <strong>إنجاز:</strong> لقد أكمل أحمد دورة "مقدمة في البرمجة" بنجاح بتقدير ممتاز.
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
