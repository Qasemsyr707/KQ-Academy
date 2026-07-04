'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Trophy, Star, Medal, Award, Crown, TrendingUp, Zap } from 'lucide-react';
import Link from 'next/link';

export default function GamificationPage() {
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [myStats, setMyStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [awarding, setAwarding] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [lbRes, meRes] = await Promise.all([
        fetch('/api/gamification/leaderboard'),
        fetch('/api/gamification/me')
      ]);
      
      if (lbRes.ok) {
        const lbData = await lbRes.json();
        setLeaderboard(lbData.leaderboard || []);
      }
      
      if (meRes.ok) {
        const meData = await meRes.json();
        setMyStats(meData);
      }
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  const handleEarnPoints = async () => {
    setAwarding(true);
    try {
      const res = await fetch('/api/gamification/award', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'DAILY_LOGIN' })
      });
      if (res.ok) {
        await fetchData();
      }
    } catch (e) {
      console.error(e);
    }
    setAwarding(false);
  };

  const getRankColor = (index: number) => {
    if (index === 0) return 'linear-gradient(135deg, #FFD700 0%, #D4AF37 100%)'; // Gold
    if (index === 1) return 'linear-gradient(135deg, #E0E0E0 0%, #BDBDBD 100%)'; // Silver
    if (index === 2) return 'linear-gradient(135deg, #CD7F32 0%, #A0522D 100%)'; // Bronze
    return 'rgba(255,255,255,0.05)';
  };

  const getRankIcon = (index: number) => {
    if (index === 0) return <Crown size={24} color="#000" />;
    if (index === 1) return <Medal size={24} color="#000" />;
    if (index === 2) return <Award size={24} color="#000" />;
    return <span style={{ fontSize: '1.2rem', fontWeight: 'bold', color: 'rgba(255,255,255,0.5)' }}>{index + 1}</span>;
  };

  return (
    <div style={{ minHeight: '100vh', background: '#050505', color: '#fff', padding: '4rem 2rem', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
        
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '4rem' }}>
          <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring' }} style={{ width: '80px', height: '80px', background: 'rgba(203, 161, 83, 0.1)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem auto' }}>
            <Trophy size={40} color="var(--primary)" />
          </motion.div>
          <h1 style={{ fontSize: '3rem', fontWeight: 'bold', marginBottom: '1rem', background: 'linear-gradient(to right, #fff, var(--primary))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            لوحة الشرف والتحديات
          </h1>
          <p style={{ fontSize: '1.2rem', color: 'rgba(255,255,255,0.6)', maxWidth: '600px', margin: '0 auto' }}>
            تنافس مع زملائك، اجمع النقاط، وافتح الأوسمة من خلال إتمام الكورسات والمشاركة الفعالة.
          </p>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '4rem', color: 'rgba(255,255,255,0.5)' }}>جاري التحميل...</div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem' }}>
            
            {/* My Stats Panel */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
              <div style={{ background: '#111', padding: '2rem', borderRadius: '24px', border: '1px solid rgba(255,255,255,0.05)', position: 'relative', overflow: 'hidden' }}>
                {/* Glow effect */}
                <div style={{ position: 'absolute', top: '-50px', right: '-50px', width: '150px', height: '150px', background: 'var(--primary)', filter: 'blur(100px)', opacity: 0.2, borderRadius: '50%' }} />
                
                <h3 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '2rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <TrendingUp color="var(--primary)" /> إحصائياتي
                </h3>
                
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2rem', background: 'rgba(255,255,255,0.02)', padding: '1.5rem', borderRadius: '16px' }}>
                  <div style={{ textAlign: 'center' }}>
                    <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.9rem', marginBottom: '0.5rem' }}>النقاط الحالية</p>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '2rem', fontWeight: 'bold', color: 'var(--primary)' }}>
                      <Star size={24} fill="var(--primary)" />
                      {myStats?.points || 0}
                    </div>
                  </div>
                  
                  <div style={{ width: '1px', height: '50px', background: 'rgba(255,255,255,0.1)' }} />
                  
                  <div style={{ textAlign: 'center' }}>
                    <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.9rem', marginBottom: '0.5rem' }}>المرتبة</p>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '2rem', fontWeight: 'bold', color: '#fff' }}>
                      <Trophy size={24} />
                      {myStats?.rank || '-'}
                    </div>
                  </div>
                </div>

                <div style={{ marginBottom: '2rem' }}>
                  <h4 style={{ fontSize: '1.1rem', fontWeight: 'bold', marginBottom: '1rem' }}>أوسمتي</h4>
                  {myStats?.badges?.length > 0 ? (
                    <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                      {myStats.badges.map((badge: any) => (
                        <div key={badge.id} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem', background: 'rgba(255,255,255,0.02)', padding: '1rem', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)', width: '100px' }}>
                          <span style={{ fontSize: '2rem' }}>{badge.icon}</span>
                          <span style={{ fontSize: '0.8rem', textAlign: 'center' }}>{badge.name}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.9rem', textAlign: 'center', padding: '2rem', background: 'rgba(255,255,255,0.02)', borderRadius: '12px' }}>
                      لم تحصل على أي وسام بعد.<br/>أكمل الكورسات لتبدأ بجمع الأوسمة!
                    </p>
                  )}
                </div>

                <button 
                  onClick={handleEarnPoints}
                  disabled={awarding}
                  style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', background: 'var(--primary)', color: '#000', padding: '1rem', borderRadius: '12px', fontWeight: 'bold', border: 'none', cursor: 'pointer', transition: 'transform 0.2s' }}
                  className="hover:scale-[1.02]"
                >
                  <Zap size={20} /> {awarding ? 'جاري الإضافة...' : 'اضغط للحصول على 5 نقاط يومية'}
                </button>
              </div>
            </div>

            {/* Leaderboard Panel */}
            <div style={{ background: '#111', padding: '2rem', borderRadius: '24px', border: '1px solid rgba(255,255,255,0.05)' }}>
              <h3 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '2rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Crown color="var(--primary)" /> قائمة الأوائل
              </h3>

              {leaderboard.length === 0 ? (
                <div style={{ textAlign: 'center', color: 'rgba(255,255,255,0.5)', padding: '2rem' }}>لا يوجد متصدرين بعد.</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  {leaderboard.map((user, index) => {
                    const isTop3 = index < 3;
                    return (
                      <motion.div 
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.1 }}
                        key={user.id} 
                        style={{ 
                          display: 'flex', 
                          alignItems: 'center', 
                          justifyContent: 'space-between', 
                          background: getRankColor(index), 
                          padding: '1rem 1.5rem', 
                          borderRadius: '16px',
                          border: isTop3 ? 'none' : '1px solid rgba(255,255,255,0.05)',
                          color: isTop3 ? '#000' : '#fff'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                          <div style={{ width: '40px', height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            {getRankIcon(index)}
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                            <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: isTop3 ? 'rgba(0,0,0,0.1)' : 'rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                              {user.image ? (
                                <img src={user.image} alt={user.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                              ) : (
                                <span style={{ fontWeight: 'bold', fontSize: '1.2rem' }}>{user.name.charAt(0)}</span>
                              )}
                            </div>
                            <span style={{ fontWeight: 'bold', fontSize: '1.1rem' }}>{user.name} {user.id === myStats?.id && "(أنت)"}</span>
                          </div>
                        </div>
                        
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 'bold', fontSize: '1.2rem' }}>
                          <Star size={20} fill={isTop3 ? "#000" : "var(--primary)"} color={isTop3 ? "#000" : "var(--primary)"} />
                          {user.points}
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </div>

          </div>
        )}
      </div>
      
      <style jsx global>{`
        .hover\\:scale-\\[1\\.02\\]:hover { transform: scale(1.02); }
      `}</style>
    </div>
  );
}
