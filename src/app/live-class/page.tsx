'use client';

import '@livekit/components-styles';
import {
  LiveKitRoom,
  VideoConference,
  RoomAudioRenderer,
  PreJoin,
} from '@livekit/components-react';
import { useEffect, useState } from 'react';
import { Loader2, AlertTriangle, ArrowRight } from 'lucide-react';
import Link from 'next/link';

export default function LiveClassroom() {
  const [token, setToken] = useState('');
  const [roomName] = useState('demo-marketing-class-101');
  const [username] = useState(`طالب_${Math.floor(Math.random() * 1000)}`);
  const [preJoinComplete, setPreJoinComplete] = useState(false);
  const [connectionError, setConnectionError] = useState(false);

  const serverUrl = process.env.NEXT_PUBLIC_LIVEKIT_URL || 'wss://demo.livekit.cloud';

  useEffect(() => {
    (async () => {
      try {
        const resp = await fetch(`/api/livekit?room=${roomName}&username=${username}`);
        const data = await resp.json();
        setToken(data.token);
      } catch (e) {
        console.error(e);
      }
    })();
  }, [roomName, username]);

  if (!preJoinComplete) {
    return (
      <div style={{ height: '100vh', background: '#050505', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        <h1 style={{ color: '#fff', marginBottom: '2rem', fontSize: '2rem' }}>تجهيز البث المباشر (غرفة الانتظار)</h1>
        <div style={{ background: '#111', padding: '2rem', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.1)' }}>
          {/* PreJoin component automatically asks for camera/mic permissions and shows preview */}
          <PreJoin 
            onSubmit={() => setPreJoinComplete(true)}
            defaults={{
              videoEnabled: true,
              audioEnabled: true,
            }}
          />
        </div>
        <style jsx global>{`
          .lk-prejoin { background: transparent !important; }
        `}</style>
      </div>
    );
  }

  if (token === '') {
    return (
      <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#050505', color: '#fff' }}>
        <Loader2 size={48} className="spin" color="var(--primary)" style={{ marginBottom: '1rem' }} />
        <h2 style={{ fontSize: '1.5rem' }}>جاري الاتصال بخوادم البث المباشر (WebRTC)...</h2>
        <style jsx global>{`
          .spin { animation: spin 1s linear infinite; }
          @keyframes spin { 100% { transform: rotate(360deg); } }
        `}</style>
      </div>
    );
  }

  return (
    <div style={{ height: '100vh', background: '#000', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem 2rem', background: 'rgba(203, 161, 83, 0.1)', borderBottom: '1px solid rgba(203, 161, 83, 0.2)', color: '#fff', zIndex: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ width: '12px', height: '12px', background: '#ef4444', borderRadius: '50%', boxShadow: '0 0 15px #ef4444', animation: 'pulse 2s infinite' }}></div>
          <h1 style={{ fontSize: '1.2rem', fontWeight: 'bold', color: 'var(--primary)' }}>أكاديمية K&Q - البث المباشر التفاعلي</h1>
        </div>
        <span style={{ background: 'rgba(255,255,255,0.1)', padding: '0.4rem 1rem', borderRadius: '8px', fontSize: '0.9rem' }}>
          غرفة: التسويق المتقدم
        </span>
      </div>

      {connectionError ? (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
          <AlertTriangle size={64} color="#ef4444" style={{ marginBottom: '1rem' }} />
          <h2 style={{ fontSize: '2rem', marginBottom: '1rem' }}>تعذر الاتصال بخادم البث المباشر</h2>
          <p style={{ opacity: 0.8, maxWidth: '500px', textAlign: 'center', lineHeight: '1.6', marginBottom: '2rem' }}>
            لأننا نستخدم مفاتيح تشفير تجريبية حالياً (Development Keys)، رفض الخادم السحابي الاستضافة. 
            لكي تعمل الغرفة بشكل حقيقي، نحتاج إلى إنشاء حساب مجاني في <strong>LiveKit Cloud</strong> ووضع المفاتيح الحقيقية في ملف <code>.env</code>.
          </p>
          <Link href="/dashboard" className="btn btn-solid" style={{ display: 'flex', gap: '0.5rem' }}>
            العودة للوحة التحكم <ArrowRight size={20} />
          </Link>
        </div>
      ) : (
        <LiveKitRoom
          video={true}
          audio={true}
          token={token}
          serverUrl={serverUrl}
          data-lk-theme="default"
          style={{ flex: 1, height: 'calc(100vh - 70px)' }}
          onDisconnected={() => setConnectionError(true)}
          onError={() => setConnectionError(true)}
        >
          <VideoConference />
          <RoomAudioRenderer />
        </LiveKitRoom>
      )}

      <style jsx global>{`
        .lk-button { background-color: rgba(255, 255, 255, 0.1) !important; border-radius: 12px !important; }
        .lk-button:hover { background-color: rgba(203, 161, 83, 0.3) !important; color: #cba153 !important; }
        .lk-disconnect-button { background-color: #ef4444 !important; }
        .lk-control-bar { background-color: #0a0a0a !important; border-top: 1px solid rgba(255,255,255,0.05) !important; }
        .lk-participant-tile { border-radius: 16px !important; border: 1px solid rgba(255,255,255,0.05) !important; }
        .lk-participant-tile:hover { border-color: #cba153 !important; }
      `}</style>
    </div>
  );
}
