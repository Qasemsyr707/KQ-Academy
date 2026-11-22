'use client';

import { useCallback, useEffect, useMemo, useState, type CSSProperties, type ReactNode } from 'react';
import { useConnectionState, useRemoteParticipants, useRoomContext } from '@livekit/components-react';
import { ConnectionState, RoomEvent, Track, type Participant } from 'livekit-client';
import { Camera, CameraOff, Check, Hand, Mic, MicOff, Monitor, MonitorOff, Share2, ShieldOff, Smile, Users, X } from 'lucide-react';
import { HostLivePolls } from './LivePolls';

type ClassSignal = { type: 'kq-hand'; raised: boolean } | { type: 'kq-reaction'; emoji: string };
type RaiseRequest = { identity: string; name: string; time: number };
const emojis = ['👏', '👍', '❤️', '🎉', '💡'];
const pill: CSSProperties = { borderRadius: 12, border: '1px solid rgba(201,164,92,.33)', background: 'rgba(201,164,92,.10)', color: '#f5e4bc', padding: '9px 13px', font: 'inherit', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 7 };
const small: CSSProperties = { ...pill, fontSize: 12, padding: '6px 10px' };

async function shareLesson(liveId: string): Promise<'copied' | 'shared'> {
  const url = new URL(`/live/room/${encodeURIComponent(liveId)}`, window.location.origin).toString();
  if (typeof navigator.share === 'function') {
    try { await navigator.share({ title: 'صف KQ Academy المباشر', url }); return 'shared'; }
    catch (e) { if (e instanceof Error && e.name === 'AbortError') return 'shared'; }
  }
  await navigator.clipboard.writeText(url);
  return 'copied';
}

export function ShareClassButton({ liveId }: { liveId: string }) {
  const [message, setMessage] = useState('');
  const onClick = async () => {
    try { const result = await shareLesson(liveId); setMessage(result === 'copied' ? 'تم نسخ رابط الصف' : 'تمت المشاركة'); }
    catch { setMessage(`انسخ الرابط: ${window.location.origin}/live/room/${encodeURIComponent(liveId)}`); }
  };
  return <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
    <button type="button" onClick={() => void onClick()} style={pill} aria-label="مشاركة رابط الصف"><Share2 size={17} /> مشاركة الصف</button>
    {message && <span role="status" style={{ fontSize: 12, color: '#e7d5b3', overflowWrap: 'anywhere' }}>{message}</span>}
  </div>;
}

export function useClassEvents() {
  const room = useRoomContext();
  const [requests, setRequests] = useState<Record<string, RaiseRequest>>({});
  const [reaction, setReaction] = useState('');
  useEffect(() => {
    const onData = (data: Uint8Array, participant?: Participant) => {
      try {
        if (!participant) return; // never trust an identity supplied in the data payload
        const msg: unknown = JSON.parse(new TextDecoder().decode(data));
        if (!msg || typeof msg !== 'object') return;
        const body = msg as Record<string, unknown>;
        if (body.type === 'kq-hand' && typeof body.raised === 'boolean') {
          setRequests(prev => {
            const next = { ...prev };
            if (body.raised) next[participant.identity] = { identity: participant.identity, name: participant.name || 'طالب', time: Date.now() };
            else delete next[participant.identity];
            return next;
          });
        }
        if (body.type === 'kq-reaction' && typeof body.emoji === 'string' && emojis.includes(body.emoji)) {
          setReaction(`${participant.name || 'مشارك'} ${body.emoji}`);
        }
      } catch { /* Other applications may also use LiveKit data packets. */ }
    };
    room.on(RoomEvent.DataReceived, onData);
    return () => { room.off(RoomEvent.DataReceived, onData); };
  }, [room]);
  const send = useCallback(async (msg: ClassSignal) => {
    await room.localParticipant.publishData(new TextEncoder().encode(JSON.stringify(msg)), { reliable: true });
  }, [room]);
  return { requests, setRequests, reaction, send };
}

export function Reactions({ send }: { send: (msg: ClassSignal) => Promise<void> }) {
  const [error, setError] = useState('');
  return <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', alignItems: 'center' }} aria-label="تفاعلات الصف">
    <Smile size={18} color="#c9a45c" aria-hidden="true" />
    {emojis.map(emoji => <button type="button" key={emoji} style={{ ...small, fontSize: 18, minWidth: 36 }} aria-label={`إرسال تفاعل ${emoji}`}
      onClick={() => { setError(''); void send({ type: 'kq-reaction', emoji }).catch(() => setError('تعذّر إرسال التفاعل')); }}>{emoji}</button>)}
    {error && <span role="alert" style={{ fontSize: 12, color: '#fca5a5' }}>{error}</span>}
  </div>;
}

/** Student: request to speak, reactions, link sharing, and media tools unlocked by a host only. */
/** Classroom tools talk over the LiveKit data channel; they appear only once the signal connection really succeeded. */
export function WhenLiveConnected({ children }: { children: ReactNode }) {
  const state = useConnectionState();
  return state === ConnectionState.Connected || state === ConnectionState.Reconnecting || state === ConnectionState.SignalReconnecting ? <>{children}</> : null;
}

export function StudentClassroomTools({ liveId }: { liveId: string }) {
  const room = useRoomContext();
  const { send, reaction } = useClassEvents();
  const [raised, setRaised] = useState(false);
  const [, refreshPermissions] = useState(0);
  const [mediaError, setMediaError] = useState('');
  const [mic, setMic] = useState(false);
  const [camera, setCamera] = useState(false);
  const [screen, setScreen] = useState(false);
  useEffect(() => {
    const changed = () => {
      refreshPermissions(v => v + 1);
      if (!room.localParticipant.permissions?.canPublish) { setMic(false); setCamera(false); setScreen(false); }
    };
    room.on(RoomEvent.ParticipantPermissionsChanged, changed);
    return () => { room.off(RoomEvent.ParticipantPermissionsChanged, changed); };
  }, [room]);
  // The revision ensures permissions are reread after the host updates the LiveKit server.
  const permission = room.localParticipant.permissions;
  const sources = permission?.canPublishSources;
  // LiveKit reports permitted sources as protocol enums; convert before comparing with client sources.
  const allowed = (source: Track.Source) => !!permission?.canPublish && (!sources?.length || sources.includes(Track.sourceToProto(source)));
  const toggleHand = async () => {
    setMediaError('');
    try { await send({ type: 'kq-hand', raised: !raised }); setRaised(!raised); }
    catch { setMediaError('تعذّر إرسال طلب المشاركة'); }
  };
  const toggle = async (kind: 'mic' | 'camera' | 'screen') => {
    setMediaError('');
    try {
      if (kind === 'mic' && allowed(Track.Source.Microphone)) { await room.localParticipant.setMicrophoneEnabled(!mic); setMic(!mic); }
      if (kind === 'camera' && allowed(Track.Source.Camera)) { await room.localParticipant.setCameraEnabled(!camera); setCamera(!camera); }
      if (kind === 'screen' && allowed(Track.Source.ScreenShare)) { await room.localParticipant.setScreenShareEnabled(!screen); setScreen(!screen); }
    } catch { setMediaError('لم يتم تشغيل الجهاز. تحقق من أذونات المتصفح أو صلاحية المدرّب.'); }
  };
  return <section dir="rtl" aria-label="التفاعل داخل الصف" style={{ display: 'grid', gap: 10, background: '#292d32', padding: '12px 16px', borderTop: '1px solid rgba(201,164,92,.2)', maxHeight: '40dvh', overflowY: 'auto' }}>
    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
      <button type="button" onClick={() => void toggleHand()} style={{ ...pill, background: raised ? 'rgba(201,164,92,.28)' : pill.background }} aria-pressed={raised}>
        <Hand size={18} /> {raised ? 'إلغاء رفع اليد' : 'رفع اليد لطلب المشاركة'}
      </button>
      <button type="button" onClick={() => void toggle('mic')} disabled={!allowed(Track.Source.Microphone)} style={{ ...pill, opacity: allowed(Track.Source.Microphone) ? 1 : .45 }} aria-label={mic ? 'إيقاف الميكروفون' : 'تشغيل الميكروفون'}>{mic ? <Mic size={18} /> : <MicOff size={18} />} الميكروفون</button>
      <button type="button" onClick={() => void toggle('camera')} disabled={!allowed(Track.Source.Camera)} style={{ ...pill, opacity: allowed(Track.Source.Camera) ? 1 : .45 }} aria-label={camera ? 'إيقاف الكاميرا' : 'تشغيل الكاميرا'}>{camera ? <Camera size={18} /> : <CameraOff size={18} />} الكاميرا</button>
      <button type="button" onClick={() => void toggle('screen')} disabled={!allowed(Track.Source.ScreenShare)} style={{ ...pill, opacity: allowed(Track.Source.ScreenShare) ? 1 : .45 }} aria-label={screen ? 'إيقاف مشاركة الشاشة' : 'مشاركة الشاشة'}>{screen ? <MonitorOff size={18} /> : <Monitor size={18} />} الشاشة</button>
      <ShareClassButton liveId={liveId} />
    </div>
    {!permission?.canPublish && <p style={{ margin: 0, color: '#d2c8b8', fontSize: 12 }}>اطلب المشاركة برفع اليد. سيظهر طلبك للمدرّب، ويمكنه السماح بالصوت أو الكاميرا أو مشاركة الشاشة. روابط الصف لا تتجاوز شرط الاشتراك بالكورس.</p>}
    {reaction && <span role="status" style={{ color: '#f5e4bc', fontSize: 13 }}>{reaction}</span>}
    {mediaError && <span role="alert" style={{ color: '#fca5a5', fontSize: 13 }}>{mediaError}</span>}
    <Reactions send={send} />
  </section>;
}

/** Instructor/owner: secure participant permissions + hand-raise queue + classroom sharing. */
export function HostClassroomTools({ liveId }: { liveId: string }) {
  const remote = useRemoteParticipants();
  const { requests, setRequests, reaction, send } = useClassEvents();
  const [busy, setBusy] = useState('');
  const [notice, setNotice] = useState('');
  // Attendance = remote participants only; the host (local participant) is never counted.
  const others = useMemo(() => remote.filter(p => p.identity), [remote]);
  const queued = useMemo(() => Object.values(requests).filter(r => others.some(p => p.identity === r.identity)).sort((a, b) => a.time - b.time), [requests, others]);
  const moderate = async (identity: string, action: 'microphone' | 'camera' | 'screen' | 'revoke') => {
    setBusy(identity); setNotice('');
    try {
      const response = await fetch(`/api/live/${encodeURIComponent(liveId)}/permissions`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identity, action }),
      });
      const json = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(json.error || 'تعذّر تحديث الصلاحية');
      setRequests(prev => { const next = { ...prev }; delete next[identity]; return next; });
      setNotice(action === 'revoke' ? 'تم إيقاف صلاحية الطالب' : 'تم منح صلاحية المشاركة');
    } catch (error) { setNotice(error instanceof Error ? error.message : 'تعذّر تحديث الصلاحية'); }
    finally { setBusy(''); }
  };
  return <section dir="rtl" aria-label="إدارة المشاركين والتفاعل" style={{ background: '#292d32', padding: '12px 16px', borderTop: '1px solid rgba(201,164,92,.2)', maxHeight: '37dvh', overflowY: 'auto', display: 'grid', gap: 12 }}>
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
      <strong style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}><Users size={17} color="#c9a45c" /> إدارة الصف ({others.length} مشارك)</strong>
      <ShareClassButton liveId={liveId} />
    </div>
    {queued.length > 0 && <div role="status" style={{ border: '1px solid rgba(201,164,92,.4)', borderRadius: 12, padding: 10, background: 'rgba(201,164,92,.07)' }}>
      <strong style={{ display: 'flex', gap: 6, alignItems: 'center', marginBottom: 9 }}><Hand size={17} /> طلبات رفع اليد ({queued.length})</strong>
      {queued.map(r => <div key={r.identity} style={{ display: 'flex', justifyContent: 'space-between', gap: 7, alignItems: 'center', flexWrap: 'wrap', padding: '5px 0' }}>
        <span>{r.name}</span><div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
          <button type="button" style={small} disabled={!!busy} onClick={() => void moderate(r.identity, 'microphone')}><Mic size={14} /> السماح بالصوت</button>
          <button type="button" style={small} disabled={!!busy} onClick={() => void moderate(r.identity, 'camera')}><Camera size={14} /> صوت وكاميرا</button>
          <button type="button" style={small} disabled={!!busy} onClick={() => void moderate(r.identity, 'screen')}><Monitor size={14} /> مشاركة الشاشة</button>
          <button type="button" style={small} onClick={() => setRequests(prev => { const next = { ...prev }; delete next[r.identity]; return next; })}><X size={14} /> تجاهل</button>
        </div>
      </div>)}
    </div>}
    <div style={{ display: 'grid', gap: 7 }}>
      {others.length === 0 && <p style={{ color: '#bcb7af', fontSize: 13, margin: 0 }}>لم ينضم أي طالب بعد. شارك رابط الصف مع طلاب الكورس.</p>}
      {others.map(p => <div key={p.identity} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, flexWrap: 'wrap', background: 'rgba(255,255,255,.04)', borderRadius: 9, padding: '7px 10px' }}>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>{requests[p.identity] && <Hand size={16} color="#c9a45c" />}{p.name || 'مشارك'}{p.permissions?.canPublish ? <Check size={14} color="#53d5a8" /> : null}</span>
        <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
          <button type="button" style={small} disabled={!!busy} onClick={() => void moderate(p.identity, 'microphone')} aria-label={`السماح بالصوت لـ${p.name}`}><Mic size={14} /> صوت</button>
          <button type="button" style={small} disabled={!!busy} onClick={() => void moderate(p.identity, 'camera')} aria-label={`السماح بالكاميرا لـ${p.name}`}><Camera size={14} /> كاميرا</button>
          <button type="button" style={small} disabled={!!busy} onClick={() => void moderate(p.identity, 'screen')} aria-label={`السماح بمشاركة الشاشة لـ${p.name}`}><Monitor size={14} /> شاشة</button>
          <button type="button" style={{ ...small, borderColor: 'rgba(239,68,68,.35)', color: '#fca5a5' }} disabled={!!busy} onClick={() => void moderate(p.identity, 'revoke')} aria-label={`إيقاف مشاركة ${p.name}`}><ShieldOff size={14} /> إيقاف</button>
        </div>
      </div>)}
    </div>
    {notice && <span role="status" style={{ fontSize: 13, color: notice.startsWith('تم') ? '#86efac' : '#fca5a5' }}>{notice}</span>}
    {reaction && <span role="status" style={{ color: '#e7d5b3' }}>{reaction}</span>}
    <Reactions send={send} />
    <HostLivePolls />
    <p style={{ margin: 0, opacity: .7, fontSize: 12 }}>مشاركة الصوت أو الفيديو محمية من خادم LiveKit. طلبات اليد والتفاعلات آنية داخل الجلسة وليست محفوظة بعد انتهائها.</p>
  </section>;
}
