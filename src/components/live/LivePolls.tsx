'use client';

import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { useRoomContext } from '@livekit/components-react';
import { RoomEvent, type Participant } from 'livekit-client';
import { BarChart3, Send, CheckCircle2 } from 'lucide-react';

type Poll = { id: string; question: string; options: string[] };
type PollMessage = { type: 'kq-poll-open'; poll: Poll } | { type: 'kq-poll-vote'; id: string; choice: number } | { type: 'kq-poll-close'; id: string; totals: number[] };
const style: CSSProperties = { background: 'rgba(255,255,255,.04)', color: '#fff', border: '1px solid rgba(201,164,92,.28)', borderRadius: 9, padding: 9, font: 'inherit', minWidth: 0 };
const button: CSSProperties = { ...style, background: 'rgba(201,164,92,.17)', cursor: 'pointer', color: '#f4dfb1' };

function encode(message: PollMessage) { return new TextEncoder().encode(JSON.stringify(message)); }
function parse(payload: Uint8Array): PollMessage | null {
  try {
    const msg: unknown = JSON.parse(new TextDecoder().decode(payload));
    if (!msg || typeof msg !== 'object') return null;
    const m = msg as Record<string, unknown>;
    if (m.type === 'kq-poll-open' && m.poll && typeof m.poll === 'object') {
      const poll = m.poll as Record<string, unknown>;
      if (typeof poll.id !== 'string' || poll.id.length > 100 || typeof poll.question !== 'string' || poll.question.length > 180 ||
        !Array.isArray(poll.options) || poll.options.length < 2 || poll.options.length > 4 ||
        !poll.options.every(v => typeof v === 'string' && v.length <= 80)) return null;
      return { type: 'kq-poll-open', poll: { id: poll.id as string, question: poll.question as string, options: poll.options as string[] } };
    }
    if (m.type === 'kq-poll-vote' && typeof m.id === 'string' && m.id.length <= 100 && typeof m.choice === 'number' && Number.isInteger(m.choice)) {
      return { type: 'kq-poll-vote', id: m.id, choice: m.choice };
    }
    if (m.type === 'kq-poll-close' && typeof m.id === 'string' && m.id.length <= 100 && Array.isArray(m.totals) && m.totals.length <= 4 &&
      m.totals.every(v => typeof v === 'number' && Number.isInteger(v) && v >= 0)) {
      return { type: 'kq-poll-close', id: m.id, totals: m.totals as number[] };
    }
  } catch { /* unrecognized data packet */ }
  return null;
}

/** Ephemeral interactive learning polls. Only server-signed instructor tokens can publish a poll. */
export function HostLivePolls() {
  const room = useRoomContext();
  const [question, setQuestion] = useState('');
  const [options, setOptions] = useState(['', '']);
  const [poll, setPoll] = useState<Poll | null>(null);
  const [votes, setVotes] = useState<Record<string, number>>({});
  const [error, setError] = useState('');
  const active = useRef<Poll | null>(null);
  useEffect(() => { active.current = poll; }, [poll]);
  useEffect(() => {
    const receive = (payload: Uint8Array, participant?: Participant) => {
      const m = parse(payload);
      if (!participant || participant.metadata !== 'kq-role:student' || m?.type !== 'kq-poll-vote') return;
      if (m.id !== active.current?.id || m.choice < 0 || m.choice >= active.current.options.length) return;
      setVotes(v => ({ ...v, [participant.identity]: m.choice }));
    };
    const joining = (participant: Participant) => {
      if (!active.current) return;
      void room.localParticipant.publishData(encode({ type: 'kq-poll-open', poll: active.current }),
        { reliable: true, destinationIdentities: [participant.identity] }).catch(() => {});
    };
    room.on(RoomEvent.DataReceived, receive);
    room.on(RoomEvent.ParticipantConnected, joining);
    return () => { room.off(RoomEvent.DataReceived, receive); room.off(RoomEvent.ParticipantConnected, joining); };
  }, [room]);
  const totals = poll?.options.map((_, i) => Object.values(votes).filter(v => v === i).length) ?? [];
  const open = async () => {
    setError('');
    const clean = options.map(s => s.trim()).filter(Boolean);
    if (question.trim().length < 4 || clean.length < 2 || clean.length !== options.length) { setError('اكتب سؤالاً وخيارين على الأقل بدون حقول فارغة'); return; }
    const next: Poll = { id: `${Date.now()}_${Math.random().toString(36).slice(2, 10)}`, question: question.trim().slice(0, 180), options: clean.map(s => s.slice(0, 80)) };
    try { await room.localParticipant.publishData(encode({ type: 'kq-poll-open', poll: next }), { reliable: true }); setPoll(next); active.current = next; setVotes({}); }
    catch { setError('تعذّر إرسال الاستطلاع'); }
  };
  const close = async () => {
    if (!poll) return;
    setError('');
    try { await room.localParticipant.publishData(encode({ type: 'kq-poll-close', id: poll.id, totals }), { reliable: true }); setPoll(null); active.current = null; }
    catch { setError('تعذّر إنهاء الاستطلاع'); }
  };
  return <section dir="rtl" aria-label="استطلاع تعليمي مباشر" style={{ border: '1px solid rgba(201,164,92,.3)', background: '#272b31', borderRadius: 12, padding: 12, display: 'grid', gap: 10 }}>
    <strong style={{ display: 'flex', gap: 7, alignItems: 'center' }}><BarChart3 size={18} color="#c9a45c" /> سؤال تفاعلي مباشر</strong>
    {!poll ? <>
      <input style={style} value={question} maxLength={180} onChange={e => setQuestion(e.target.value)} placeholder="اسأل الطلاب سؤالاً سريعاً..." aria-label="نص سؤال الاستطلاع" />
      {options.map((opt, i) => <input key={i} style={style} value={opt} maxLength={80} onChange={e => setOptions(prev => prev.map((v, j) => i === j ? e.target.value : v))} placeholder={`الخيار ${i + 1}`} aria-label={`الخيار ${i + 1}`} />)}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {options.length < 4 && <button type="button" style={button} onClick={() => setOptions(o => [...o, ''])}>إضافة خيار</button>}
        {options.length > 2 && <button type="button" style={button} onClick={() => setOptions(o => o.slice(0, -1))}>حذف آخر خيار</button>}
        <button type="button" style={button} onClick={() => void open()}><Send size={15} /> إطلاق السؤال</button>
      </div>
    </> : <>
      <strong>{poll.question}</strong>
      <span style={{ fontSize: 12, color: '#bfb8a9' }}>مجموع المشاركين في التصويت: {Object.keys(votes).length}</span>
      {poll.options.map((label, i) => <div key={i} style={{ display: 'flex', gap: 9, alignItems: 'center', fontSize: 13 }}><span style={{ flex: 1 }}>{label}</span><strong>{totals[i]}</strong></div>)}
      <button type="button" style={button} onClick={() => void close()}>إنهاء السؤال وإظهار النتائج للطلاب</button>
    </>}
    {error && <span role="alert" style={{ color: '#fca5a5', fontSize: 13 }}>{error}</span>}
    <small style={{ opacity: .65 }}>الاستطلاع لحظي ولا يُستخدم للتقييم الرسمي أو إصدار الشهادات.</small>
  </section>;
}

export function StudentLivePolls() {
  const room = useRoomContext();
  const [poll, setPoll] = useState<Poll | null>(null);
  const [selection, setSelection] = useState<number | null>(null);
  const [results, setResults] = useState<number[] | null>(null);
  const [error, setError] = useState('');
  useEffect(() => {
    const receive = (payload: Uint8Array, participant?: Participant) => {
      // Signed host metadata comes from LiveKit token and cannot be changed by the viewer.
      if (!participant || participant.metadata !== 'kq-role:host') return;
      const msg = parse(payload);
      if (msg?.type === 'kq-poll-open') { setPoll(msg.poll); setSelection(null); setResults(null); setError(''); }
      if (msg?.type === 'kq-poll-close') { setPoll(prev => prev?.id === msg.id ? prev : null); setResults(msg.totals); }
    };
    room.on(RoomEvent.DataReceived, receive);
    return () => { room.off(RoomEvent.DataReceived, receive); };
  }, [room]);
  const vote = async (choice: number) => {
    if (!poll || results) return;
    try { await room.localParticipant.publishData(encode({ type: 'kq-poll-vote', id: poll.id, choice }), { reliable: true }); setSelection(choice); setError(''); }
    catch { setError('تعذّر إرسال إجابتك'); }
  };
  if (!poll) return null;
  return <section dir="rtl" aria-label="سؤال مباشر من المدرّب" style={{ background: '#292d32', padding: '11px 16px', display: 'grid', gap: 7, borderTop: '1px solid rgba(201,164,92,.25)', maxHeight: '28dvh', overflowY: 'auto' }}>
    <strong style={{ display: 'flex', gap: 7, alignItems: 'center' }}><BarChart3 size={17} color="#c9a45c" /> {poll.question}</strong>
    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
      {poll.options.map((opt, i) => <button key={i} type="button" style={{ ...button, background: selection === i ? 'rgba(201,164,92,.35)' : button.background }} disabled={!!results} aria-pressed={selection === i} onClick={() => void vote(i)}>{selection === i && <CheckCircle2 size={15} />}{opt}{results ? ` (${results[i] ?? 0})` : ''}</button>)}
    </div>
    {selection !== null && !results && <span role="status" style={{ fontSize: 12, color: '#86efac' }}>تم تسجيل اختيارك ويمكنك تغييره قبل انتهاء السؤال</span>}
    {results && <span role="status" style={{ fontSize: 12, color: '#f4dfb1' }}>انتهى التصويت، وهذه النتائج الإجمالية</span>}
    {error && <span role="alert" style={{ color: '#fca5a5' }}>{error}</span>}
  </section>;
}
