'use client';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { LiveKitRoom, RoomAudioRenderer, useRoomContext } from '@livekit/components-react';
import '@livekit/components-styles';
import { DisconnectReason } from 'livekit-client';
import { Loader2, PanelLeft, Radio } from 'lucide-react';
import { ChatBox, LiveNotice, useLiveChat } from '@/components/live/LiveRoomParts';
import { Reactions, ShareClassButton, WhenLiveConnected, useClassEvents } from '@/components/live/ClassroomInteractions';
import { StudentLivePolls } from '@/components/live/LivePolls';
import {
  ClassroomPreJoin, ClassroomStage, ClassroomStatus, ConnectingScreen, DeviceSettings, HandButton, KQC_CSS, LeaveButton, MediaToggles,
  ParticipantsPanel, ReconnectingBanner, SidePanel, ViewSwitcher, roomOptionsFor, useClassroomPanel, useClassroomSettings,
  useClassroomShortcuts, type ClassroomSettings, type JoinChoices, type StageView,
} from '@/components/live/ClassroomPro';

const WAIT_POLL_MS = 10_000;

function AssistantTab({ liveId }: { liveId: string }) {
  const panel = useClassroomPanel(liveId);
  return <ParticipantsPanel panel={panel} />;
}

function ViewerRoom({ liveId, initialSettings, assistant, onLeave }: { liveId: string; initialSettings: ClassroomSettings | null; assistant: boolean; onLeave: () => void }) {
  const room = useRoomContext();
  const [view, setView] = useState<StageView>('speaker');
  const [panelOpen, setPanelOpen] = useState(true);
  const [deviceError, setDeviceError] = useState('');
  const chat = useLiveChat(liveId);
  const { send, reaction } = useClassEvents(liveId);
  const settings = useClassroomSettings(initialSettings);
  useClassroomShortcuts({ p: () => setPanelOpen(v => !v) });
  const chatOn = settings?.chatEnabled !== false || assistant;
  // Chat, reactions and polls are independent switches; polls are never affected by either.
  const reactionsOn = settings?.reactionsEnabled !== false;
  const tabs = [
    { id: 'chat', label: 'الدردشة', content: <ChatBox chat={chat} disabled={!chatOn} /> },
    { id: 'polls', label: 'الاستطلاع', content: <StudentLivePolls /> },
    ...(assistant ? [{ id: 'assist', label: 'إدارة (مساعد)', content: <AssistantTab liveId={liveId} /> }] : []),
    { id: 'devices', label: 'الأجهزة', content: <DeviceSettings /> },
  ];
  return (
    <div dir="rtl" className="kqc">
      <style>{KQC_CSS}</style>
      <header className="kqc-top">
        <div className="kqc-row">
          <span className="kqc-chip live"><Radio size={13} /> مباشر</span>
          <ClassroomStatus />
          {assistant && <span className="kqc-chip gold">أنت مساعد المدرّب</span>}
          {reaction && reactionsOn && <span className="kqc-chip gold" role="status">{reaction}</span>}
        </div>
        <div className="kqc-row">
          <ViewSwitcher view={view} setView={setView} />
          <LeaveButton onLeave={() => { void room.disconnect(); onLeave(); }} />
        </div>
      </header>
      <ReconnectingBanner />
      {deviceError && <p className="kqc-alert err" role="alert">{deviceError}</p>}
      <div className="kqc-body">
        <main className="kqc-stage" aria-label="المسرح الرئيسي"><ClassroomStage view={view} /></main>
        <SidePanel open={panelOpen} tabs={tabs} />
      </div>
      <RoomAudioRenderer />
      <nav className="kqc-bar" aria-label="أدوات الحصة">
        <HandButton liveId={liveId} />
        {/* Shown only once the host grants a source on the LiveKit server; state comes from LiveKit itself. */}
        <MediaToggles screenAllowed={settings?.screenShareAllowed !== false} onError={setDeviceError} />
        {reactionsOn && <Reactions send={send} />}
        <ShareClassButton liveId={liveId} />
        <button type="button" className="kqc-btn" aria-pressed={panelOpen} onClick={() => setPanelOpen(v => !v)} title="اللوحة الجانبية (Alt+P)">
          <PanelLeft size={17} /><span className="kqc-label">اللوحة</span>
        </button>
      </nav>
    </div>
  );
}

type Gate = { title: string; message: string; poll: boolean } | null;

export default function LiveRoomPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [token, setToken] = useState('');
  const [serverUrl, setServerUrl] = useState('');
  const [settings, setSettings] = useState<ClassroomSettings | null>(null);
  const [assistant, setAssistant] = useState(false);
  const [error, setError] = useState('');
  const [gate, setGate] = useState<Gate>(null);
  const [ended, setEnded] = useState<{ title: string; message: string; rejoin: boolean } | null>(null);
  const [choices, setChoices] = useState<JoinChoices | null>(null);
  const [connectError, setConnectError] = useState('');
  const [attempt, setAttempt] = useState(0);
  const retries = useRef(0);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const alive = useRef(true);
  const loadRef = useRef<() => void>(() => undefined);

  const load = useCallback(() => {
    clearTimeout(timer.current);
    fetch(`/api/live/token?id=${encodeURIComponent(id)}`, { cache: 'no-store' })
      .then(r => r.json().then(d => ({ status: r.status, d })))
      .then(({ status, d }) => {
        if (!alive.current) return;
        // 425: host not connected yet. 202: waiting room. Both are checked again automatically.
        if (status === 425 || status === 202) {
          setGate(status === 425 ? { title: 'لم يبدأ البث بعد', message: 'ستنضم تلقائياً فور اتصال المدرّب. يمكنك إبقاء هذه الصفحة مفتوحة.', poll: true }
            : { title: 'غرفة الانتظار', message: d.error || 'سيسمح لك المدرّب بالدخول قريباً.', poll: true });
          timer.current = setTimeout(() => loadRef.current(), status === 202 ? 5000 : WAIT_POLL_MS);
          return;
        }
        setGate(null);
        if (status !== 200 || !d.token) { setError(d.error || 'تعذّر الانضمام للبث'); return; }
        setServerUrl(d.serverUrl); setSettings(d.settings ?? null); setAssistant(d.seatRole === 'assistant'); setToken(d.token);
      })
      .catch(() => { if (alive.current) setError('تعذّر الاتصال بالخادم'); });
  }, [id]);
  useEffect(() => { loadRef.current = load; }, [load]);
  useEffect(() => { alive.current = true; const first = setTimeout(load, 0); return () => { clearTimeout(first); alive.current = false; clearTimeout(timer.current); }; }, [load]);

  const rejoin = useCallback(() => { setEnded(null); setConnectError(''); setToken(''); setAttempt(a => a + 1); load(); }, [load]);

  const onDisconnected = useCallback((reason?: DisconnectReason) => {
    if (reason === DisconnectReason.CLIENT_INITIATED) return;
    if (reason === DisconnectReason.ROOM_DELETED) { setEnded({ title: 'انتهت الحصة', message: 'أنهى المدرّب هذه الحصة.', rejoin: false }); return; }
    if (reason === DisconnectReason.PARTICIPANT_REMOVED) { setEnded({ title: 'خرجت من الحصة', message: 'أزالك المدرّب من هذه الحصة.', rejoin: false }); return; }
    if (reason === DisconnectReason.DUPLICATE_IDENTITY) { setEnded({ title: 'الحصة مفتوحة في مكان آخر', message: 'دخلت بحسابك من نافذة أو جهاز آخر.', rejoin: true }); return; }
    // A temporary network loss is not the end of the class: get a fresh token and reconnect.
    if (retries.current < 3) { retries.current += 1; setTimeout(rejoin, 2000 * retries.current); return; }
    setEnded({ title: 'انقطع الاتصال', message: 'تعذّرت إعادة الاتصال تلقائياً. تحقق من الشبكة ثم أعد المحاولة؛ الحصة ما زالت قائمة.', rejoin: true });
  }, [rejoin]);

  const options = useMemo(() => (choices ? roomOptionsFor(choices) : undefined), [choices]);
  const back = <button type="button" className="btn btn-solid" onClick={() => router.push('/live')}>العودة للبثوث</button>;

  if (ended) return <LiveNotice title={ended.title} message={ended.message}
    action={ended.rejoin ? <div style={{ display: 'flex', gap: 10 }}><button type="button" className="btn btn-solid" onClick={() => { retries.current = 0; rejoin(); }}>إعادة الدخول</button>{back}</div> : back} />;
  if (error) return <LiveNotice title="لا يمكن الانضمام للبث" message={error} action={back} />;
  if (gate) return <LiveNotice title={gate.title} message={gate.message} action={<Loader2 size={40} color="var(--primary)" className="kq-spin" />} />;
  if (!token) return <LiveNotice title="جاري الاتصال بالبث" message="نتحقق من اشتراكك في الكورس…" action={<Loader2 size={40} color="var(--primary)" className="kq-spin" />} />;
  if (!choices) return <ClassroomPreJoin title="الاستعداد لدخول الحصة" role="student" onJoin={setChoices} />;

  return (
    // Students join without publishing; the host grants sources on the LiveKit server when needed.
    <LiveKitRoom key={attempt} serverUrl={serverUrl} token={token} connect options={options} video={false} audio={false}
      onConnected={() => { retries.current = 0; setConnectError(''); }}
      onDisconnected={onDisconnected}
      onError={e => setConnectError(`خطأ في الاتصال بخادم البث: ${e.message}`)}>
      <WhenLiveConnected>
        <ViewerRoom liveId={id} initialSettings={settings} assistant={assistant}
          onLeave={() => setEnded({ title: 'غادرت الحصة', message: 'يمكنك العودة ما دامت الحصة قائمة.', rejoin: true })} />
      </WhenLiveConnected>
      <ConnectingScreen error={connectError} renderError={message => <><p role="alert" style={{ color: '#fca5a5' }}>{message}</p>
        <button type="button" className="btn btn-solid" onClick={() => { retries.current = 0; rejoin(); }}>إعادة المحاولة</button></>} />
    </LiveKitRoom>
  );
}
