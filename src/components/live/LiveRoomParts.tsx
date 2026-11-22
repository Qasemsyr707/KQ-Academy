'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRoomContext } from '@livekit/components-react';
import { RoomEvent, type Participant } from 'livekit-client';
import { Send } from 'lucide-react';

type ChatLine = { id: number; name: string; msg: string; time: string; mine: boolean; staff: boolean };
const MAX_CHAT = 500;
const CHAT_TOPIC = 'kq-chat';
const time = (at?: number) => new Date(at ?? Date.now()).toLocaleTimeString('ar', { hour: '2-digit', minute: '2-digit' });

/**
 * Class chat. Messages are sent through /api/live/[id]/message, which applies the class settings and
 * rate limits and then broadcasts them from the server. Only server-sent packets on the chat topic are
 * shown, so a client publishing on the data channel directly cannot bypass a disabled chat.
 */
export function useLiveChat(liveId: string) {
  const room = useRoomContext();
  const [lines, setLines] = useState<ChatLine[]>([]);
  const seq = useRef(0);
  useEffect(() => {
    const onData = (payload: Uint8Array, participant?: Participant, _kind?: unknown, topic?: string) => {
      if (participant || topic !== CHAT_TOPIC) return; // server-originated packets have no participant
      try {
        const m = JSON.parse(new TextDecoder().decode(payload));
        if (m?.type !== 'chat' || typeof m.msg !== 'string' || typeof m.from !== 'string') return;
        setLines(prev => [...prev.slice(-199), { id: ++seq.current, name: String(m.name || 'مشارك').slice(0, 80), msg: m.msg.slice(0, MAX_CHAT),
          time: time(typeof m.at === 'number' ? m.at : undefined), mine: m.from === room.localParticipant.identity, staff: m.role === 'host' || m.role === 'assistant' }]);
      } catch { /* not a chat packet */ }
    };
    room.on(RoomEvent.DataReceived, onData);
    return () => { room.off(RoomEvent.DataReceived, onData); };
  }, [room]);
  const send = useCallback(async (text: string) => {
    const msg = text.trim().slice(0, MAX_CHAT);
    if (!msg) return false;
    const res = await fetch(`/api/live/${encodeURIComponent(liveId)}/message`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ kind: 'chat', text: msg }),
    });
    if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || 'تعذّر إرسال الرسالة');
    return true;
  }, [liveId]);
  return { lines, send };
}

export type LiveChat = ReturnType<typeof useLiveChat>;

/** Messages + input only; the caller owns the chat state so it survives panel and tab switches. */
export function ChatBox({ chat, disabled = false }: { chat: LiveChat; disabled?: boolean }) {
  const { lines, send } = chat;
  const [draft, setDraft] = useState('');
  const [error, setError] = useState('');
  const [sending, setSending] = useState(false);
  const submit = async () => {
    if (sending) return;
    setError(''); setSending(true);
    try { if (await send(draft)) setDraft(''); }
    catch (e) { setError(e instanceof Error ? e.message : 'تعذّر إرسال الرسالة'); }
    finally { setSending(false); }
  };
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10, minHeight: 0 }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }} aria-live="polite" aria-label="رسائل الدردشة">
        {lines.length === 0 && <p style={{ color: 'rgba(255,255,255,0.4)', textAlign: 'center', margin: '24px 0', fontSize: '0.9rem' }}>لا توجد رسائل بعد</p>}
        {lines.map(m => (
          <div key={m.id} style={{ background: m.mine ? 'rgba(203,161,83,0.1)' : 'rgba(255,255,255,0.04)', padding: '8px 10px', borderRadius: 12, border: `1px solid ${m.mine ? 'rgba(203,161,83,0.25)' : 'rgba(255,255,255,0.05)'}` }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2, gap: 8 }}>
              <span style={{ fontWeight: 'bold', fontSize: '0.82rem', color: m.mine || m.staff ? '#c9a45c' : '#fff' }}>{m.mine ? 'أنت' : m.name}{m.staff && !m.mine ? ' • المدرّب' : ''}</span>
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
          <button type="button" onClick={() => void submit()} disabled={sending} aria-label="إرسال" style={{ width: 42, height: 42, borderRadius: 10, border: 'none', background: '#c9a45c', color: '#000', cursor: 'pointer', display: 'grid', placeItems: 'center' }}><Send size={18} /></button>
        </div>
      )}
    </div>
  );
}

export function LiveNotice({ title, message, action }: { title: string; message: string; action?: React.ReactNode }) {
  return (
    <div dir="rtl" style={{ minHeight: '100vh', background: 'var(--background)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', flexDirection: 'column', gap: 16, padding: 16, textAlign: 'center', fontFamily: "'Cairo', sans-serif" }}>
      <style>{`.kq-spin{animation:kqspin 1s linear infinite}@keyframes kqspin{to{transform:rotate(360deg)}}`}</style>
      <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>{title}</h2>
      <p style={{ color: 'rgba(255,255,255,0.65)', maxWidth: 480, lineHeight: 1.8 }}>{message}</p>
      {action}
    </div>
  );
}
