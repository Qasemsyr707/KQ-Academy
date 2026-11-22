'use client';

/**
 * KQ Classroom Pro — shared classroom UI: pre-join device check, stage layouts,
 * toolbar bound to the real LiveKit state, connection quality, keyboard shortcuts,
 * and the host / assistant management panel backed by /api/live/[id]/classroom.
 */
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import {
  CarouselLayout, FocusLayout, GridLayout, MediaDeviceSelect, ParticipantTile, PreJoin, TrackToggle,
  isTrackReference, useConnectionQualityIndicator, useConnectionState, useLocalParticipant,
  useLocalParticipantPermissions, useMaybeTrackRefContext, useMediaDevices, useRemoteParticipants, useRoomInfo, useSpeakingParticipants, useTracks,
  type TrackReferenceOrPlaceholder,
} from '@livekit/components-react';
import { ConnectionQuality, ConnectionState, Track, type RoomOptions } from 'livekit-client';
import {
  Check, Crown, Grid3x3, Hand, Lock, LockOpen, LogOut, MicOff, Pin, PinOff, ShieldCheck, ShieldOff, Signal, Speaker, User, UserMinus, Users, Volume2, X,
} from 'lucide-react';

export const KQC_CSS = `
.kqc{--kqc-charcoal:#1c1e21;--kqc-panel:#25282c;--kqc-line:rgba(245,239,227,.09);--kqc-ivory:#f5efe3;--kqc-muted:#bdb5a6;--kqc-gold:#c9a45c;--kqc-gold-soft:rgba(201,164,92,.14);--kqc-red:#ef6b6b;
  display:flex;flex-direction:column;height:100dvh;background:var(--kqc-charcoal);color:var(--kqc-ivory);font-family:'Cairo',sans-serif;overflow:hidden}
.kqc button{font-family:inherit}
.kqc-top{display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap;padding:10px 16px;background:var(--kqc-panel);border-bottom:1px solid var(--kqc-line)}
.kqc-body{flex:1;display:flex;min-height:0}
.kqc-stage{flex:1;min-width:0;display:flex;flex-direction:column;background:#000}
.kqc-stage .lk-grid-layout{height:100%}
.kqc-side{width:340px;display:flex;flex-direction:column;background:var(--kqc-panel);border-inline-start:1px solid var(--kqc-line);min-height:0}
.kqc-tabs{display:flex;gap:4px;padding:8px;border-bottom:1px solid var(--kqc-line);overflow-x:auto}
.kqc-tab{flex:1;white-space:nowrap;border:none;border-radius:10px;padding:8px 10px;background:transparent;color:var(--kqc-muted);cursor:pointer;font-size:13px}
.kqc-tab[aria-selected=true]{background:var(--kqc-gold-soft);color:var(--kqc-gold);font-weight:700}
.kqc-scroll[hidden]{display:none}.kqc-scroll{flex:1;overflow-y:auto;padding:12px;display:grid;gap:10px;align-content:start}
.kqc-bar{display:flex;justify-content:center;align-items:center;gap:10px;flex-wrap:wrap;padding:10px 12px;background:var(--kqc-panel);border-top:1px solid var(--kqc-line)}
.kqc-btn,.kqc-bar .lk-button{display:inline-flex;align-items:center;justify-content:center;gap:7px;min-height:44px;padding:0 14px;border-radius:12px;border:1px solid var(--kqc-line);background:rgba(245,239,227,.06);color:var(--kqc-ivory);cursor:pointer;font-size:14px}
.kqc-btn:hover,.kqc-bar .lk-button:hover{border-color:rgba(201,164,92,.5)}
.kqc-btn:focus-visible,.kqc-bar .lk-button:focus-visible,.kqc-tab:focus-visible{outline:2px solid var(--kqc-gold);outline-offset:2px}
.kqc-btn[aria-pressed=true],.kqc-bar .lk-button[data-lk-enabled=true]{background:var(--kqc-gold-soft);color:var(--kqc-gold);border-color:rgba(201,164,92,.45)}
.kqc-bar .lk-button[data-lk-enabled=false]{color:var(--kqc-red)}
.kqc-btn:disabled{opacity:.45;cursor:not-allowed}
.kqc-btn.danger{color:var(--kqc-red);border-color:rgba(239,107,107,.35);background:rgba(239,107,107,.1)}
.kqc-btn.sm{min-height:32px;padding:0 9px;font-size:12px;border-radius:9px}
.kqc-card{border:1px solid var(--kqc-line);border-radius:12px;padding:10px;background:rgba(245,239,227,.03);display:grid;gap:8px}
.kqc-row{display:flex;align-items:center;gap:6px;flex-wrap:wrap}
.kqc-chip{display:inline-flex;align-items:center;gap:5px;padding:3px 9px;border-radius:999px;font-size:12px;background:rgba(245,239,227,.07);color:var(--kqc-muted)}
.kqc-chip.gold{background:var(--kqc-gold-soft);color:var(--kqc-gold)}
.kqc-chip.live{background:rgba(239,107,107,.15);color:var(--kqc-red)}
.kqc-note{margin:0;font-size:12px;color:var(--kqc-muted);line-height:1.8}
.kqc-alert{margin:0;padding:8px 16px;font-size:13px;background:rgba(251,191,36,.12);color:#fbbf24}
.kqc-alert.err{background:rgba(239,107,107,.12);color:#fca5a5}
.kqc-switch{display:flex;justify-content:space-between;align-items:center;gap:10px;font-size:14px;padding:6px 2px}
.kqc-switch input{width:18px;height:18px;accent-color:var(--kqc-gold)}
.kqc-tile{position:relative;height:100%}
.kqc-pin{position:absolute;top:8px;inset-inline-start:8px;z-index:5;width:32px;height:32px;border-radius:9px;border:none;background:rgba(0,0,0,.55);color:#fff;cursor:pointer;display:grid;place-items:center}
.kqc-prejoin{min-height:100dvh;display:grid;place-items:center;padding:16px;background:var(--kqc-charcoal);color:var(--kqc-ivory)}
.kqc-prejoin .lk-prejoin{max-width:560px;width:100%}
.kqc-select{width:100%;padding:9px;border-radius:10px;background:#1c1e21;color:var(--kqc-ivory);border:1px solid var(--kqc-line);font-family:inherit}
.kqc .lk-media-device-select{list-style:none;padding:0;margin:0;display:grid;gap:4px}
.kqc .lk-media-device-select button{width:100%;text-align:start;padding:8px;border-radius:9px;border:1px solid var(--kqc-line);background:transparent;color:var(--kqc-ivory);cursor:pointer}
.kqc .lk-media-device-select [data-lk-active=true] button{border-color:var(--kqc-gold);color:var(--kqc-gold)}
@media (max-width:900px){.kqc-body{flex-direction:column}.kqc-side{width:100%;height:42dvh;border-inline-start:none;border-top:1px solid var(--kqc-line)}}
@media (max-width:560px){.kqc-btn .kqc-label,.kqc-bar .lk-button span{display:none}.kqc-top{padding:8px 10px}}
.kq-spin{animation:kqspin 1s linear infinite}@keyframes kqspin{to{transform:rotate(360deg)}}
`;

export type ClassroomSettings = { locked: boolean; waitingRoom: boolean; chatEnabled: boolean; reactionsEnabled: boolean; screenShareAllowed: boolean };
export type JoinChoices = { audioEnabled: boolean; videoEnabled: boolean; audioDeviceId: string; videoDeviceId: string; audioOutputId: string };

/** Room options built from the pre-join choices (stable for the lifetime of a connection). */
export function roomOptionsFor(choices: JoinChoices): RoomOptions {
  return {
    adaptiveStream: true, dynacast: true,
    audioCaptureDefaults: choices.audioDeviceId ? { deviceId: choices.audioDeviceId } : undefined,
    videoCaptureDefaults: choices.videoDeviceId ? { deviceId: choices.videoDeviceId } : undefined,
    audioOutput: choices.audioOutputId ? { deviceId: choices.audioOutputId } : undefined,
  };
}

/** Settings from room metadata: only the server can write it, so it can be trusted. */
export function useClassroomSettings(initial: ClassroomSettings | null): ClassroomSettings | null {
  const { metadata } = useRoomInfo();
  return useMemo(() => {
    try {
      const parsed = metadata ? JSON.parse(metadata) : null;
      if (parsed?.kq === 1) return { locked: !!parsed.locked, waitingRoom: !!parsed.waitingRoom, chatEnabled: parsed.chatEnabled !== false,
        reactionsEnabled: parsed.reactionsEnabled !== false, screenShareAllowed: parsed.screenShareAllowed !== false };
    } catch { /* not ours */ }
    return initial;
  }, [metadata, initial]);
}

/* ---------------------------------- Pre-join --------------------------------- */

function toneUrl() {
  // 0.6 s, 660 Hz sine as an in-memory WAV, so the speaker test needs no network asset.
  const rate = 22050, length = Math.floor(rate * 0.6);
  const buffer = new ArrayBuffer(44 + length * 2); const v = new DataView(buffer);
  const w = (o: number, s: string) => { for (let i = 0; i < s.length; i++) v.setUint8(o + i, s.charCodeAt(i)); };
  w(0, 'RIFF'); v.setUint32(4, 36 + length * 2, true); w(8, 'WAVE'); w(12, 'fmt '); v.setUint32(16, 16, true); v.setUint16(20, 1, true);
  v.setUint16(22, 1, true); v.setUint32(24, rate, true); v.setUint32(28, rate * 2, true); v.setUint16(32, 2, true); v.setUint16(34, 16, true);
  w(36, 'data'); v.setUint32(40, length * 2, true);
  for (let i = 0; i < length; i++) v.setInt16(44 + i * 2, Math.sin(2 * Math.PI * 660 * i / rate) * 9000 * Math.min(1, (length - i) / 2000), true);
  return URL.createObjectURL(new Blob([buffer], { type: 'audio/wav' }));
}

export function ClassroomPreJoin({ title, role, onJoin }: { title: string; role: 'host' | 'student'; onJoin: (c: JoinChoices) => void }) {
  const outputs = useMediaDevices({ kind: 'audiooutput' });
  const [output, setOutput] = useState('');
  const [testMsg, setTestMsg] = useState('');
  const canPickOutput = typeof HTMLMediaElement !== 'undefined' && 'setSinkId' in HTMLMediaElement.prototype;
  const testSpeaker = async () => {
    setTestMsg('');
    const url = toneUrl();
    const audio = new Audio(url) as HTMLAudioElement & { setSinkId?: (id: string) => Promise<void> };
    try {
      if (output && audio.setSinkId) await audio.setSinkId(output);
      await audio.play();
      setTestMsg('هل سمعت النغمة؟ إن لم تسمعها فاختر سماعة أخرى أو ارفع الصوت.');
    } catch { setTestMsg('تعذّر تشغيل نغمة الاختبار على هذا الجهاز.'); }
    finally { setTimeout(() => URL.revokeObjectURL(url), 2000); }
  };
  return (
    <div className="kqc kqc-prejoin" dir="rtl" style={{ height: 'auto' }}>
      <style>{KQC_CSS}</style>
      <div style={{ width: '100%', maxWidth: 580, display: 'grid', gap: 14 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '1.35rem' }}>{title}</h1>
          <p className="kqc-note">
            {role === 'host' ? 'اختبر الكاميرا والميكروفون والسماعات قبل بدء البث. لن يبدأ البث للطلاب إلا بعد اتصالك.'
              : 'اختبر أجهزتك قبل الدخول. يبقى الميكروفون والكاميرا مغلقين حتى يسمح لك المدرّب.'}
          </p>
        </div>
        <div data-lk-theme="default" style={{ background: 'transparent' }}>
          <PreJoin
            persistUserChoices
            defaults={{ audioEnabled: role === 'host', videoEnabled: role === 'host' }}
            joinLabel={role === 'host' ? 'دخول الاستوديو' : 'دخول الحصة'}
            micLabel="الميكروفون" camLabel="الكاميرا" userLabel="الاسم (يظهر من حسابك)"
            onSubmit={values => onJoin({ audioEnabled: values.audioEnabled, videoEnabled: values.videoEnabled,
              audioDeviceId: values.audioDeviceId, videoDeviceId: values.videoDeviceId, audioOutputId: output })}
          />
        </div>
        <section className="kqc-card" aria-label="اختبار السماعات">
          <strong style={{ display: 'flex', gap: 8, alignItems: 'center' }}><Speaker size={17} color="#c9a45c" /> السماعات</strong>
          {canPickOutput && outputs.length > 0 && (
            <select className="kqc-select" value={output} onChange={e => setOutput(e.target.value)} aria-label="اختيار السماعة">
              <option value="">السماعة الافتراضية</option>
              {outputs.map(d => <option key={d.deviceId} value={d.deviceId}>{d.label || 'سماعة'}</option>)}
            </select>
          )}
          <button type="button" className="kqc-btn" onClick={() => void testSpeaker()}><Volume2 size={17} /> تشغيل نغمة اختبار</button>
          {testMsg && <p className="kqc-note" role="status">{testMsg}</p>}
        </section>
      </div>
    </div>
  );
}

/* ----------------------------------- Stage ----------------------------------- */

export type StageView = 'grid' | 'speaker' | 'spotlight';
const trackKey = (t: TrackReferenceOrPlaceholder) => `${t.participant.identity}:${t.source}`;

function Tile({ trackRef, pinned, onPin }: { trackRef: TrackReferenceOrPlaceholder; pinned: boolean; onPin: (key: string | null) => void }) {
  return (
    <div className="kqc-tile">
      <ParticipantTile trackRef={trackRef} />
      <button type="button" className="kqc-pin" onClick={() => onPin(pinned ? null : trackKey(trackRef))}
        aria-label={pinned ? 'إلغاء التثبيت' : `تثبيت ${trackRef.participant.name || 'المشارك'}`} title={pinned ? 'إلغاء التثبيت' : 'تثبيت'}>
        {pinned ? <PinOff size={16} /> : <Pin size={16} />}
      </button>
    </div>
  );
}

/**
 * Grid: everyone. Speaker: the active speaker (or a shared screen) large, others in a strip.
 * Spotlight: only the focused track. A pinned tile overrides the automatic focus; a new
 * screen share takes focus automatically so it is always shown large.
 */
export function ClassroomStage({ view }: { view: StageView }) {
  const tracks = useTracks([{ source: Track.Source.Camera, withPlaceholder: true }, { source: Track.Source.ScreenShare, withPlaceholder: false }],
    { onlySubscribed: false });
  const speakers = useSpeakingParticipants();
  const [pinnedKey, setPinned] = useState<string | null>(null);
  const [lastSpeaker, setLastSpeaker] = useState<string | null>(null);
  const current = speakers[0]?.identity ?? null;
  // Remember the most recent speaker so the speaker view does not jump away during silence.
  if (current && current !== lastSpeaker) setLastSpeaker(current);
  // A pin on a track that has gone away is simply ignored.
  const pinned = pinnedKey && tracks.some(t => trackKey(t) === pinnedKey) ? pinnedKey : null;
  const screen = tracks.find(t => t.source === Track.Source.ScreenShare && isTrackReference(t));
  const focus = tracks.find(t => trackKey(t) === pinned)
    ?? screen
    ?? tracks.find(t => t.source === Track.Source.Camera && t.participant.identity === lastSpeaker)
    ?? tracks[0];

  if (!tracks.length) return <div style={{ flex: 1, display: 'grid', placeItems: 'center', color: '#bdb5a6' }}>لا يوجد بث مرئي بعد</div>;
  if (view === 'grid' && !pinned) {
    return <div style={{ flex: 1, minHeight: 0 }} data-lk-theme="default">
      <GridLayout tracks={tracks} style={{ height: '100%' }}>
        <GridTile pinned={pinned} onPin={setPinned} />
      </GridLayout>
    </div>;
  }
  const others = tracks.filter(t => focus && trackKey(t) !== trackKey(focus));
  return (
    <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }} data-lk-theme="default">
      <div style={{ flex: 1, minHeight: 0, position: 'relative' }}>
        {focus && <FocusLayout trackRef={focus} style={{ height: '100%' }} />}
        {focus && <button type="button" className="kqc-pin" onClick={() => setPinned(pinned ? null : trackKey(focus))}
          aria-label={pinned ? 'إلغاء التثبيت' : 'تثبيت هذا العرض'}>{pinned ? <PinOff size={16} /> : <Pin size={16} />}</button>}
      </div>
      {view !== 'spotlight' && others.length > 0 && (
        <div style={{ height: 120, flexShrink: 0 }}>
          <CarouselLayout tracks={others} orientation="horizontal" style={{ height: '100%' }}>
            <GridTile pinned={pinned} onPin={setPinned} />
          </CarouselLayout>
        </div>
      )}
    </div>
  );
}

/** Rendered inside a LiveKit layout, which provides the track through context. */
function GridTile({ pinned, onPin }: { pinned: string | null; onPin: (key: string | null) => void }) {
  return <ParticipantTileWithPin pinned={pinned} onPin={onPin} />;
}
function ParticipantTileWithPin({ pinned, onPin }: { pinned: string | null; onPin: (key: string | null) => void }) {
  const ref = useMaybeTrackRefContext();
  if (!ref) return <ParticipantTile />;
  return <Tile trackRef={ref} pinned={pinned === trackKey(ref)} onPin={onPin} />;
}

/* ------------------------------ Status & toolbar ----------------------------- */

const QUALITY: Record<string, { label: string; color: string }> = {
  [ConnectionQuality.Excellent]: { label: 'ممتازة', color: '#22c55e' },
  [ConnectionQuality.Good]: { label: 'جيدة', color: '#a3e635' },
  [ConnectionQuality.Poor]: { label: 'ضعيفة', color: '#fbbf24' },
  [ConnectionQuality.Lost]: { label: 'مفقودة', color: '#ef6b6b' },
};

/** Connection state, own network quality and the real number of other people in the room. */
export function ClassroomStatus() {
  const state = useConnectionState();
  const { quality } = useConnectionQualityIndicator();
  const remote = useRemoteParticipants();
  const q = QUALITY[quality] ?? { label: 'غير معروفة', color: '#bdb5a6' };
  const stateLabel = state === ConnectionState.Connected ? 'متصل' : state === ConnectionState.Reconnecting || state === ConnectionState.SignalReconnecting
    ? 'إعادة الاتصال…' : state === ConnectionState.Connecting ? 'جاري الاتصال…' : 'غير متصل';
  return (
    <div className="kqc-row" role="status" aria-live="polite">
      <span className={`kqc-chip ${state === ConnectionState.Connected ? 'gold' : ''}`}>{stateLabel}</span>
      {state === ConnectionState.Connected && <span className="kqc-chip" title="جودة اتصالك"><Signal size={13} color={q.color} /> الشبكة {q.label}</span>}
      <span className="kqc-chip"><Users size={13} /> {remote.length} مشارك آخر</span>
    </div>
  );
}

/** Until LiveKit's signal connection succeeds, nothing else is shown: no tool may look usable before it. */
export function ConnectingScreen({ error, renderError }: { error: string; renderError: (message: string) => ReactNode }) {
  const state = useConnectionState();
  if (state === ConnectionState.Connected || state === ConnectionState.Reconnecting || state === ConnectionState.SignalReconnecting) return null;
  return (
    <div dir="rtl" className="kqc" style={{ display: 'grid', placeItems: 'center', padding: 16 }}>
      <style>{KQC_CSS}</style>
      <div style={{ maxWidth: 540, width: '100%', display: 'grid', gap: 12, textAlign: 'center' }}>
        {error ? renderError(error) : <><span className="kq-spin" style={{ display: 'inline-block', margin: '0 auto', width: 36, height: 36, borderRadius: '50%', border: '3px solid rgba(201,164,92,.25)', borderTopColor: '#c9a45c' }} />
          <p style={{ margin: 0 }}>جاري الاتصال بخادم البث…</p></>}
      </div>
    </div>
  );
}

export function ReconnectingBanner() {
  const state = useConnectionState();
  if (state !== ConnectionState.Reconnecting && state !== ConnectionState.SignalReconnecting) return null;
  return <p className="kqc-alert" role="status">انقطع الاتصال مؤقتاً. نعيد الاتصال تلقائياً ولن تنتهي الحصة بسبب ذلك…</p>;
}

/** Alt+M mic, Alt+V camera, Alt+S screen, Alt+L layout, Alt+P panel. Ignored while typing. */
export function useClassroomShortcuts(handlers: Partial<Record<'m' | 'v' | 's' | 'l' | 'p' | 'h', () => void>>) {
  const ref = useRef(handlers);
  useEffect(() => { ref.current = handlers; });
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!e.altKey || e.ctrlKey || e.metaKey) return;
      const target = e.target as HTMLElement | null;
      if (target && (target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName))) return;
      const key = e.code.replace('Key', '').toLowerCase() as 'm';
      const run = ref.current[key];
      if (run) { e.preventDefault(); run(); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);
}

/** Media toggles: TrackToggle reads and writes the real LiveKit track state. Hidden when not permitted. */
export function MediaToggles({ screenAllowed = true, onError }: { screenAllowed?: boolean; onError: (message: string) => void }) {
  const permissions = useLocalParticipantPermissions();
  const { localParticipant, isMicrophoneEnabled, isCameraEnabled, isScreenShareEnabled } = useLocalParticipant();
  const sources = permissions?.canPublishSources ?? [];
  const allowed = (s: Track.Source) => !!permissions?.canPublish && (!sources.length || sources.includes(Track.sourceToProto(s)));
  const deviceError = (e: Error) => onError(e.name === 'NotAllowedError' ? 'رفض المتصفح الوصول؛ اسمح بالجهاز من إعدادات الموقع.'
    : e.name === 'NotFoundError' ? 'لم يُعثر على الجهاز المطلوب.' : 'تعذّر تشغيل الجهاز المطلوب.');
  const safe = (fn: () => Promise<unknown>) => () => { fn().catch(e => deviceError(e instanceof Error ? e : new Error('device'))); };
  useClassroomShortcuts({
    m: allowed(Track.Source.Microphone) ? safe(() => localParticipant.setMicrophoneEnabled(!isMicrophoneEnabled)) : undefined,
    v: allowed(Track.Source.Camera) ? safe(() => localParticipant.setCameraEnabled(!isCameraEnabled)) : undefined,
    s: allowed(Track.Source.ScreenShare) && screenAllowed ? safe(() => localParticipant.setScreenShareEnabled(!isScreenShareEnabled)) : undefined,
  });
  return <>
    {allowed(Track.Source.Microphone) && <TrackToggle source={Track.Source.Microphone} onDeviceError={deviceError} aria-label="الميكروفون (Alt+M)" title="الميكروفون (Alt+M)"><span>الميكروفون</span></TrackToggle>}
    {allowed(Track.Source.Camera) && <TrackToggle source={Track.Source.Camera} onDeviceError={deviceError} aria-label="الكاميرا (Alt+V)" title="الكاميرا (Alt+V)"><span>الكاميرا</span></TrackToggle>}
    {allowed(Track.Source.ScreenShare) && screenAllowed && <TrackToggle source={Track.Source.ScreenShare} captureOptions={{ audio: true }} onDeviceError={deviceError} aria-label="مشاركة الشاشة (Alt+S)" title="مشاركة الشاشة (Alt+S)"><span>الشاشة</span></TrackToggle>}
  </>;
}

export function ViewSwitcher({ view, setView }: { view: StageView; setView: (v: StageView) => void }) {
  const order: StageView[] = ['grid', 'speaker', 'spotlight'];
  useClassroomShortcuts({ l: () => setView(order[(order.indexOf(view) + 1) % order.length]) });
  const labels: Record<StageView, string> = { grid: 'شبكة', speaker: 'المتحدث', spotlight: 'تركيز' };
  return <div className="kqc-row" role="group" aria-label="طريقة العرض (Alt+L)">
    {order.map(v => <button key={v} type="button" className="kqc-btn sm" aria-pressed={view === v} onClick={() => setView(v)}>
      {v === 'grid' ? <Grid3x3 size={14} /> : v === 'speaker' ? <User size={14} /> : <Crown size={14} />}<span className="kqc-label">{labels[v]}</span>
    </button>)}
  </div>;
}

export function DeviceSettings() {
  return <div style={{ display: 'grid', gap: 12 }}>
    {([['audioinput', 'الميكروفون'], ['videoinput', 'الكاميرا'], ['audiooutput', 'السماعات']] as const).map(([kind, label]) => (
      <section key={kind} className="kqc-card" aria-label={label}>
        <strong style={{ fontSize: 14 }}>{label}</strong>
        <MediaDeviceSelect kind={kind} requestPermissions={false} />
      </section>
    ))}
    <p className="kqc-note">الاختصارات: Alt+M الميكروفون، Alt+V الكاميرا، Alt+S الشاشة، Alt+L طريقة العرض، Alt+P اللوحة الجانبية، Alt+H رفع اليد.</p>
  </div>;
}

/* --------------------------- Host / assistant panel --------------------------- */

type Seat = { userId: string; name: string; status: string; role: string; online: boolean; handRaisedAt: string | null; removedReason: string | null };
type AuditRow = { id: string; action: string; actorId: string; targetUserId: string | null; createdAt: string };
type PanelState = { power: 'host' | 'assistant'; status: string; settings: ClassroomSettings; liveKitReady: boolean; participants: Seat[]; audit: AuditRow[] };

const ACTION_LABELS: Record<string, string> = {
  admit: 'قبول دخول', deny: 'رفض دخول', lowerHand: 'إنزال يد', mute: 'كتم', muteAll: 'كتم الجميع', grant: 'منح صلاحية', revoke: 'سحب صلاحية',
  remove: 'إزالة', setAssistant: 'تعيين مساعد', unsetAssistant: 'إلغاء مساعد', settings: 'تعديل الإعدادات', end: 'إنهاء الحصة',
};
const SETTING_LABELS: Record<keyof ClassroomSettings, string> = {
  locked: 'قفل الحصة أمام المنضمين الجدد', waitingRoom: 'غرفة انتظار (قبول يدوي)', chatEnabled: 'السماح بالدردشة للطلاب',
  reactionsEnabled: 'السماح بالتفاعلات', screenShareAllowed: 'السماح للطلاب بمشاركة الشاشة',
};

export function useClassroomPanel(liveId: string) {
  const [state, setState] = useState<PanelState | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState('');
  const [notice, setNotice] = useState('');
  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/live/${encodeURIComponent(liveId)}/classroom`, { cache: 'no-store' });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) { setError(json.error || 'تعذّر تحميل لوحة الإدارة'); return; }
      setError(''); setState(json);
    } catch { setError('تعذّر الاتصال بالخادم'); }
  }, [liveId]);
  useEffect(() => {
    const first = setTimeout(() => void load(), 0);
    const t = setInterval(() => { if (document.visibilityState === 'visible') void load(); }, 4000);
    return () => { clearTimeout(first); clearInterval(t); };
  }, [load]);
  const act = useCallback(async (body: Record<string, unknown>, key: string) => {
    setBusy(key); setNotice('');
    try {
      const res = await fetch(`/api/live/${encodeURIComponent(liveId)}/classroom`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      const json = await res.json().catch(() => ({}));
      setNotice(res.ok ? json.message : json.error || 'تعذّر تنفيذ الإجراء');
      await load();
    } catch { setNotice('تعذّر الاتصال بالخادم'); }
    finally { setBusy(''); }
  }, [liveId, load]);
  return { state, error, busy, notice, act, reload: load };
}

export function ParticipantsPanel({ panel }: { panel: ReturnType<typeof useClassroomPanel> }) {
  const { state, error, busy, notice, act } = panel;
  if (error && !state) return <p className="kqc-note" role="alert">{error}</p>;
  if (!state) return <p className="kqc-note">جاري تحميل المشاركين…</p>;
  const host = state.power === 'host';
  const pending = state.participants.filter(p => p.status === 'pending');
  const admitted = state.participants.filter(p => p.status === 'admitted');
  const hands = admitted.filter(p => p.handRaisedAt).sort((a, b) => a.handRaisedAt!.localeCompare(b.handRaisedAt!));
  const online = admitted.filter(p => p.online);
  const offline = admitted.filter(p => !p.online);
  const removed = state.participants.filter(p => p.status === 'removed' || p.status === 'denied');
  const b = (key: string) => busy === key;
  const remove = (p: Seat) => {
    const reason = window.prompt(`سبب إزالة ${p.name} (اختياري):`, '');
    if (reason === null) return;
    void act({ action: 'remove', userId: p.userId, reason }, `remove:${p.userId}`);
  };
  const row = (p: Seat) => (
    <div key={p.userId} className="kqc-card">
      <div className="kqc-row" style={{ justifyContent: 'space-between' }}>
        <strong style={{ fontSize: 14 }}>{p.name}</strong>
        <span className="kqc-row">
          {p.role === 'assistant' && <span className="kqc-chip gold"><ShieldCheck size={12} /> مساعد</span>}
          <span className={`kqc-chip ${p.online ? 'gold' : ''}`}>{p.online ? 'متصل' : 'غير متصل'}</span>
        </span>
      </div>
      {p.online && <div className="kqc-row">
        <button type="button" className="kqc-btn sm" disabled={b(`g:${p.userId}`)} onClick={() => void act({ action: 'grant', userId: p.userId, media: 'microphone' }, `g:${p.userId}`)}>صوت</button>
        <button type="button" className="kqc-btn sm" disabled={b(`g:${p.userId}`)} onClick={() => void act({ action: 'grant', userId: p.userId, media: 'camera' }, `g:${p.userId}`)}>صوت وكاميرا</button>
        {state.settings.screenShareAllowed && <button type="button" className="kqc-btn sm" disabled={b(`g:${p.userId}`)} onClick={() => void act({ action: 'grant', userId: p.userId, media: 'screen' }, `g:${p.userId}`)}>+ الشاشة</button>}
        <button type="button" className="kqc-btn sm" disabled={b(`r:${p.userId}`)} onClick={() => void act({ action: 'revoke', userId: p.userId }, `r:${p.userId}`)}><ShieldOff size={13} /> سحب</button>
        <button type="button" className="kqc-btn sm" disabled={b(`m:${p.userId}`)} onClick={() => void act({ action: 'mute', userId: p.userId }, `m:${p.userId}`)}><MicOff size={13} /> كتم</button>
      </div>}
      {host && <div className="kqc-row">
        <button type="button" className="kqc-btn sm" disabled={b(`a:${p.userId}`)} onClick={() => void act({ action: p.role === 'assistant' ? 'unsetAssistant' : 'setAssistant', userId: p.userId }, `a:${p.userId}`)}>
          {p.role === 'assistant' ? 'إلغاء المساعد' : 'تعيين مساعداً'}</button>
        <button type="button" className="kqc-btn sm danger" disabled={b(`remove:${p.userId}`)} onClick={() => remove(p)}><UserMinus size={13} /> إزالة</button>
      </div>}
    </div>
  );
  return <>
    {notice && <p className="kqc-note" role="status" style={{ color: '#f5e4bc' }}>{notice}</p>}
    {!state.liveKitReady && <p className="kqc-note" role="alert">خدمة البث غير مهيأة على الخادم؛ إجراءات الوسائط لن تعمل.</p>}
    {host && <button type="button" className="kqc-btn danger" disabled={b('muteAll')} onClick={() => void act({ action: 'muteAll' }, 'muteAll')}><MicOff size={16} /> كتم جميع الطلاب</button>}
    {pending.length > 0 && <section aria-label="غرفة الانتظار" style={{ display: 'grid', gap: 8 }}>
      <strong>غرفة الانتظار ({pending.length})</strong>
      {pending.map(p => <div key={p.userId} className="kqc-card"><div className="kqc-row" style={{ justifyContent: 'space-between' }}>
        <span>{p.name}</span>
        <span className="kqc-row">
          <button type="button" className="kqc-btn sm" disabled={b(`ad:${p.userId}`)} onClick={() => void act({ action: 'admit', userId: p.userId }, `ad:${p.userId}`)}><Check size={13} /> قبول</button>
          <button type="button" className="kqc-btn sm danger" disabled={b(`ad:${p.userId}`)} onClick={() => void act({ action: 'deny', userId: p.userId }, `ad:${p.userId}`)}><X size={13} /> رفض</button>
        </span>
      </div></div>)}
    </section>}
    {hands.length > 0 && <section aria-label="الأيدي المرفوعة" style={{ display: 'grid', gap: 8 }}>
      <strong style={{ display: 'flex', gap: 6, alignItems: 'center' }}><Hand size={16} color="#c9a45c" /> الأيدي المرفوعة بالترتيب ({hands.length})</strong>
      {hands.map((p, i) => <div key={p.userId} className="kqc-card"><div className="kqc-row" style={{ justifyContent: 'space-between' }}>
        <span>{i + 1}. {p.name}</span>
        <span className="kqc-row">
          {p.online && <button type="button" className="kqc-btn sm" disabled={b(`g:${p.userId}`)} onClick={() => void act({ action: 'grant', userId: p.userId, media: 'microphone' }, `g:${p.userId}`)}>السماح بالتحدث</button>}
          <button type="button" className="kqc-btn sm" disabled={b(`h:${p.userId}`)} onClick={() => void act({ action: 'lowerHand', userId: p.userId }, `h:${p.userId}`)}>إنزال</button>
        </span>
      </div></div>)}
    </section>}
    <strong>المتصلون الآن ({online.length})</strong>
    {online.length === 0 && <p className="kqc-note">لم ينضم أي طالب بعد.</p>}
    {online.map(row)}
    {offline.length > 0 && <details><summary className="kqc-note" style={{ cursor: 'pointer' }}>دخلوا ثم غادروا ({offline.length})</summary><div style={{ display: 'grid', gap: 8, marginTop: 8 }}>{offline.map(row)}</div></details>}
    {removed.length > 0 && <details><summary className="kqc-note" style={{ cursor: 'pointer' }}>مُزالون أو مرفوضون ({removed.length})</summary>
      {removed.map(p => <p key={p.userId} className="kqc-note">{p.name} — {p.status === 'removed' ? 'أُزيل' : 'رُفض'}{p.removedReason ? `: ${p.removedReason}` : ''}</p>)}</details>}
  </>;
}

export function ClassSettingsPanel({ panel }: { panel: ReturnType<typeof useClassroomPanel> }) {
  const { state, busy, act } = panel;
  if (!state) return null;
  if (state.power !== 'host') return <p className="kqc-note">إعدادات الحصة متاحة للمدرّب فقط.</p>;
  const names = state.participants.reduce<Record<string, string>>((m, p) => { m[p.userId] = p.name; return m; }, {});
  return <>
    <section className="kqc-card" aria-label="إعدادات الحصة">
      {(Object.keys(SETTING_LABELS) as (keyof ClassroomSettings)[]).map(key => (
        <label key={key} className="kqc-switch">
          <span style={{ display: 'flex', gap: 6, alignItems: 'center' }}>{key === 'locked' ? (state.settings.locked ? <Lock size={15} /> : <LockOpen size={15} />) : null}{SETTING_LABELS[key]}</span>
          <input type="checkbox" checked={state.settings[key]} disabled={busy === `s:${key}`}
            onChange={e => void act({ action: 'settings', [key]: e.target.checked }, `s:${key}`)} />
        </label>
      ))}
      <p className="kqc-note">القفل يمنع المنضمين الجدد فقط؛ الطالب الذي انقطع اتصاله يعود تلقائياً. إيقاف الدردشة يوقف أيضاً التصويت والتفاعلات للطلاب لأنها تمر عبر قناة البيانات نفسها.</p>
    </section>
    <section className="kqc-card" aria-label="سجل الإجراءات">
      <strong style={{ fontSize: 14 }}>سجل الإجراءات</strong>
      {state.audit.length === 0 && <p className="kqc-note">لا توجد إجراءات بعد.</p>}
      {state.audit.map(a => <p key={a.id} className="kqc-note">
        {new Date(a.createdAt).toLocaleTimeString('ar', { hour: '2-digit', minute: '2-digit' })} — {ACTION_LABELS[a.action] ?? a.action}
        {a.targetUserId ? ` — ${names[a.targetUserId] ?? 'طالب'}` : ''}
      </p>)}
    </section>
  </>;
}

/* ------------------------------- Student controls ------------------------------ */

/** Hand raise stored on the server: ordered, survives reconnects, visible to host and assistants. */
export function HandButton({ liveId }: { liveId: string }) {
  const [raised, setRaised] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => {
    let alive = true;
    const sync = () => fetch(`/api/live/${encodeURIComponent(liveId)}/hand`, { cache: 'no-store' }).then(r => r.ok ? r.json() : null)
      .then(j => { if (alive && j) setRaised(!!j.handRaised); }).catch(() => undefined);
    void sync();
    const t = setInterval(sync, 8000);
    return () => { alive = false; clearInterval(t); };
  }, [liveId]);
  const toggle = useCallback(async () => {
    setError('');
    try {
      const res = await fetch(`/api/live/${encodeURIComponent(liveId)}/hand`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ raised: !raised }) });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || 'تعذّر إرسال الطلب');
      setRaised(json.raised);
    } catch (e) { setError(e instanceof Error ? e.message : 'تعذّر إرسال الطلب'); }
  }, [liveId, raised]);
  useClassroomShortcuts({ h: () => void toggle() });
  return <>
    <button type="button" className="kqc-btn" aria-pressed={raised} onClick={() => void toggle()} title="رفع اليد (Alt+H)">
      <Hand size={18} /><span className="kqc-label">{raised ? 'إنزال اليد' : 'رفع اليد'}</span>
    </button>
    {error && <span role="alert" style={{ fontSize: 12, color: '#fca5a5' }}>{error}</span>}
  </>;
}

export function LeaveButton({ onLeave, label = 'مغادرة' }: { onLeave: () => void; label?: string }) {
  return <button type="button" className="kqc-btn danger" onClick={onLeave}><LogOut size={17} /><span className="kqc-label">{label}</span></button>;
}

export function SidePanel({ tabs, open }: { tabs: { id: string; label: string; content: ReactNode }[]; open: boolean }) {
  const [active, setActive] = useState(tabs[0]?.id);
  const current = tabs.find(t => t.id === active) ?? tabs[0];
  // Every tab stays mounted (only hidden) so an open poll or the chat history is never lost.
  return (
    <aside className="kqc-side" aria-label="لوحة الحصة" style={open ? undefined : { display: 'none' }}>
      <div className="kqc-tabs" role="tablist">
        {tabs.map(t => <button key={t.id} id={`kqc-tab-${t.id}`} type="button" role="tab" className="kqc-tab" aria-selected={t.id === current?.id} aria-controls={`kqc-panel-${t.id}`} onClick={() => setActive(t.id)}>{t.label}</button>)}
      </div>
      {tabs.map(t => <div key={t.id} id={`kqc-panel-${t.id}`} className="kqc-scroll" role="tabpanel" aria-labelledby={`kqc-tab-${t.id}`} hidden={t.id !== current?.id}>{t.content}</div>)}
    </aside>
  );
}

