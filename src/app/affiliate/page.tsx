'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Copy, CheckCircle, TrendingUp, Users, DollarSign, Share2, Wallet, Clock, ArrowUpRight } from 'lucide-react';

export default function AffiliatePage() {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [claiming, setClaiming] = useState(false);
  const [claimMsg, setClaimMsg] = useState('');

  useEffect(() => {
    fetch('/api/affiliate/stats')
      .then(r => r.json())
      .then(d => { setStats(d); setLoading(false); });
  }, []);

  const copyLink = () => {
    navigator.clipboard.writeText(stats?.referralLink || '');
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const claimEarnings = async () => {
    setClaiming(true);
    const res = await fetch('/api/affiliate/claim', { method: 'POST' });
    const data = await res.json();
    setClaimMsg(res.ok ? data.message : data.error);
    if (res.ok) {
      const updated = await fetch('/api/affiliate/stats').then(r => r.json());
      setStats(updated);
    }
    setClaiming(false);
    setTimeout(() => setClaimMsg(''), 4000);
  };

  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#050505' }}>
      <div style={{ width: 50, height: 50, border: '3px solid rgba(255,255,255,0.1)', borderTopColor: '#CBA153', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  const statCards = [
    { icon: Users, label: 'إجمالي الإحالات', value: stats?.totalReferrals || 0, color: '#3b82f6', suffix: 'شخص' },
    { icon: DollarSign, label: 'إجمالي الأرباح', value: `$${(stats?.totalEarned || 0).toFixed(2)}`, color: '#22c55e', suffix: '' },
    { icon: Clock, label: 'أرباح معلقة', value: `$${(stats?.pendingEarnings || 0).toFixed(2)}`, color: '#CBA153', suffix: '' },
    { icon: Wallet, label: 'تم صرفها', value: `$${(stats?.paidEarnings || 0).toFixed(2)}`, color: '#a855f7', suffix: '' },
  ];

  return (
    <div style={{ minHeight: '100vh', background: '#050505', color: '#fff', padding: '2rem 5%' }}>
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} style={{ maxWidth: '1100px', margin: '0 auto' }}>

        {/* Header */}
        <div style={{ marginBottom: '3rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '0.5rem' }}>
            <Share2 color="#CBA153" size={32} />
            <h1 style={{ fontSize: '2.5rem', fontWeight: 900, margin: 0 }}>برنامج الإحالة</h1>
          </div>
          <p style={{ color: 'rgba(255,255,255,0.5)', margin: 0 }}>
            شارك رابطك الخاص واكسب <strong style={{ color: '#CBA153' }}>10%</strong> عمولة عن كل عملية شراء يقوم بها أصدقاؤك!
          </p>
        </div>

        {/* Referral Link Box */}
        <motion.div
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          style={{ background: 'linear-gradient(135deg, rgba(203,161,83,0.1), rgba(203,161,83,0.05))', border: '1px solid rgba(203,161,83,0.3)', borderRadius: '20px', padding: '2rem', marginBottom: '2rem' }}
        >
          <p style={{ margin: '0 0 1rem', color: 'rgba(255,255,255,0.7)', fontWeight: 'bold' }}>🔗 رابط الإحالة الخاص بك</p>
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
            <div style={{ flex: 1, background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', padding: '1rem 1.5rem', fontFamily: 'monospace', fontSize: '0.95rem', color: '#CBA153', minWidth: '200px', wordBreak: 'break-all' }}>
              {stats?.referralLink}
            </div>
            <button onClick={copyLink} style={{ padding: '1rem 2rem', background: copied ? '#22c55e' : '#CBA153', color: '#000', border: 'none', borderRadius: '12px', cursor: 'pointer', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '0.5rem', whiteSpace: 'nowrap', transition: 'background 0.3s' }}>
              {copied ? <CheckCircle size={18} /> : <Copy size={18} />}
              {copied ? 'تم النسخ!' : 'نسخ الرابط'}
            </button>
          </div>
          <p style={{ margin: '1rem 0 0', fontSize: '0.85rem', color: 'rgba(255,255,255,0.4)' }}>
            كود الإحالة: <code style={{ color: '#CBA153', background: 'rgba(0,0,0,0.3)', padding: '0.2rem 0.5rem', borderRadius: '4px' }}>{stats?.affiliateCode}</code>
          </p>
        </motion.div>

        {/* Stats Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
          {statCards.map((card, i) => (
            <motion.div key={i} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}
              style={{ background: 'rgba(255,255,255,0.03)', border: `1px solid ${card.color}30`, borderRadius: '16px', padding: '1.5rem' }}>
              <card.icon color={card.color} size={24} style={{ marginBottom: '0.75rem' }} />
              <div style={{ fontSize: '2rem', fontWeight: 900, color: card.color }}>{card.value} <span style={{ fontSize: '0.9rem', opacity: 0.7 }}>{card.suffix}</span></div>
              <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.9rem', marginTop: '0.25rem' }}>{card.label}</div>
            </motion.div>
          ))}
        </div>

        {/* Claim Earnings CTA */}
        {(stats?.pendingEarnings || 0) > 0 && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            style={{ background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.3)', borderRadius: '16px', padding: '1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem', marginBottom: '2rem' }}>
            <div>
              <p style={{ margin: 0, fontWeight: 'bold', fontSize: '1.1rem' }}>💰 لديك أرباح معلقة!</p>
              <p style={{ margin: '0.25rem 0 0', color: 'rgba(255,255,255,0.5)', fontSize: '0.9rem' }}>اضغط لتحويل أرباحك إلى محفظتك الداخلية فوراً</p>
            </div>
            <button onClick={claimEarnings} disabled={claiming}
              style={{ padding: '0.875rem 2rem', background: '#22c55e', color: '#000', border: 'none', borderRadius: '12px', cursor: 'pointer', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '0.5rem', opacity: claiming ? 0.7 : 1 }}>
              <ArrowUpRight size={18} />
              {claiming ? 'جاري التحويل...' : `تحويل $${(stats?.pendingEarnings || 0).toFixed(2)} للمحفظة`}
            </button>
          </motion.div>
        )}

        {claimMsg && (
          <div style={{ background: 'rgba(34,197,94,0.1)', border: '1px solid #22c55e', borderRadius: '12px', padding: '1rem 1.5rem', marginBottom: '2rem', color: '#22c55e' }}>
            ✅ {claimMsg}
          </div>
        )}

        {/* Referrals Table */}
        {stats?.referrals?.length > 0 && (
          <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '16px', overflow: 'hidden' }}>
            <div style={{ padding: '1.5rem', borderBottom: '1px solid rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <Users color="#3b82f6" size={20} />
              <h3 style={{ margin: 0 }}>أشخاص انضموا عبر رابطك</h3>
            </div>
            <div style={{ overflow: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                    <th style={{ padding: '1rem 1.5rem', textAlign: 'right', color: 'rgba(255,255,255,0.5)', fontWeight: 'normal', fontSize: '0.875rem' }}>الاسم</th>
                    <th style={{ padding: '1rem 1.5rem', textAlign: 'right', color: 'rgba(255,255,255,0.5)', fontWeight: 'normal', fontSize: '0.875rem' }}>تاريخ الانضمام</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.referrals.map((r: any) => (
                    <tr key={r.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                      <td style={{ padding: '1rem 1.5rem' }}>{r.name}</td>
                      <td style={{ padding: '1rem 1.5rem', color: 'rgba(255,255,255,0.5)', fontSize: '0.875rem' }}>
                        {new Date(r.createdAt).toLocaleDateString('ar-EG')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* How it works */}
        <div style={{ marginTop: '3rem', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem' }}>
          {[
            { step: '١', title: 'انسخ رابطك', desc: 'انسخ الرابط الخاص بك أعلاه وشاركه مع أصدقائك عبر أي وسيلة.' },
            { step: '٢', title: 'صديقك يشتري', desc: 'عندما ينضم صديقك عبر رابطك ويشتري أي كورس أو حزمة.' },
            { step: '٣', title: 'اكسب 10%', desc: 'تحصل فوراً على 10% من قيمة كل عملية شراء في رصيد إحالتك.' },
            { step: '٤', title: 'اسحب للمحفظة', desc: 'حوّل أرباحك إلى محفظتك الداخلية متى أردت واستخدمها للشراء أو السحب.' },
          ].map((item, i) => (
            <motion.div key={i} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 + i * 0.1 }}
              style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '16px', padding: '1.5rem', textAlign: 'center' }}>
              <div style={{ width: 40, height: 40, background: 'rgba(203,161,83,0.15)', border: '1px solid rgba(203,161,83,0.3)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem', color: '#CBA153', fontWeight: 'bold', fontSize: '1.1rem' }}>{item.step}</div>
              <h4 style={{ margin: '0 0 0.5rem', fontWeight: 'bold' }}>{item.title}</h4>
              <p style={{ margin: 0, color: 'rgba(255,255,255,0.5)', fontSize: '0.875rem', lineHeight: 1.6 }}>{item.desc}</p>
            </motion.div>
          ))}
        </div>

      </motion.div>
    </div>
  );
}
