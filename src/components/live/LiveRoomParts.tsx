'use client';

import { useEffect, useRef, useState } from 'react';
import { useConnectionState, useParticipants, useRoomContext } from '@livekit/components-react';
import { ConnectionState, RoomEvent, type Participant } from 'livekit-client';
import { MessageSquare, Send, Users, Wifi, WifiOff, X, Loader2 } from 'lucide-react';

type ChatLine = { id: number; name: string; msg: string; time: string; mine: boolean };
const MAX_CHAT = 500;
const time = () => new Date().toLocaleTimeString('ar', { hour: '2-digit', minute: '2-digit' });

/** Chat over LiveKit data messages (reliable). Names come from the token, set by the server. */
export function useLiveChat() {
  const room = useRoomContext();
  const [lines, setLines] = useState<ChatLine[]>([]);
  const seq = useRef(0);
  useEffect(() => {
    const onData = (payload: Uint8Array, participant?: Participant) => {
      try {
        const decoded = JSON.parse(new TextDecoder().decode(payload));
        if (decoded?.type !== 'chat' || typeof decoded.msg !== 'string') return;
        const msg = decoded.msg.slice(0, MAX_CHAT);
        setLines(prev => [...prev.slice(-199), { id: ++seq.current, name: participant?.name || 'مشارك', msg, time: time(), mine: false }]);
      } catch { /* not a chat message */ }
    };
    room.on(RoomEvent.DataReceived, onData);
    return () => { room.off(RoomEvent.DataReceived, onData); };
  }, [room]);
  const send = async (text: string) => {
    const msg = text.trim().slice(0, MAX_CHAT);
    if (!msg) return false;
    await room.localParticipant.publishData(new TextEncoder().encode(JSON.stringify({ type: 'chat', msg })), { reliable: true });
    setLines(prev => [...prev.slice(-199), { id: ++seq.current, name: 'أنت', msg, time: time(), mine: true }]);
    return true;
  };
  return { lines, send };
}

export type LiveChat = ReturnType<typeof useLiveChat>;

/** Messages + input only; the caller owns the chat state so it survives panel and tab switches. */
export function ChatBox({ chat, disabled = false }: { chat: LiveChat; disabled?: boolean }) {
  const { lines, send } = chat;
  const [draft, setDraft] = useState('');
  const [error, setError] = useState('');
  const submit = async () => {
    setError('');
    try { if (await send(draft)) setDraft(''); } catch { setError('تعذّر إرسال الرسالة'); }
  };
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10, minHeight: 0 }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }} aria-live="polite" aria-label="رسائل الدردشة">
        {lines.length === 0 && <p style={{ color: 'rgba(255,255,255,0.4)', textAlign: 'center', margin: '24px 0', fontSize: '0.9rem' }}>لا توجد رسائل بعد</p>}
        {lines.map(m => (
          <div key={m.id} style={{ background: m.mine ? 'rgba(203,161,83,0.1)' : 'rgba(255,255,255,0.04)', padding: '8px 10px', borderRadius: 12, border: `1px solid ${m.mine ? 'rgba(203,161,83,0.25)' : 'rgba(255,255,255,0.05)'}` }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2, gap: 8 }}>
              <span style={{ fontWeight: 'bold', fontSize: '0.82rem', color: m.mine ? 'var(--primary, #c9a45c)' : '#fff' }}>{m.name}</span>
              <span style={{ color: 'rgba(255,255,255,0.35)', fontSize: '0.72rem' }}>{m.time}</span>
            </div>
            <p style={{ margin: 0, color: 'rgba(255,255,255,0.88)', fontSize: '0.88rem', lineHeight: 1.6, overflowWrap: 'anywhere' }}>{m.msg}</p>
          </div>
        ))}
      </div>
      {error && <p role="alert" style={{ color: '#f87171', fontSize: '0.8rem', margin: 0 }}>{error}</p>}
      {disabled ? <p style={{ fontSize: 12, color: '#bdb5a6', margin: 0 }}>أوقف المدرّب الدردشة مؤقتاً.</p> : (
        <div style={{ display: 'flex', gap: 8 }}>
          <input value={draft} maxLength={MAX_CHAT} onChange={e => setDraft(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') void submit(); }}
            placeholder="اكتب رسالة…" aria-label="نص الرسالة"
            style={{ flex: 1, minWidth: 0, padding: '10px 12px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, color: '#fff', fontFamily: 'inherit', outline: 'none' }} />
          <button type="button" onClick={() => void submit()} aria-label="إرسال" style={{ width: 42, height: 42, borderRadius: 10, border: 'none', background: '#c9a45c', color: '#000', cursor: 'pointer', display: 'grid', placeItems: 'center' }}><Send size={18} /></button>
        </div>
      )}
    </div>
  );
}

export function ChatPanel({ onClose, width = 320 }: { onClose: () => void; width?: number }) {
  const { lines, send } = useLiveChat();
  const [draft, setDraft] = useState('');
  const [error, setError] = useState('');
  const submit = async () => {
    setError('');
    try { if (await send(draft)) setDraft(''); } catch { setError('تعذّر إرسال الرسالة'); }
  };
  return (
    <aside className="live-chat" style={{ width, display: 'flex', flexDirection: 'column', background: 'var(--ink-2)', borderRight: '1px solid rgba(255,255,255,0.07)' }} aria-label="الدردشة المباشرة">
      <div style={{ padding: '14px 18px', borderBottom: '1px solid rgba(255,255,255,0.07)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: 8 }}><MessageSquare size={18} color="var(--primary)" /> الدردشة المباشرة</span>
        <button type="button" onClick={onClose} aria-label="إخفاء الدردشة" style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.5)', cursor: 'pointer' }}><X size={18} /></button>
      </div>
      <div style={{ flex: 1, overflowY: 'auto', padding: 14, display: 'flex', flexDirection: 'column', gap: 10 }} aria-live="polite">
        {lines.length === 0 && <p style={{ color: 'rgba(255,255,255,0.35)', textAlign: 'center', marginTop: 40, fontSize: '0.9rem' }}>لا توجد رسائل بعد</p>}
        {lines.map(m => (
          <div key={m.id} style={{ background: m.mine ? 'rgba(203,161,83,0.1)' : 'rgba(255,255,255,0.04)', padding: '10px 12px', borderRadius: 12, border: `1px solid ${m.mine ? 'rgba(203,161,83,0.25)' : 'rgba(255,255,255,0.05)'}` }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, gap: 8 }}>
              <span style={{ fontWeight: 'bold', fontSize: '0.85rem', color: m.mine ? 'var(--primary)' : '#fff' }}>{m.name}</span>
              <span style={{ color: 'rgba(255,255,255,0.35)', fontSize: '0.75rem' }}>{m.time}</span>
            </div>
            <p style={{ margin: 0, color: 'rgba(255,255,255,0.88)', fontSize: '0.9rem', lineHeight: 1.6, overflowWrap: 'anywhere' }}>{m.msg}</p>
          </div>
        ))}
      </div>
      {error && <p role="alert" style={{ color: '#f87171', fontSize: '0.8rem', padding: '0 16px' }}>{error}</p>}
      <div style={{ padding: '10px 14px', borderTop: '1px solid rgba(255,255,255,0.07)', display: 'flex', gap: 8 }}>
        <input value={draft} maxLength={MAX_CHAT} onChange={e => setDraft(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') void submit(); }}
          placeholder="اكتب رسالة…" aria-label="نص الرسالة"
          style={{ flex: 1, minWidth: 0, padding: '10px 12px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, color: '#fff', fontFamily: 'inherit', outline: 'none' }} />
        <button type="button" onClick={() => void submit()} aria-label="إرسال" style={{ width: 42, height: 42, borderRadius: 10, border: 'none', background: 'var(--primary)', color: '#000', cursor: 'pointer', display: 'grid', placeItems: 'center' }}><Send size={18} /></button>
      </div>
    </aside>
  );
}

/** Real participant count (everyone in the room, the host included) and the live connection state. */
export function ConnectionBadge() {
  const state = useConnectionState();
  const participants = useParticipants();
  const label = state === ConnectionState.Connected ? 'متصل' : state === ConnectionState.Connecting ? 'جاري الاتصال…'
    : state === ConnectionState.Disconnected ? 'انقطع الاتصال' : 'جاري إعادة الاتصال…';
  const ok = state === ConnectionState.Connected;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
      <span role="status" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: '0.85rem', color: ok ? '#22c55e' : '#fbbf24' }}>
        {ok ? <Wifi size={15} /> : state === ConnectionState.Disconnected ? <WifiOff size={15} /> : <Loader2 size={15} className="kq-spin" />} {label}
      </span>
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: 'rgba(255,255,255,0.75)', fontSize: '0.85rem' }}>
        <Users size={15} /> {participants.length} في الجلسة
      </span>
      <style>{`.kq-spin{animation:kqspin 1s linear infinite}@keyframes kqspin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}

export function LiveNotice({ title, message, action }: { title: string; message: string; action?: React.ReactNode }) {
  return (
    <div dir="rtl" style={{ minHeight: '100vh', background: 'var(--background)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', flexDirection: 'column', gap: 16, padding: 16, textAlign: 'center', fontFamily: "'Cairo', sans-serif" }}>
      <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>{title}</h2>
      <p style={{ color: 'rgba(255,255,255,0.65)', maxWidth: 480, lineHeight: 1.8 }}>{message}</p>
      {action}
    </div>
  );
}
