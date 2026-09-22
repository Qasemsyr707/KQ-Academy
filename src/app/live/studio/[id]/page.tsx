'use client';
import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  LiveKitRoom,
  VideoConference,
  RoomAudioRenderer,
  useTracks,
  ParticipantTile,
  TrackRefContext,
  useRoomContext,
} from '@livekit/components-react';
import '@livekit/components-styles';
import { Track } from 'livekit-client';
import { Radio, Users, StopCircle, Loader2, Mic, MicOff, Video, VideoOff, Monitor, MonitorOff, MessageSquare, X, Send } from 'lucide-react';

function StudioRoom({ onEnd }: { onEnd: () => void }) {
  const room = useRoomContext();
  const tracks = useTracks([Track.Source.Camera, Track.Source.Microphone, Track.Source.ScreenShare]);
  const [participantCount, setParticipantCount] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [isCameraOff, setIsCameraOff] = useState(false);
  const [isSharingScreen, setIsSharingScreen] = useState(false);
  const [chat, setChat] = useState<{ name: string; msg: string; time: string }[]>([]);
  const [chatMsg, setChatMsg] = useState('');
  const [showChat, setShowChat] = useState(true);

  useEffect(() => {
    const updateCount = () => setParticipantCount(room.numParticipants);
    room.on('participantConnected', updateCount);
    room.on('participantDisconnected', updateCount);

    // Listen for chat data messages
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

  const toggleMic = async () => { await room.localParticipant.setMicrophoneEnabled(isMuted); setIsMuted(!isMuted); };
  const toggleCamera = async () => { await room.localParticipant.setCameraEnabled(isCameraOff); setIsCameraOff(!isCameraOff); };
  const toggleScreen = async () => {
    if (!isSharingScreen) { await room.localParticipant.setScreenShareEnabled(true); setIsSharingScreen(true); }
    else { await room.localParticipant.setScreenShareEnabled(false); setIsSharingScreen(false); }
  };

  const sendChat = async () => {
    if (!chatMsg.trim()) return;
    const payload = new TextEncoder().encode(JSON.stringify({ type: 'chat', msg: chatMsg }));
    await room.localParticipant.publishData(payload, { reliable: true });
    setChat(prev => [...prev, { name: 'أنت', msg: chatMsg, time: new Date().toLocaleTimeString('ar', { hour: '2-digit', minute: '2-digit' }) }]);
    setChatMsg('');
  };

  return (
    <div style={{ display: 'flex', height: '100vh', background: '#050505', overflow: 'hidden', direction: 'rtl' }}>
      {/* Video Area */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {/* Top Bar */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 24px', background: '#0a0a0a', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)', padding: '6px 14px', borderRadius: '999px' }}>
              <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#ef4444', animation: 'pulse 1.5s infinite' }} />
              <span style={{ color: '#ef4444', fontWeight: 'bold', fontSize: '0.9rem' }}>مباشر</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'rgba(255,255,255,0.7)', fontSize: '0.9rem' }}>
              <Users size={16} />
              <span>{participantCount} مشاهد</span>
            </div>
          </div>
          <button onClick={onEnd} style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)', color: '#ef4444', padding: '8px 18px', borderRadius: '12px', cursor: 'pointer', fontWeight: 'bold', fontFamily: 'inherit', transition: 'all 0.3s' }}>
            <StopCircle size={18} /> إنهاء البث
          </button>
        </div>

        {/* Tracks Grid */}
        <div style={{ flex: 1, overflow: 'hidden', background: '#000' }}>
          <VideoConference />
        </div>
        <RoomAudioRenderer />

        {/* Controls */}
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '16px', padding: '20px', background: '#0a0a0a', borderTop: '1px solid rgba(255,255,255,0.07)' }}>
          <button onClick={toggleMic} style={{ width: '56px', height: '56px', borderRadius: '50%', border: 'none', background: isMuted ? 'rgba(239,68,68,0.2)' : 'rgba(255,255,255,0.1)', color: isMuted ? '#ef4444' : '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.3s' }}>
            {isMuted ? <MicOff size={22} /> : <Mic size={22} />}
          </button>
          <button onClick={toggleCamera} style={{ width: '56px', height: '56px', borderRadius: '50%', border: 'none', background: isCameraOff ? 'rgba(239,68,68,0.2)' : 'rgba(255,255,255,0.1)', color: isCameraOff ? '#ef4444' : '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.3s' }}>
            {isCameraOff ? <VideoOff size={22} /> : <Video size={22} />}
          </button>
          <button onClick={toggleScreen} style={{ width: '56px', height: '56px', borderRadius: '50%', border: 'none', background: isSharingScreen ? 'rgba(203,161,83,0.2)' : 'rgba(255,255,255,0.1)', color: isSharingScreen ? 'var(--primary)' : '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.3s' }}>
            {isSharingScreen ? <MonitorOff size={22} /> : <Monitor size={22} />}
          </button>
          <button onClick={() => setShowChat(!showChat)} style={{ width: '56px', height: '56px', borderRadius: '50%', border: 'none', background: showChat ? 'rgba(203,161,83,0.2)' : 'rgba(255,255,255,0.1)', color: showChat ? 'var(--primary)' : '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.3s' }}>
            <MessageSquare size={22} />
          </button>
        </div>
      </div>

      {/* Chat Sidebar */}
      {showChat && (
        <div style={{ width: '320px', display: 'flex', flexDirection: 'column', background: '#0a0a0a', borderRight: '1px solid rgba(255,255,255,0.07)' }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid rgba(255,255,255,0.07)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '8px' }}><MessageSquare size={18} color="var(--primary)" /> الدردشة المباشرة</span>
            <button onClick={() => setShowChat(false)} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', cursor: 'pointer' }}><X size={18} /></button>
          </div>
          <div style={{ flex: 1, overflowY: 'auto', padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {chat.length === 0 && <p style={{ color: 'rgba(255,255,255,0.3)', textAlign: 'center', marginTop: '40px', fontSize: '0.9rem' }}>لا توجد رسائل بعد...</p>}
            {chat.map((m, i) => (
              <div key={i} style={{ background: m.name === 'أنت' ? 'rgba(203,161,83,0.1)' : 'rgba(255,255,255,0.04)', padding: '10px 14px', borderRadius: '12px', border: m.name === 'أنت' ? '1px solid rgba(203,161,83,0.2)' : '1px solid rgba(255,255,255,0.05)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                  <span style={{ fontWeight: 'bold', fontSize: '0.85rem', color: m.name === 'أنت' ? 'var(--primary)' : '#fff' }}>{m.name}</span>
                  <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.75rem' }}>{m.time}</span>
                </div>
                <p style={{ margin: 0, color: 'rgba(255,255,255,0.85)', fontSize: '0.9rem', lineHeight: 1.5 }}>{m.msg}</p>
              </div>
            ))}
          </div>
          <div style={{ padding: '12px 16px', borderTop: '1px solid rgba(255,255,255,0.07)', display: 'flex', gap: '8px' }}>
            <input
              value={chatMsg}
              onChange={e => setChatMsg(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && sendChat()}
              placeholder="اكتب رسالة..."
              style={{ flex: 1, padding: '10px 14px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', color: '#fff', fontFamily: 'inherit', outline: 'none', fontSize: '0.9rem' }}
            />
            <button onClick={sendChat} style={{ width: '42px', height: '42px', borderRadius: '10px', border: 'none', background: 'var(--primary)', color: '#000', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Send size={18} />
            </button>
          </div>
        </div>
      )}
      <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:0.5}}`}</style>
    </div>
  );
}

export default function StudioPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [token, setToken] = useState('');
  const [error, setError] = useState('');
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    fetch(`/api/live/token?id=${id}`)
      .then(r => r.json())
      .then(d => { if (d.token) setToken(d.token); else setError(d.error || 'فشل الحصول على التوكن'); })
      .catch(() => setError('حدث خطأ في الاتصال'));
  }, [id]);

  const handleEnd = useCallback(async () => {
    await fetch(`/api/live/${id}/end`, { method: 'PATCH' }).catch(() => {});
    router.push('/dashboard/instructor/live');
  }, [id, router]);

  if (error) return (
    <div style={{ minHeight: '100vh', background: '#050505', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', flexDirection: 'column', gap: '16px' }}>
      <Radio size={48} color="#ef4444" />
      <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>لا يمكن الوصول للاستوديو</h2>
      <p style={{ color: 'rgba(255,255,255,0.5)' }}>{error}</p>
      <button onClick={() => router.back()} style={{ padding: '12px 24px', background: 'var(--primary)', color: '#000', borderRadius: '12px', border: 'none', cursor: 'pointer', fontWeight: 'bold', fontFamily: 'inherit' }}>العودة</button>
    </div>
  );

  if (!token) return (
    <div style={{ minHeight: '100vh', background: '#050505', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', flexDirection: 'column', gap: '16px' }}>
      <Loader2 size={48} color="var(--primary)" style={{ animation: 'spin 1s linear infinite' }} />
      <p style={{ color: 'rgba(255,255,255,0.6)' }}>جاري الاتصال بالاستوديو...</p>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  return (
    <LiveKitRoom
      serverUrl={process.env.NEXT_PUBLIC_LIVEKIT_URL}
      token={token}
      connect={true}
      video={true}
      audio={true}
      onConnected={() => setConnected(true)}
    >
      <StudioRoom onEnd={handleEnd} />
    </LiveKitRoom>
  );
}
