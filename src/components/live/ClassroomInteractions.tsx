'use client';

import { useCallback, useEffect, useState, type CSSProperties, type ReactNode } from 'react';
import { useConnectionState, useRoomContext } from '@livekit/components-react';
import { ConnectionState, RoomEvent, type Participant } from 'livekit-client';
import { Share2, Smile } from 'lucide-react';

const REACTION_TOPIC = 'kq-reaction';
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
    <button type="button" onClick={() => void onClick()} className="kqc-btn" aria-label="مشاركة رابط الصف"><Share2 size={17} /><span className="kqc-label">مشاركة الصف</span></button>
    {message && <span role="status" style={{ fontSize: 12, color: '#e7d5b3', overflowWrap: 'anywhere' }}>{message}</span>}
  </div>;
}

/**
 * Reactions are sent through /api/live/[id]/message (settings + rate limit on the server) and only
 * server-sent packets are shown. Raising a hand is a separate server API (HandButton).
 */
export function useClassEvents(liveId: string) {
  const room = useRoomContext();
  const [reaction, setReaction] = useState('');
  useEffect(() => {
    let clear: ReturnType<typeof setTimeout> | undefined;
    const onData = (data: Uint8Array, participant?: Participant, _kind?: unknown, topic?: string) => {
      if (participant || topic !== REACTION_TOPIC) return;
      try {
        const m = JSON.parse(new TextDecoder().decode(data));
        if (m?.type !== 'reaction' || typeof m.emoji !== 'string' || !emojis.includes(m.emoji)) return;
        setReaction(`${String(m.name || 'مشارك').slice(0, 60)} ${m.emoji}`);
        clearTimeout(clear);
        clear = setTimeout(() => setReaction(''), 5000);
      } catch { /* other packets */ }
    };
    room.on(RoomEvent.DataReceived, onData);
    return () => { clearTimeout(clear); room.off(RoomEvent.DataReceived, onData); };
  }, [room]);
  const send = useCallback(async (emoji: string) => {
    const res = await fetch(`/api/live/${encodeURIComponent(liveId)}/message`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ kind: 'reaction', emoji }),
    });
    if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || 'تعذّر إرسال التفاعل');
  }, [liveId]);
  return { reaction, send };
}

export function Reactions({ send }: { send: (emoji: string) => Promise<void> }) {
  const [error, setError] = useState('');
  return <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', alignItems: 'center' }} aria-label="تفاعلات الصف">
    <Smile size={18} color="#c9a45c" aria-hidden="true" />
    {emojis.map(emoji => <button type="button" key={emoji} style={{ ...small, fontSize: 18, minWidth: 36 }} aria-label={`إرسال تفاعل ${emoji}`}
      onClick={() => { setError(''); void send(emoji).catch(e => setError(e instanceof Error ? e.message : 'تعذّر إرسال التفاعل')); }}>{emoji}</button>)}
    {error && <span role="alert" style={{ fontSize: 12, color: '#fca5a5' }}>{error}</span>}
  </div>;
}

/** Classroom tools appear only once the LiveKit signal connection really succeeded. */
export function WhenLiveConnected({ children }: { children: ReactNode }) {
  const state = useConnectionState();
  return state === ConnectionState.Connected || state === ConnectionState.Reconnecting || state === ConnectionState.SignalReconnecting ? <>{children}</> : null;
}
