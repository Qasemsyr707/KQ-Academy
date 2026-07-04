'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Trophy, Crown, Medal, Award, Star, Zap, TrendingUp, Users, Globe } from 'lucide-react';
import Link from 'next/link';

export default function LeaderboardPage() {
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [myStats, setMyStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [awarding, setAwarding] = useState(false);
  const [activeFilter, setActiveFilter] = useState<'national' | 'weekly'>('national');

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
      if (res.ok) await fetchData();
    } catch (e) {}
    setAwarding(false);
  };

  const getRankStyle = (i: number) => {
    if (i === 0) return { bg: 'linear-gradient(135deg, #FFD700, #D4AF37)', color: '#000', shadow: '0 8px 30px rgba(255,215,0,0.3)' };
    if (i === 1) return { bg: 'linear-gradient(135deg, #C0C0C0, #9E9E9E)', color: '#000', shadow: '0 8px 30px rgba(192,192,192,0.2)' };
    if (i === 2) return { bg: 'linear-gradient(135deg, #CD7F32, #A0522D)', color: '#000', shadow: '0 8px 30px rgba(205,127,50,0.2)' };
    return { bg: '#111', color: '#fff', shadow: 'none' };
  };

  const getRankIcon = (i: number) => {
    if (i === 0) return <Crown size={22} color="#000" />;
    if (i === 1) return <Medal size={22} color="#000" />;
    if (i === 2) return <Award size={22} color="#000" />;
    return <span style={{ fontSize: '1.1rem', fontWeight: 'bold', color: 'rgba(255,255,255,0.4)' }}>{i + 1}</span>;
  };

  return (
    <div style={{ minHeight: '100vh', background: '#050505', color: '#fff', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      
      {/* Hero Banner */}
      <div style={{
        background: 'linear-gradient(135deg, rgba(203,161,83,0.12) 0%, rgba(0,0,0,0) 60%)',
        borderBottom: '1px solid rgba(203,161,83,0.1)',
        padding: '4rem 2rem 3rem',
        textAlign: 'center',
        position: 'relative',
        overflow: 'hidden'
      }}>
        {/* Decorative glow */}
        <div style={{ position: 'absolute', top: '-80px', left: '50%', transform: 'translateX(-50%)', width: '500px', height: '300px', background: 'radial-gradient(circle, rgba(203,161,83,0.15) 0%, transparent 70%)', pointerEvents: 'none' }} />
        
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 200 }}
          style={{ width: '90px', height: '90px', background: 'rgba(203,161,83,0.12)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem auto', border: '1px solid rgba(203,161,83,0.3)', boxShadow: '0 0 40px rgba(203,161,83,0.2)' }}
        >
          <Trophy size={44} color="var(--primary)" />
        </motion.div>

        <h1 style={{ fontSize: '3rem', fontWeight: 'bold', marginBottom: '0.75rem', background: 'linear-gradient(to right, #fff 30%, var(--primary))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
          🏆 أوائل القطر
        </h1>
        <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '1.1rem', maxWidth: '550px', margin: '0 auto 2.5rem auto', lineHeight: 1.6 }}>
          تنافس مع أفضل الطلاب على مستوى سوريا، اجمع النقاط، وافتح الأوسمة الحصرية من خلال الدراسة والمشاركة.
        </p>

        {/* Stats row */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: '3rem', flexWrap: 'wrap' }}>
          {[
            { icon: <Users size={20} />, label: 'طالب مشارك', value: leaderboard.length || '---' },
            { icon: <Globe size={20} />, label: 'محافظة سورية', value: 14 },
            { icon: <Zap size={20} />, label: 'نقطة تمنح يومياً', value: 5 },
          ].map((stat, i) => (
            <div key={i} style={{ textAlign: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', justifyContent: 'center', color: 'var(--primary)', marginBottom: '0.3rem' }}>
                {stat.icon}
                <span style={{ fontSize: '2rem', fontWeight: 'bold' }}>{stat.value}</span>
              </div>
              <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.9rem' }}>{stat.label}</div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '3rem 2rem', display: 'grid', gridTemplateColumns: '1fr 380px', gap: '2rem', alignItems: 'start' }}>
        
        {/* Leaderboard List */}
        <div>
          {/* Filter tabs */}
          <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '2rem', background: 'rgba(255,255,255,0.04)', padding: '0.5rem', borderRadius: '14px', width: 'fit-content' }}>
            {[
              { id: 'national', label: '🇸🇾 ترتيب قطري' },
              { id: 'weekly', label: '📅 أوائل الأسبوع' },
            ].map(tab => (
              <button key={tab.id} onClick={() => setActiveFilter(tab.id as any)} style={{ padding: '0.6rem 1.4rem', borderRadius: '10px', border: 'none', background: activeFilter === tab.id ? 'rgba(255,255,255,0.12)' : 'transparent', color: '#fff', fontWeight: 'bold', cursor: 'pointer', transition: 'all 0.2s', fontSize: '0.95rem' }}>
                {tab.label}
              </button>
            ))}
          </div>

          {loading ? (
            <div style={{ textAlign: 'center', padding: '4rem', color: 'rgba(255,255,255,0.4)' }}>
              <div style={{ width: '40px', height: '40px', borderRadius: '50%', border: '3px solid rgba(255,255,255,0.1)', borderTopColor: 'var(--primary)', animation: 'spin 1s linear infinite', margin: '0 auto 1rem auto' }} />
              جاري تحميل قائمة الأوائل...
            </div>
          ) : leaderboard.length === 0 ? (
            <div style={{ background: '#111', borderRadius: '24px', padding: '4rem 2rem', textAlign: 'center', border: '1px solid rgba(255,255,255,0.05)' }}>
              <Trophy size={64} color="rgba(255,255,255,0.1)" style={{ marginBottom: '1.5rem' }} />
              <h3 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '0.75rem' }}>القائمة فارغة حتى الآن!</h3>
              <p style={{ color: 'rgba(255,255,255,0.5)', marginBottom: '2rem' }}>كن أول من يصعد إلى قمة الترتيب.</p>
              <button onClick={handleEarnPoints} disabled={awarding} style={{ background: 'var(--primary)', color: '#000', border: 'none', padding: '0.8rem 2rem', borderRadius: '12px', fontWeight: 'bold', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
                <Zap size={18} /> {awarding ? 'جاري...' : 'احصل على 5 نقاط الآن'}
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {leaderboard.map((user, i) => {
                const style = getRankStyle(i);
                const isTop3 = i < 3;
                return (
                  <motion.div
                    key={user.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.05 }}
                    style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      background: style.bg, color: style.color,
                      padding: isTop3 ? '1.2rem 1.5rem' : '1rem 1.5rem',
                      borderRadius: isTop3 ? '20px' : '14px',
                      border: isTop3 ? 'none' : '1px solid rgba(255,255,255,0.06)',
                      boxShadow: style.shadow,
                      transform: i === 0 ? 'scale(1.02)' : 'scale(1)',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                      <div style={{ width: '38px', display: 'flex', justifyContent: 'center' }}>
                        {getRankIcon(i)}
                      </div>
                      <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: isTop3 ? 'rgba(0,0,0,0.15)' : 'rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', flexShrink: 0 }}>
                        {user.image
                          ? <img src={user.image} alt={user.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          : <span style={{ fontWeight: 'bold', fontSize: '1.2rem' }}>{user.name?.charAt(0)}</span>
                        }
                      </div>
                      <div>
                        <div style={{ fontWeight: 'bold', fontSize: '1.05rem' }}>
                          {user.name} {user.id === myStats?.id && <span style={{ fontSize: '0.8rem', opacity: 0.7 }}>(أنت)</span>}
                        </div>
                        {isTop3 && <div style={{ fontSize: '0.8rem', opacity: 0.7 }}>متصدر الترتيب</div>}
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 'bold', fontSize: '1.3rem' }}>
                      <Star size={18} fill={isTop3 ? '#000' : 'var(--primary)'} color={isTop3 ? '#000' : 'var(--primary)'} />
                      {user.points}
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>

        {/* My Stats Sidebar */}
        <div style={{ position: 'sticky', top: '2rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          
          <div style={{ background: '#111', padding: '2rem', borderRadius: '24px', border: '1px solid rgba(255,255,255,0.07)', position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', top: '-40px', right: '-40px', width: '120px', height: '120px', background: 'var(--primary)', filter: 'blur(80px)', opacity: 0.15, borderRadius: '50%' }} />
            
            <h3 style={{ fontWeight: 'bold', fontSize: '1.2rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <TrendingUp size={20} color="var(--primary)" /> إحصائياتي
            </h3>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
              <div style={{ background: 'rgba(255,255,255,0.04)', padding: '1.2rem', borderRadius: '14px', textAlign: 'center' }}>
                <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.8rem', marginBottom: '0.4rem' }}>نقاطي</div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.3rem', fontSize: '1.8rem', fontWeight: 'bold', color: 'var(--primary)' }}>
                  <Star size={20} fill="var(--primary)" /> {myStats?.points ?? 0}
                </div>
              </div>
              <div style={{ background: 'rgba(255,255,255,0.04)', padding: '1.2rem', borderRadius: '14px', textAlign: 'center' }}>
                <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.8rem', marginBottom: '0.4rem' }}>مرتبتي</div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.3rem', fontSize: '1.8rem', fontWeight: 'bold' }}>
                  <Trophy size={20} /> {myStats?.rank ?? '-'}
                </div>
              </div>
            </div>

            <button
              onClick={handleEarnPoints}
              disabled={awarding}
              style={{ width: '100%', padding: '0.9rem', background: 'var(--primary)', color: '#000', border: 'none', borderRadius: '14px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', fontSize: '1rem', opacity: awarding ? 0.7 : 1, transition: 'all 0.2s' }}
            >
              <Zap size={18} fill="#000" /> {awarding ? 'جاري الإضافة...' : 'احصل على نقاط يومية'}
            </button>
          </div>

          {/* Badges */}
          <div style={{ background: '#111', padding: '1.5rem', borderRadius: '20px', border: '1px solid rgba(255,255,255,0.07)' }}>
            <h4 style={{ fontWeight: 'bold', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              🏅 أوسمتي
            </h4>
            {myStats?.badges?.length > 0 ? (
              <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                {myStats.badges.map((badge: any) => (
                  <div key={badge.id} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.4rem', background: 'rgba(255,255,255,0.04)', padding: '0.8rem', borderRadius: '12px', width: '80px', border: '1px solid rgba(255,255,255,0.06)' }}>
                    <span style={{ fontSize: '1.8rem' }}>{badge.icon}</span>
                    <span style={{ fontSize: '0.75rem', textAlign: 'center', color: 'rgba(255,255,255,0.7)' }}>{badge.name}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.9rem', textAlign: 'center', padding: '1.5rem 0' }}>
                أكمل الكورسات لتحصل على أوسمة ✨
              </p>
            )}
          </div>

        </div>
      </div>

      <style dangerouslySetInnerHTML={{__html: `
        @keyframes spin { to { transform: rotate(360deg); } }
      `}} />
    </div>
  );
}
