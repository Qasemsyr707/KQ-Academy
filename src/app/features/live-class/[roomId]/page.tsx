'use client';

import '@livekit/components-styles';
import {
  LiveKitRoom,
  VideoConference,
  RoomAudioRenderer,
} from '@livekit/components-react';
import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import React from 'react';
import { Loader2 } from 'lucide-react';

export default function LiveClassPage({ params }: { params: Promise<{ roomId: string }> }) {
  const roomId = React.use(params).roomId;
  const { data: session } = useSession();
  const [token, setToken] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!session) return;
    
    const fetchToken = async () => {
      try {
        const res = await fetch(`/api/livekit/token?room=${roomId}`);
        const data = await res.json();
        
        if (data.token) {
          setToken(data.token);
        } else {
          setError(data.error || 'فشل الحصول على تصريح الدخول');
        }
      } catch (e) {
        setError('خطأ في الاتصال بالخادم');
      }
    };
    
    fetchToken();
  }, [roomId, session]);

  if (!session) {
    return <div style={{ color: '#fff', textAlign: 'center', marginTop: '5rem' }}>يجب تسجيل الدخول</div>;
  }

  if (error) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#050505', color: '#ef4444' }}>
        <div style={{ background: '#111', padding: '2rem', borderRadius: '16px', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
          <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>خطأ في الدخول للغرفة</h2>
          <p>{error}</p>
        </div>
      </div>
    );
  }

  if (!token) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#050505', color: '#fff' }}>
        <Loader2 className="animate-spin" size={40} color="var(--primary)" />
        <span style={{ marginLeft: '1rem' }}>جاري التحضير للدخول إلى قاعة البث المباشر...</span>
        <style jsx global>{`
          .animate-spin { animation: spin 1s linear infinite; }
          @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        `}</style>
      </div>
    );
  }

  return (
    <div style={{ height: '100vh', background: '#000', direction: 'ltr' }}>
      <LiveKitRoom
        video={true}
        audio={true}
        token={token}
        serverUrl={process.env.NEXT_PUBLIC_LIVEKIT_URL}
        data-lk-theme="default"
        style={{ height: '100vh' }}
      >
        <VideoConference />
        <RoomAudioRenderer />
      </LiveKitRoom>
    </div>
  );
}
