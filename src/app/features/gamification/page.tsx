'use client';

import { useState, useEffect } from 'react';
import { Trophy, Coins, Award, ArrowDownToLine, Loader2, Star, Zap } from 'lucide-react';
import { motion } from 'framer-motion';

export default function GamificationPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [converting, setConverting] = useState(false);

  const fetchData = async () => {
    try {
      const res = await fetch('/api/wallet');
      if (res.ok) {
        const d = await res.json();
        setData(d);
      }
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleConvertPoints = async () => {
    const pointsToConvert = parseInt(prompt('كم نقطة تريد تحويلها إلى رصيد؟ (كل 100 نقطة = 1$)') || '0');
    if (isNaN(pointsToConvert) || pointsToConvert < 100) {
      alert('الرجاء إدخال رقم صحيح (100 نقطة على الأقل)');
      return;
    }

    setConverting(true);
    try {
      const res = await fetch('/api/wallet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pointsToConvert })
      });
      const resData = await res.json();
      if (res.ok) {
        alert(resData.message);
        fetchData();
      } else {
        alert(resData.error);
      }
    } catch (e) {
      alert('حدث خطأ');
    }
    setConverting(false);
  };

  if (loading) {
    return <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#050505', color: 'var(--primary)' }}><Loader2 className="animate-spin" size={40} /></div>;
  }

  if (!data || !data.user) {
    return <div style={{ textAlign: 'center', color: '#fff', marginTop: '4rem' }}>يجب تسجيل الدخول</div>;
  }

  const { user, transactions, badges } = data;
  const level = Math.floor(user.points / 500) + 1;
  const xpForNextLevel = level * 500;
  const progressPercent = ((user.points % 500) / 500) * 100;

  return (
    <div style={{ minHeight: '100vh', background: '#050505', color: '#fff', padding: '4rem 2rem' }}>
      <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '3rem' }}>
          <Trophy size={40} color="var(--primary)" />
          <h1 style={{ fontSize: '2.5rem', fontWeight: 'bold' }}>مركز الإنجازات والمحفظة</h1>
        </div>

        {/* Level and XP Section */}
        <div className="glass-card" style={{ padding: '2.5rem', borderRadius: '24px', marginBottom: '2rem', background: 'linear-gradient(135deg, rgba(203,161,83,0.1), rgba(10,10,10,0.9))' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <div style={{ width: '60px', height: '60px', borderRadius: '50%', background: 'var(--primary)', color: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem', fontWeight: 'bold' }}>
                {level}
              </div>
              <div>
                <h2 style={{ fontSize: '1.5rem', margin: 0 }}>المستوى {level}</h2>
                <p style={{ color: 'rgba(255,255,255,0.6)', margin: 0 }}>مبتدئ طموح</p>
              </div>
            </div>
            <div style={{ textAlign: 'left' }}>
              <h2 style={{ fontSize: '2rem', color: 'var(--primary)', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Zap size={24} /> {user.points} XP</h2>
              <p style={{ color: 'rgba(255,255,255,0.6)', margin: 0 }}>النقاط الحالية</p>
            </div>
          </div>
          
          <div style={{ width: '100%', height: '12px', background: 'rgba(0,0,0,0.5)', borderRadius: '10px', overflow: 'hidden' }}>
            <motion.div 
              initial={{ width: 0 }}
              animate={{ width: `${progressPercent}%` }}
              transition={{ duration: 1, delay: 0.5 }}
              style={{ height: '100%', background: 'var(--primary)', borderRadius: '10px' }}
            />
          </div>
          <p style={{ fontSize: '0.9rem', color: 'rgba(255,255,255,0.5)', marginTop: '0.5rem', textAlign: 'left' }}>
            باقي {xpForNextLevel - (user.points % 500)} نقطة للمستوى {level + 1}
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem' }}>
          
          {/* Wallet Section */}
          <div className="glass-card" style={{ padding: '2rem', borderRadius: '16px' }}>
            <h3 style={{ fontSize: '1.5rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Coins color="#10b981" /> محفظتي المالية
            </h3>
            
            <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem' }}>
              <div style={{ flex: 1, background: 'rgba(16, 185, 129, 0.1)', padding: '1.5rem', borderRadius: '12px', border: '1px solid rgba(16,185,129,0.2)' }}>
                <p style={{ color: '#10b981', margin: 0 }}>رصيد بالدولار</p>
                <h2 style={{ fontSize: '2rem', margin: 0 }}>${user.walletUSD.toLocaleString()}</h2>
              </div>
              <div style={{ flex: 1, background: 'rgba(255, 255, 255, 0.05)', padding: '1.5rem', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)' }}>
                <p style={{ color: 'rgba(255,255,255,0.6)', margin: 0 }}>رصيد محلي</p>
                <h2 style={{ fontSize: '1.5rem', margin: 0 }}>{user.walletSYP.toLocaleString()} ل.س</h2>
              </div>
            </div>

            <button 
              onClick={handleConvertPoints}
              disabled={converting || user.points < 100}
              className="btn btn-solid" 
              style={{ width: '100%', padding: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', fontSize: '1.1rem' }}
            >
              {converting ? <Loader2 className="animate-spin" /> : <><ArrowDownToLine /> تحويل النقاط (XP) إلى رصيد ($)</>}
            </button>
            <p style={{ textAlign: 'center', fontSize: '0.8rem', color: 'rgba(255,255,255,0.5)', marginTop: '1rem' }}>كل 100 نقطة (XP) = 1 دولار</p>
          </div>

          {/* Badges Section */}
          <div className="glass-card" style={{ padding: '2rem', borderRadius: '16px' }}>
            <h3 style={{ fontSize: '1.5rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Award color="#fbbf24" /> الشارات والأوسمة
            </h3>
            
            {badges.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '2rem', color: 'rgba(255,255,255,0.5)' }}>
                <Star size={40} style={{ opacity: 0.3, margin: '0 auto 1rem' }} />
                <p>لم تحصل على أي شارات بعد. استمر في إنجاز الكورسات والاختبارات!</p>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(80px, 1fr))', gap: '1rem' }}>
                {badges.map((badge: any) => (
                  <div key={badge.id} style={{ textAlign: 'center', background: 'rgba(255,255,255,0.05)', padding: '1rem 0.5rem', borderRadius: '12px', border: '1px solid rgba(251, 191, 36, 0.2)' }}>
                    <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>{badge.icon}</div>
                    <div style={{ fontSize: '0.8rem', fontWeight: 'bold' }}>{badge.name}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

      </div>
      <style jsx global>{`
        .animate-spin { animation: spin 1s linear infinite; }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
