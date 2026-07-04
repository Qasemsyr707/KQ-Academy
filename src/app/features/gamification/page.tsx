'use client';

import Link from 'next/link';

export default function GamificationFeature() {
  const leaderboard = [
    { rank: 1, name: 'أحمد محمود', points: 12500, badge: '🥇' },
    { rank: 2, name: 'سارة خالد', points: 11200, badge: '🥈' },
    { rank: 3, name: 'أنت', points: 9800, badge: '🥉', isCurrentUser: true },
    { rank: 4, name: 'يوسف العبدالله', points: 8500, badge: '🎓' },
    { rank: 5, name: 'مريم محمد', points: 8100, badge: '⭐' },
  ];

  return (
    <div className="container">
      <nav className="nav">
        <Link href="/">العودة للرئيسية</Link>
        <Link href="/features/live-class">الميزة التالية ➡️</Link>
      </nav>

      <div className="glass-card" style={{ maxWidth: '800px', margin: '0 auto' }}>
        <h2 className="feature-title">🏆 نظام التلعيب والمكافآت</h2>
        <p style={{ marginBottom: '2rem', opacity: 0.8 }}>
          تحويل العملية التعليمية إلى تجربة ممتعة من خلال النقاط ولوحة الصدارة على مستوى الدولة.
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem', marginBottom: '2rem' }}>
          <div style={{ background: 'var(--secondary)', padding: '2rem', borderRadius: '12px', textAlign: 'center' }}>
            <h3 style={{ color: 'var(--accent)', marginBottom: '1rem' }}>مستواك الحالي</h3>
            <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>💎</div>
            <h4>الفئة الماسية</h4>
            <p style={{ color: 'var(--success)', marginTop: '0.5rem' }}>9,800 نقطة</p>
          </div>

          <div style={{ background: 'var(--secondary)', padding: '2rem', borderRadius: '12px' }}>
            <h3 style={{ marginBottom: '1rem' }}>المهام اليومية</h3>
            <ul style={{ listStyle: 'none', padding: 0, display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
              <li style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>📖 اقرأ درسين</span>
                <span style={{ background: 'var(--success)', padding: '0.2rem 0.5rem', borderRadius: '4px', fontSize: '0.8rem' }}>مكتمل (+50)</span>
              </li>
              <li style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>🎯 أجب عن 10 أسئلة</span>
                <span style={{ background: 'var(--glass)', border: '1px solid var(--border)', padding: '0.2rem 0.5rem', borderRadius: '4px', fontSize: '0.8rem' }}>0/10 (+100)</span>
              </li>
              <li style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>🤝 ساعد زميلاً في المنتدى</span>
                <span style={{ background: 'var(--glass)', border: '1px solid var(--border)', padding: '0.2rem 0.5rem', borderRadius: '4px', fontSize: '0.8rem' }}>غير مكتمل (+30)</span>
              </li>
            </ul>
          </div>
        </div>

        <div style={{ background: 'var(--glass)', borderRadius: '12px', overflow: 'hidden' }}>
          <h3 style={{ padding: '1.5rem', borderBottom: '1px solid var(--border)' }}>لوحة الصدارة (هذا الأسبوع)</h3>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'right' }}>
            <thead>
              <tr style={{ background: 'rgba(255,255,255,0.05)' }}>
                <th style={{ padding: '1rem' }}>المركز</th>
                <th style={{ padding: '1rem' }}>الطالب</th>
                <th style={{ padding: '1rem' }}>النقاط</th>
              </tr>
            </thead>
            <tbody>
              {leaderboard.map((student) => (
                <tr key={student.rank} style={{ background: student.isCurrentUser ? 'rgba(59, 130, 246, 0.2)' : 'transparent', borderBottom: '1px solid var(--border)' }}>
                  <td style={{ padding: '1rem' }}>
                    <span style={{ fontSize: '1.5rem', marginRight: '0.5rem' }}>{student.badge}</span>
                    {student.rank}
                  </td>
                  <td style={{ padding: '1rem', fontWeight: student.isCurrentUser ? 'bold' : 'normal' }}>
                    {student.name}
                  </td>
                  <td style={{ padding: '1rem', color: 'var(--success)' }}>
                    {student.points.toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
