'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Video, Calendar, Clock, Radio, Users, ChevronRight } from 'lucide-react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';

export default function LiveStreamsPage() {
  const router = useRouter();
  const [streams, setStreams] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/live/create')
      .then(res => res.json())
      .then(data => {
        if (data.liveClasses) setStreams(data.liveClasses);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  return (
    <div style={{ minHeight: '100vh', background: '#050505', color: '#fff', direction: 'rtl', fontFamily: "'Cairo', sans-serif" }}>
      <Navbar />
      <style>{`
        .live-page { max-width: 1200px; margin: 0 auto; padding: 120px 24px 80px; }
        .stream-card { background: #0a0a0a; border: 1px solid rgba(255,255,255,0.07); border-radius: 20px; overflow: hidden; transition: all 0.3s; position: relative; }
        .stream-card:hover { transform: translateY(-4px); border-color: rgba(203,161,83,0.4); box-shadow: 0 20px 40px rgba(0,0,0,0.4); }
        .stream-thumb { width: 100%; height: 200px; background: #111; position: relative; }
        .stream-thumb img { width: 100%; height: 100%; object-fit: cover; }
        .status-badge { position: absolute; top: 16px; right: 16px; padding: 6px 14px; border-radius: 999px; font-size: 0.85rem; font-weight: bold; display: flex; align-items: center; gap: 6px; backdrop-filter: blur(10px); }
        .status-live { background: rgba(239,68,68,0.2); color: #ef4444; border: 1px solid rgba(239,68,68,0.4); }
        .status-scheduled { background: rgba(203,161,83,0.2); color: var(--primary); border: 1px solid rgba(203,161,83,0.4); }
        .stream-content { padding: 24px; }
        .instructor-info { display: flex; alignItems: center; gap: 12px; margin-bottom: 16px; }
        .instructor-img { width: 40px; height: 40px; borderRadius: 50%; object-fit: cover; }
        .btn-join { width: 100%; padding: 14px; border-radius: 12px; border: none; font-family: inherit; font-weight: bold; font-size: 1rem; cursor: pointer; transition: all 0.3s; display: flex; align-items: center; justify-content: center; gap: 8px; margin-top: 24px; }
        .btn-join-live { background: #ef4444; color: #fff; }
        .btn-join-live:hover { background: #dc2626; transform: translateY(-2px); box-shadow: 0 10px 20px rgba(239,68,68,0.3); }
        .btn-join-scheduled { background: rgba(255,255,255,0.05); color: #fff; border: 1px solid rgba(255,255,255,0.1); cursor: not-allowed; }
      `}</style>

      <div className="live-page">
        <div style={{ marginBottom: '48px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: '20px' }}>
          <div>
            <h1 style={{ fontSize: 'clamp(2rem, 4vw, 3rem)', fontWeight: 900, marginBottom: '12px' }}>البث <span style={{ color: 'var(--primary)' }}>المباشر</span></h1>
            <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '1.1rem', maxWidth: '600px' }}>احضر المحاضرات المباشرة وتفاعل مع المدربين في الوقت الفعلي للكورسات التي تشترك بها.</p>
          </div>
        </div>

        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '100px 0' }}>
            <div style={{ width: '40px', height: '40px', borderRadius: '50%', border: '3px solid rgba(203,161,83,0.3)', borderTopColor: 'var(--primary)', animation: 'spin 1s linear infinite' }} />
          </div>
        ) : streams.length === 0 ? (
          <div style={{ background: '#0a0a0a', border: '1px dashed rgba(255,255,255,0.1)', borderRadius: '24px', padding: '60px 24px', textAlign: 'center' }}>
            <Radio size={48} color="rgba(255,255,255,0.2)" style={{ margin: '0 auto 20px' }} />
            <h3 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '12px' }}>لا توجد بثوث حالياً</h3>
            <p style={{ color: 'rgba(255,255,255,0.5)' }}>لم يقم المدربون بجدولة أو بدء أي بث مباشر في الكورسات الخاصة بك حتى الآن.</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '24px' }}>
            {streams.map(stream => (
              <div key={stream.id} className="stream-card">
                <div className="stream-thumb">
                  {stream.thumbnail ? (
                    <img src={stream.thumbnail} alt={stream.title} />
                  ) : (
                    <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(45deg, #0a0a0a, #1a1a1a)' }}>
                      <Video size={48} color="rgba(255,255,255,0.1)" />
                    </div>
                  )}
                  <div className={`status-badge ${stream.status === 'live' ? 'status-live' : 'status-scheduled'}`}>
                    {stream.status === 'live' ? (
                      <><div style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'currentColor', animation: 'pulse 1.5s infinite' }} /> مباشر الآن</>
                    ) : (
                      <><Calendar size={14} /> مجدول</>
                    )}
                  </div>
                </div>
                
                <div className="stream-content">
                  <div className="instructor-info">
                    {stream.instructor.image ? (
                      <img src={stream.instructor.image} className="instructor-img" alt={stream.instructor.name} />
                    ) : (
                      <div className="instructor-img" style={{ background: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#000', fontWeight: 'bold' }}>
                        {stream.instructor.name[0]}
                      </div>
                    )}
                    <div>
                      <div style={{ fontWeight: 'bold', fontSize: '0.9rem' }}>{stream.instructor.name}</div>
                      <div style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.5)' }}>{stream.course.title}</div>
                    </div>
                  </div>

                  <h3 style={{ fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '8px', lineHeight: 1.4 }}>{stream.title}</h3>
                  {stream.description && <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.9rem', marginBottom: '16px', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{stream.description}</p>}

                  {stream.status === 'upcoming' && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--primary)', fontSize: '0.9rem', background: 'rgba(203,161,83,0.1)', padding: '8px 12px', borderRadius: '8px' }}>
                      <Clock size={16} />
                      {new Date(stream.scheduledAt).toLocaleString('ar-SA', { weekday: 'long', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </div>
                  )}

                  {stream.status === 'live' ? (
                    <button className="btn-join btn-join-live" onClick={() => router.push(`/live/room/${stream.id}`)}>
                      <Video size={18} /> انضم للبث الآن
                    </button>
                  ) : (
                    <button className="btn-join btn-join-scheduled" disabled>
                      بانتظار بدء البث <ChevronRight size={18} />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      <Footer />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}} @keyframes pulse{0%,100%{opacity:1}50%{opacity:0.5}}`}</style>
    </div>
  );
}
