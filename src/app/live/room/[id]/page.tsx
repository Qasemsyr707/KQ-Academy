'use client';
import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { LiveKitRoom, VideoConference, RoomAudioRenderer, useRoomContext } from '@livekit/components-react';
import '@livekit/components-styles';
import { Loader2, MessageSquare, X, Send, Users, Radio } from 'lucide-react';

function ViewerRoom() {
  const room = useRoomContext();
  const [chat, setChat] = useState<{ name: string; msg: string; time: string }[]>([]);
  const [chatMsg, setChatMsg] = useState('');
  const [showChat, setShowChat] = useState(true);
  const [participantCount, setParticipantCount] = useState(0);

  useEffect(() => {
    const updateCount = () => setParticipantCount(room.numParticipants);
    room.on('participantConnected', updateCount);
    room.on('participantDisconnected', updateCount);
    room.on('dataReceived', (payload: Uint8Array, participant: any) => {
      try {
        const decoded = JSON.parse(new TextDecoder().decode(payload));
        if (decoded.type === 'chat') {
          setChat(prev => [...prev, { name: participant?.identity || 'مجهول', msg: decoded.msg, time: new Date().toLocaleTimeString('ar', { hour: '2-digit', minute: '2-digit' }) }]);
        }
      } catch {}
    });
    return () => { room.off('participantConnected', updateCount); room.off('participantDisconnected', updateCount); };
  }, [room]);

  const sendChat = async () => {
    if (!chatMsg.trim()) return;
    const payload = new TextEncoder().encode(JSON.stringify({ type: 'chat', msg: chatMsg }));
    await room.localParticipant.publishData(payload, { reliable: true });
    setChat(prev => [...prev, { name: 'أنت', msg: chatMsg, time: new Date().toLocaleTimeString('ar', { hour: '2-digit', minute: '2-digit' }) }]);
    setChatMsg('');
  };

  return (
    <div style={{ display: 'flex', height: '100vh', background: '#050505', overflow: 'hidden', direction: 'rtl' }}>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 20px', background: '#0a0a0a', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', padding: '5px 12px', borderRadius: '999px' }}>
              <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#ef4444', animation: 'pulse 1.5s infinite' }} />
              <span style={{ color: '#ef4444', fontWeight: 'bold', fontSize: '0.85rem' }}>مباشر</span>
            </div>
            <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '5px' }}><Users size={14} />{participantCount} مشاهد</span>
          </div>
          <button onClick={() => setShowChat(!showChat)} style={{ width: '38px', height: '38px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.1)', background: showChat ? 'rgba(203,161,83,0.15)' : 'rgba(255,255,255,0.05)', color: showChat ? 'var(--primary)' : '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <MessageSquare size={18} />
          </button>
        </div>
        <div style={{ flex: 1, overflow: 'hidden', background: '#000' }}>
          <VideoConference />
        </div>
        <RoomAudioRenderer />
      </div>

      {showChat && (
        <div style={{ width: '300px', display: 'flex', flexDirection: 'column', background: '#0a0a0a', borderRight: '1px solid rgba(255,255,255,0.07)' }}>
          <div style={{ padding: '14px 18px', borderBottom: '1px solid rgba(255,255,255,0.07)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontWeight: 'bold', fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: '8px' }}><MessageSquare size={16} color="var(--primary)" />الدردشة</span>
            <button onClick={() => setShowChat(false)} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', cursor: 'pointer' }}><X size={16} /></button>
          </div>
          <div style={{ flex: 1, overflowY: 'auto', padding: '12px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {chat.length === 0 && <p style={{ color: 'rgba(255,255,255,0.3)', textAlign: 'center', marginTop: '40px', fontSize: '0.85rem' }}>لا توجد رسائل بعد...</p>}
            {chat.map((m, i) => (
              <div key={i} style={{ background: m.name === 'أنت' ? 'rgba(203,161,83,0.1)' : 'rgba(255,255,255,0.04)', padding: '10px 12px', borderRadius: '10px', border: m.name === 'أنت' ? '1px solid rgba(203,161,83,0.2)' : '1px solid rgba(255,255,255,0.05)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                  <span style={{ fontWeight: 'bold', fontSize: '0.8rem', color: m.name === 'أنت' ? 'var(--primary)' : '#fff' }}>{m.name}</span>
                  <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.7rem' }}>{m.time}</span>
                </div>
                <p style={{ margin: 0, color: 'rgba(255,255,255,0.85)', fontSize: '0.85rem', lineHeight: 1.5 }}>{m.msg}</p>
              </div>
            ))}
          </div>
          <div style={{ padding: '10px 12px', borderTop: '1px solid rgba(255,255,255,0.07)', display: 'flex', gap: '8px' }}>
            <input
              value={chatMsg}
              onChange={e => setChatMsg(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && sendChat()}
              placeholder="اكتب رسالة..."
              style={{ flex: 1, padding: '9px 12px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: '#fff', fontFamily: 'inherit', outline: 'none', fontSize: '0.85rem' }}
            />
            <button onClick={sendChat} style={{ width: '38px', height: '38px', borderRadius: '8px', border: 'none', background: 'var(--primary)', color: '#000', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Send size={16} /></button>
          </div>
        </div>
      )}
      <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:0.5}}`}</style>
    </div>
  );
}

export default function LiveRoomPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [token, setToken] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    fetch(`/api/live/token?id=${id}`)
      .then(r => r.json())
      .then(d => { if (d.token) setToken(d.token); else setError(d.error || 'فشل الحصول على التوكن'); })
      .catch(() => setError('حدث خطأ في الاتصال'));
  }, [id]);

  if (error) return (
    <div style={{ minHeight: '100vh', background: '#050505', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', flexDirection: 'column', gap: '16px', direction: 'rtl' }}>
      <Radio size={48} color="#ef4444" />
      <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>لا يمكن الانضمام للبث</h2>
      <p style={{ color: 'rgba(255,255,255,0.5)', textAlign: 'center', maxWidth: '400px' }}>{error}</p>
      <button onClick={() => router.push('/live')} style={{ padding: '12px 24px', background: 'var(--primary)', color: '#000', borderRadius: '12px', border: 'none', cursor: 'pointer', fontWeight: 'bold', fontFamily: 'inherit' }}>العودة للبثوث</button>
    </div>
  );

  if (!token) return (
    <div style={{ minHeight: '100vh', background: '#050505', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', flexDirection: 'column', gap: '16px' }}>
      <Loader2 size={48} color="var(--primary)" style={{ animation: 'spin 1s linear infinite' }} />
      <p style={{ color: 'rgba(255,255,255,0.6)' }}>جاري الاتصال بالبث...</p>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  return (
    <LiveKitRoom
      serverUrl={process.env.NEXT_PUBLIC_LIVEKIT_URL}
      token={token}
      connect={true}
      video={false}
      audio={false}
    >
      <ViewerRoom />
    </LiveKitRoom>
  );
}
