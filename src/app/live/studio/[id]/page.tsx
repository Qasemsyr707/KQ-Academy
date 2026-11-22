'use client';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { LiveKitRoom, RoomAudioRenderer } from '@livekit/components-react';
import '@livekit/components-styles';
import { DisconnectReason } from 'livekit-client';
import { Loader2, PanelLeft, Radio, StopCircle } from 'lucide-react';
import { ChatBox, LiveNotice, useLiveChat } from '@/components/live/LiveRoomParts';
import { Reactions, ShareClassButton, WhenLiveConnected, useClassEvents } from '@/components/live/ClassroomInteractions';
import { HostLivePolls } from '@/components/live/LivePolls';
import LiveConnectionHelp from '@/components/live/LiveConnectionHelp';
import {
  ClassSettingsPanel, ClassroomPreJoin, ClassroomStage, ClassroomStatus, ConnectingScreen, DeviceSettings, KQC_CSS, MediaToggles,
  ParticipantsPanel, ReconnectingBanner, SidePanel, ViewSwitcher, roomOptionsFor, useClassroomPanel, useClassroomSettings,
  useClassroomShortcuts, type ClassroomSettings, type JoinChoices, type StageView,
} from '@/components/live/ClassroomPro';

type Phase = 'connecting' | 'live' | 'start-failed';

async function setStatus(id: string, action: 'start' | 'end'): Promise<{ roomClosed?: boolean }> {
  const res = await fetch(`/api/live/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action }) });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'تعذّر تحديث حالة الجلسة');
  return data;
}

function StudioRoom({ liveId, phase, startError, initialSettings, onEnd }: {
  liveId: string; phase: Phase; startError: string; initialSettings: ClassroomSettings | null; onEnd: () => Promise<void>;
}) {
  const [view, setView] = useState<StageView>('speaker');
  const [panelOpen, setPanelOpen] = useState(true);
  const [deviceError, setDeviceError] = useState('');
  const [ending, setEnding] = useState(false);
  const chat = useLiveChat(liveId);
  const { send, reaction } = useClassEvents(liveId);
  const panel = useClassroomPanel(liveId);
  const settings = useClassroomSettings(initialSettings);
  useClassroomShortcuts({ p: () => setPanelOpen(v => !v) });
  const pending = panel.state?.participants.filter(p => p.status === 'pending').length ?? 0;
  const hands = panel.state?.participants.filter(p => p.status === 'admitted' && p.handRaisedAt).length ?? 0;
  const end = async () => {
    if (!confirm('إنهاء الحصة للجميع؟ سيُغلق البث وتخرج جميع الحسابات من الغرفة.')) return;
    setEnding(true);
    await onEnd();
    setEnding(false);
  };
  return (
    <div dir="rtl" className="kqc">
      <style>{KQC_CSS}</style>
      <header className="kqc-top">
        <div className="kqc-row">
          <span className={`kqc-chip ${phase === 'live' ? 'live' : ''}`}><Radio size={13} /> {phase === 'live' ? 'مباشر الآن' : phase === 'start-failed' ? 'لم يبدأ البث' : 'جاري بدء البث…'}</span>
          <ClassroomStatus />
          {settings?.locked && <span className="kqc-chip">الحصة مقفلة</span>}
          {reaction && settings?.reactionsEnabled !== false && <span className="kqc-chip gold" role="status">{reaction}</span>}
        </div>
        <div className="kqc-row">
          <ViewSwitcher view={view} setView={setView} />
          <button type="button" onClick={() => void end()} disabled={ending} className="kqc-btn danger">
            {ending ? <Loader2 size={17} className="kq-spin" /> : <StopCircle size={17} />}<span className="kqc-label">إنهاء الحصة</span>
          </button>
        </div>
      </header>
      {startError && <LiveConnectionHelp message={startError} />}
      <ReconnectingBanner />
      {deviceError && <p className="kqc-alert err" role="alert">{deviceError}</p>}
      <div className="kqc-body">
        <main className="kqc-stage" aria-label="المسرح الرئيسي"><ClassroomStage view={view} /></main>
        <SidePanel open={panelOpen} tabs={[
          { id: 'people', label: `المشاركون${pending ? ` • ${pending} ينتظر` : ''}${hands ? ` • ✋${hands}` : ''}`, content: <ParticipantsPanel panel={panel} /> },
          { id: 'chat', label: 'الدردشة', content: <ChatBox chat={chat} /> },
          { id: 'polls', label: 'الاستطلاع', content: <HostLivePolls /> },
          { id: 'settings', label: 'الإعدادات', content: <><ClassSettingsPanel panel={panel} /><DeviceSettings /></> },
        ]} />
      </div>
      {/* The only audio renderer in the page: one element per remote track, never doubled. */}
      <RoomAudioRenderer />
      <nav className="kqc-bar" aria-label="أدوات البث">
        <MediaToggles onError={setDeviceError} />
        <Reactions send={send} />
        <ShareClassButton liveId={liveId} />
        <button type="button" className="kqc-btn" aria-pressed={panelOpen} onClick={() => setPanelOpen(v => !v)} title="اللوحة الجانبية (Alt+P)">
          <PanelLeft size={17} /><span className="kqc-label">اللوحة</span>
        </button>
      </nav>
    </div>
  );
}

export default function StudioPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [token, setToken] = useState('');
  const [serverUrl, setServerUrl] = useState('');
  const [settings, setSettings] = useState<ClassroomSettings | null>(null);
  const [error, setError] = useState('');
  const [choices, setChoices] = useState<JoinChoices | null>(null);
  const [phase, setPhase] = useState<Phase>('connecting');
  const [startError, setStartError] = useState('');
  const [dropped, setDropped] = useState('');
  const [attempt, setAttempt] = useState(0);
  const [retrying, setRetrying] = useState(false);
  const started = useRef(false);
  const ending = useRef(false);
  const retries = useRef(0);

  const loadToken = useCallback(() => {
    let cancelled = false;
    fetch(`/api/live/token?id=${encodeURIComponent(id)}`, { cache: 'no-store' })
      .then(r => r.json().then(d => ({ ok: r.ok, d })))
      .then(({ ok, d }) => {
        if (cancelled) return;
        if (!ok || !d.token) { setError(d.error || 'تعذّر الحصول على إذن الدخول'); return; }
        // Only a host gets a publishing token; anyone else watches from the viewer page.
        if (!d.canPublish) { router.replace(`/live/room/${encodeURIComponent(id)}`); return; }
        setServerUrl(d.serverUrl); setSettings(d.settings ?? null); setToken(d.token);
      })
      .catch(() => { if (!cancelled) setError('تعذّر الاتصال بالخادم'); });
    return () => { cancelled = true; };
  }, [id, router]);
  useEffect(() => loadToken(), [loadToken]);

  // LIVE is recorded only after the host really connected to LiveKit; a reconnect never restarts it.
  const onConnected = useCallback(() => {
    retries.current = 0;
    setDropped('');
    if (started.current) return;
    started.current = true;
    setStatus(id, 'start').then(() => { setPhase('live'); setStartError(''); })
      .catch(e => { setPhase('start-failed'); setStartError(e instanceof Error ? e.message : 'تعذّر بدء البث'); started.current = false; });
  }, [id]);

  const rejoin = useCallback(() => { setToken(''); setAttempt(a => a + 1); loadToken(); }, [loadToken]);

  const onDisconnected = useCallback((reason?: DisconnectReason) => {
    if (ending.current || reason === DisconnectReason.CLIENT_INITIATED) return;
    if (reason === DisconnectReason.ROOM_DELETED) { router.push('/instructor/live'); return; }
    if (reason === DisconnectReason.DUPLICATE_IDENTITY) { setToken(''); setDropped('فُتح الاستوديو بحسابك في نافذة أو جهاز آخر.'); return; }
    // A dropped connection is not the end of the class: rejoin automatically a few times.
    if (retries.current < 3) {
      retries.current += 1;
      setRetrying(true);
      setDropped('انقطع اتصالك بخادم البث. نعيد الاتصال تلقائياً…');
      setTimeout(rejoin, 2000 * retries.current);
      return;
    }
    setToken('');
    setRetrying(false);
    setDropped('تعذّرت إعادة الاتصال تلقائياً. تحقق من الشبكة ثم أعد المحاولة؛ الحصة ما زالت قائمة.');
  }, [rejoin, router]);

  const handleEnd = useCallback(async () => {
    ending.current = true;
    try {
      const result = await setStatus(id, 'end');
      // The class is ended in the database either way. If LiveKit could not close the room, say so and let
      // the host retry (PATCH end is idempotent and only ever targets this session's own room).
      if (result.roomClosed === false) {
        setStartError('أُنهيت الحصة في المنصة، لكن تعذّر إغلاق غرفة البث على خادم LiveKit. اضغط «إنهاء الحصة» مرة أخرى لإعادة المحاولة.');
        return;
      }
      router.push('/instructor/live');
    } catch (e) { ending.current = false; setStartError(e instanceof Error ? e.message : 'تعذّر إنهاء البث'); }
  }, [id, router]);

  const options = useMemo(() => (choices ? roomOptionsFor(choices) : undefined), [choices]);

  if (error) return <LiveNotice title="لا يمكن فتح الاستوديو" message={error}
    action={<button type="button" className="btn btn-solid" onClick={() => router.push('/instructor/live')}>بثوثي المباشرة</button>} />;
  if (!token && dropped) return <LiveNotice title="انقطع الاتصال" message={dropped}
    action={retrying ? <Loader2 size={40} color="var(--primary)" className="kq-spin" /> : <button type="button" className="btn btn-solid" onClick={() => { retries.current = 0; setRetrying(false); setDropped(''); rejoin(); }}>إعادة الاتصال</button>} />;
  if (!token) return <LiveNotice title="جاري تجهيز الاستوديو" message="نتحقق من صلاحيتك ونجهّز اتصال البث…" action={<Loader2 size={40} color="var(--primary)" className="kq-spin" />} />;
  if (!choices) return <ClassroomPreJoin title="الاستعداد لبدء البث" role="host" onJoin={setChoices} />;

  return (
    <LiveKitRoom key={attempt} serverUrl={serverUrl} token={token} connect options={options}
      audio={choices.audioEnabled} video={choices.videoEnabled}
      onConnected={onConnected} onDisconnected={onDisconnected}
      onError={e => setStartError(`خطأ في الاتصال بخادم البث: ${e.message}`)}
      onMediaDeviceFailure={() => setStartError('تعذّر الوصول إلى الكاميرا أو الميكروفون؛ اسمح بهما من إعدادات المتصفح.')}>
      <WhenLiveConnected>
        <StudioRoom liveId={id} phase={phase} startError={startError} initialSettings={settings} onEnd={handleEnd} />
      </WhenLiveConnected>
      <ConnectingScreen error={startError} renderError={message => <LiveConnectionHelp message={message} />} />
    </LiveKitRoom>
  );
}
