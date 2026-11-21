'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { LiveKitRoom, VideoConference, RoomAudioRenderer, useRoomContext, useConnectionState } from '@livekit/components-react';
import '@livekit/components-styles';
import { ConnectionState } from 'livekit-client';
import { Loader2, Mic, MicOff, Video, VideoOff, Monitor, MonitorOff, MessageSquare, StopCircle, Radio } from 'lucide-react';
import { ChatPanel, ConnectionBadge, LiveNotice } from '@/components/live/LiveRoomParts';
import { HostClassroomTools, WhenLiveConnected } from '@/components/live/ClassroomInteractions';

type Phase = 'connecting' | 'live' | 'start-failed';

async function setStatus(id: string, action: 'start' | 'end') {
  const res = await fetch(`/api/live/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action }) });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'تعذّر تحديث حالة الجلسة');
}

function StudioRoom({ phase, startError, onEnd, liveId }: { phase: Phase; startError: string; onEnd: () => Promise<void>; liveId: string }) {
  const room = useRoomContext();
  const state = useConnectionState();
  const [mic, setMic] = useState(true);
  const [camera, setCamera] = useState(true);
  const [screen, setScreen] = useState(false);
  const [showChat, setShowChat] = useState(true);
  const [deviceError, setDeviceError] = useState('');
  const [ending, setEnding] = useState(false);

  const toggle = async (kind: 'mic' | 'camera' | 'screen') => {
    setDeviceError('');
    const p = room.localParticipant;
    try {
      if (kind === 'mic') { await p.setMicrophoneEnabled(!mic); setMic(!mic); }
      if (kind === 'camera') { await p.setCameraEnabled(!camera); setCamera(!camera); }
      if (kind === 'screen') { await p.setScreenShareEnabled(!screen); setScreen(!screen); }
    } catch (error) {
      const name = error instanceof Error ? error.name : '';
      setDeviceError(name === 'NotAllowedError' ? 'رفض المتصفح الوصول؛ اسمح بالكاميرا/الميكروفون/مشاركة الشاشة من إعدادات الموقع.'
        : name === 'NotFoundError' ? 'لم يُعثر على الجهاز المطلوب.' : 'تعذّر تشغيل الجهاز المطلوب.');
    }
  };
  const end = async () => {
    if (!confirm('إنهاء البث للجميع؟')) return;
    setEnding(true);
    await onEnd();
    setEnding(false);
  };
  const round = (active: boolean, danger = false) => ({
    width: 54, height: 54, borderRadius: '50%', border: 'none', cursor: 'pointer', display: 'grid', placeItems: 'center',
    background: danger ? 'rgba(239,68,68,0.2)' : active ? 'rgba(203,161,83,0.2)' : 'rgba(255,255,255,0.1)',
    color: danger ? '#ef4444' : active ? 'var(--primary)' : '#fff',
  });

  return (
    <div dir="rtl" className="studio" style={{ display: 'flex', height: '100dvh', background: 'var(--background)', overflow: 'hidden', fontFamily: "'Cairo', sans-serif", color: '#fff' }}>
      <style>{`@media (max-width: 820px){.studio{flex-direction:column}.studio .live-chat{width:100%!important;height:40dvh}} .studio .lk-control-bar{display:none}`}</style>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', padding: '12px 20px', background: 'var(--ink-2)', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '5px 12px', borderRadius: 999, fontWeight: 'bold', fontSize: '0.85rem',
              background: phase === 'live' ? 'rgba(239,68,68,0.15)' : 'rgba(255,255,255,0.06)', color: phase === 'live' ? '#ef4444' : 'rgba(255,255,255,0.7)' }}>
              <Radio size={14} /> {phase === 'live' ? 'مباشر الآن' : phase === 'start-failed' ? 'لم يبدأ البث' : 'جاري بدء البث…'}
            </span>
            <ConnectionBadge />
          </div>
          <button type="button" onClick={end} disabled={ending} style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.35)', color: '#ef4444', padding: '8px 16px', borderRadius: 12, cursor: 'pointer', fontWeight: 'bold', fontFamily: 'inherit' }}>
            {ending ? <Loader2 size={18} className="kq-spin" /> : <StopCircle size={18} />} إنهاء البث
          </button>
        </div>
        {startError && <p role="alert" style={{ background: 'rgba(239,68,68,0.12)', color: '#fca5a5', padding: '10px 20px', margin: 0 }}>{startError}</p>}
        {state === ConnectionState.Reconnecting && <p role="status" style={{ background: 'rgba(251,191,36,0.12)', color: '#fbbf24', padding: '8px 20px', margin: 0 }}>انقطع الاتصال مؤقتاً، تجري إعادة الاتصال تلقائياً…</p>}
        {deviceError && <p role="alert" style={{ background: 'rgba(239,68,68,0.12)', color: '#fca5a5', padding: '8px 20px', margin: 0 }}>{deviceError}</p>}
        <div style={{ flex: 1, overflow: 'hidden', background: '#000' }} data-lk-theme="default"><VideoConference /></div>
        <RoomAudioRenderer />
        <WhenLiveConnected><HostClassroomTools liveId={liveId} /></WhenLiveConnected>
        <div style={{ display: 'flex', justifyContent: 'center', gap: 14, padding: 16, background: 'var(--ink-2)', borderTop: '1px solid rgba(255,255,255,0.07)' }}>
          <button type="button" onClick={() => toggle('mic')} style={round(false, !mic)} aria-label={mic ? 'كتم الميكروفون' : 'تشغيل الميكروفون'}>{mic ? <Mic size={22} /> : <MicOff size={22} />}</button>
          <button type="button" onClick={() => toggle('camera')} style={round(false, !camera)} aria-label={camera ? 'إيقاف الكاميرا' : 'تشغيل الكاميرا'}>{camera ? <Video size={22} /> : <VideoOff size={22} />}</button>
          <button type="button" onClick={() => toggle('screen')} style={round(screen)} aria-label={screen ? 'إيقاف مشاركة الشاشة' : 'مشاركة الشاشة'}>{screen ? <MonitorOff size={22} /> : <Monitor size={22} />}</button>
          <button type="button" onClick={() => setShowChat(v => !v)} style={round(showChat)} aria-label="الدردشة"><MessageSquare size={22} /></button>
        </div>
      </div>
      {showChat && <ChatPanel onClose={() => setShowChat(false)} />}
    </div>
  );
}

export default function StudioPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [token, setToken] = useState('');
  const [serverUrl, setServerUrl] = useState('');
  const [error, setError] = useState('');
  const [phase, setPhase] = useState<Phase>('connecting');
  const [startError, setStartError] = useState('');
  const started = useRef(false);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/live/token?id=${encodeURIComponent(id)}`)
      .then(r => r.json().then(d => ({ ok: r.ok, d })))
      .then(({ ok, d }) => {
        if (cancelled) return;
        if (!ok || !d.token) { setError(d.error || 'تعذّر الحصول على إذن الدخول'); return; }
        // Only a host gets a publishing token; anyone else watches from the viewer page.
        if (!d.canPublish) { router.replace(`/live/room/${encodeURIComponent(id)}`); return; }
        setServerUrl(d.serverUrl); setToken(d.token);
      })
      .catch(() => { if (!cancelled) setError('تعذّر الاتصال بالخادم'); });
    return () => { cancelled = true; };
  }, [id, router]);

  // LIVE is recorded only after the host really connected to LiveKit, and only once.
  const onConnected = useCallback(() => {
    if (started.current) return;
    started.current = true;
    setStatus(id, 'start').then(() => { setPhase('live'); setStartError(''); })
      .catch(e => { setPhase('start-failed'); setStartError(e instanceof Error ? e.message : 'تعذّر بدء البث'); started.current = false; });
  }, [id]);

  const handleEnd = useCallback(async () => {
    try { await setStatus(id, 'end'); router.push('/instructor/live'); }
    catch (e) { setStartError(e instanceof Error ? e.message : 'تعذّر إنهاء البث'); }
  }, [id, router]);

  if (error) return <LiveNotice title="لا يمكن فتح الاستوديو" message={error}
    action={<button type="button" className="btn btn-solid" onClick={() => router.push('/instructor/live')}>بثوثي المباشرة</button>} />;
  if (!token) return <LiveNotice title="جاري تجهيز الاستوديو" message="نتحقق من صلاحيتك ونجهّز اتصال البث…" action={<Loader2 size={40} color="var(--primary)" className="kq-spin" />} />;

  return (
    <LiveKitRoom serverUrl={serverUrl} token={token} connect video audio onConnected={onConnected}
      onError={e => setStartError(`خطأ في الاتصال بخادم البث: ${e.message}`)}
      onMediaDeviceFailure={() => setStartError('تعذّر الوصول إلى الكاميرا أو الميكروفون؛ اسمح بهما من إعدادات المتصفح.')}>
      <StudioRoom phase={phase} startError={startError} onEnd={handleEnd} liveId={id} />
    </LiveKitRoom>
  );
}
