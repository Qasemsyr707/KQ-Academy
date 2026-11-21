'use client';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { LiveKitRoom, RoomAudioRenderer, VideoConference, useConnectionState } from '@livekit/components-react';
import '@livekit/components-styles';
import { ConnectionState } from 'livekit-client';
import { Loader2, MessageSquare, Radio } from 'lucide-react';
import { ChatPanel, ConnectionBadge, LiveNotice } from '@/components/live/LiveRoomParts';

const WAIT_POLL_MS = 15_000;

function ViewerRoom() {
  const state = useConnectionState();
  const [showChat, setShowChat] = useState(true);
  return (
    <div dir="rtl" className="viewer" style={{ display: 'flex', height: '100dvh', background: 'var(--background)', overflow: 'hidden', fontFamily: "'Cairo', sans-serif", color: '#fff' }}>
      <style>{`@media (max-width: 820px){.viewer{flex-direction:column}.viewer .live-chat{width:100%!important;height:40dvh}} .viewer .lk-control-bar{display:none}`}</style>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', padding: '12px 18px', background: 'var(--ink-2)', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: '#ef4444', fontWeight: 'bold', fontSize: '0.85rem' }}><Radio size={14} /> مباشر</span>
            <ConnectionBadge />
          </div>
          <button type="button" onClick={() => setShowChat(v => !v)} aria-label="الدردشة" style={{ width: 38, height: 38, borderRadius: 10, border: '1px solid rgba(255,255,255,0.1)', background: showChat ? 'rgba(203,161,83,0.15)' : 'rgba(255,255,255,0.05)', color: showChat ? 'var(--primary)' : '#fff', cursor: 'pointer', display: 'grid', placeItems: 'center' }}><MessageSquare size={18} /></button>
        </div>
        {state === ConnectionState.Reconnecting && <p role="status" style={{ background: 'rgba(251,191,36,0.12)', color: '#fbbf24', padding: '8px 18px', margin: 0 }}>انقطع الاتصال مؤقتاً، تجري إعادة الاتصال…</p>}
        {/* The viewer token cannot publish audio or video (server grant); the publish controls are hidden. */}
        <div style={{ flex: 1, overflow: 'hidden', background: '#000' }} data-lk-theme="default"><VideoConference /></div>
        <RoomAudioRenderer />
      </div>
      {showChat && <ChatPanel onClose={() => setShowChat(false)} width={300} />}
    </div>
  );
}

export default function LiveRoomPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [token, setToken] = useState('');
  const [serverUrl, setServerUrl] = useState('');
  const [error, setError] = useState('');
  const [waiting, setWaiting] = useState(false);
  const [ended, setEnded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const load = () => fetch(`/api/live/token?id=${encodeURIComponent(id)}`)
      .then(r => r.json().then(d => ({ status: r.status, d })))
      .then(({ status, d }) => {
        if (cancelled) return;
        // 425: the host has not connected yet. Check again shortly instead of failing.
        if (status === 425) { setWaiting(true); timer = setTimeout(load, WAIT_POLL_MS); return; }
        setWaiting(false);
        if (status !== 200 || !d.token) { setError(d.error || 'تعذّر الانضمام للبث'); return; }
        setServerUrl(d.serverUrl); setToken(d.token);
      })
      .catch(() => { if (!cancelled) setError('تعذّر الاتصال بالخادم'); });
    load();
    return () => { cancelled = true; if (timer) clearTimeout(timer); };
  }, [id]);

  const back = <button type="button" className="btn btn-solid" onClick={() => router.push('/live')}>العودة للبثوث</button>;
  if (ended) return <LiveNotice title="انتهى البث" message="أنهى المدرّب هذه الجلسة أو انقطع اتصالك بها." action={back} />;
  if (error) return <LiveNotice title="لا يمكن الانضمام للبث" message={error} action={back} />;
  if (waiting) return <LiveNotice title="لم يبدأ البث بعد" message="ستنضم تلقائياً فور اتصال المدرّب. يمكنك إبقاء هذه الصفحة مفتوحة." action={<Loader2 size={40} color="var(--primary)" className="kq-spin" />} />;
  if (!token) return <LiveNotice title="جاري الاتصال بالبث" message="نتحقق من اشتراكك في الكورس…" action={<Loader2 size={40} color="var(--primary)" className="kq-spin" />} />;

  return (
    <LiveKitRoom serverUrl={serverUrl} token={token} connect video={false} audio={false} onDisconnected={() => setEnded(true)}
      onError={e => setError(`خطأ في الاتصال بخادم البث: ${e.message}`)}>
      <ViewerRoom />
    </LiveKitRoom>
  );
}
