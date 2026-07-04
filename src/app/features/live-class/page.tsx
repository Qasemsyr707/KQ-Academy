'use client';

import { useState, useEffect } from 'react';
import { LiveKitRoom, VideoConference, RoomAudioRenderer, ControlBar, GridLayout, ParticipantTile } from '@livekit/components-react';
import '@livekit/components-styles';
import { motion } from 'framer-motion';
import { Users, MessageSquare, Hand, Share, Settings, Video, Mic, StopCircle } from 'lucide-react';
import Link from 'next/link';

export default function LiveClassPage() {
  const [token, setToken] = useState('');
  const [demoMode, setDemoMode] = useState(false);
  const [roomName] = useState('demo-room');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function getToken() {
      try {
        const res = await fetch(`/api/live/token?room=${roomName}`);
        const data = await res.json();
        
        if (data.demoMode) {
          setDemoMode(true);
        } else {
          setToken(data.token);
        }
      } catch (e) {
        setDemoMode(true);
      }
      setIsLoading(false);
    }
    getToken();
  }, [roomName]);

  if (isLoading) {
    return <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#050505', color: '#fff' }}>جاري التحضير لدخول الغرفة...</div>;
  }

  // If we have API keys and a real token, render the real LiveKit Room
  if (!demoMode && token) {
    return (
      <div style={{ height: '100vh', background: '#050505' }}>
        <LiveKitRoom
          video={false}
          audio={false}
          token={token}
          serverUrl={process.env.NEXT_PUBLIC_LIVEKIT_URL}
          data-lk-theme="default"
          style={{ height: '100%' }}
        >
          <VideoConference />
          <RoomAudioRenderer />
        </LiveKitRoom>
      </div>
    );
  }

  // DEMO MODE: Beautiful mock UI since we don't have API keys yet
  return (
    <div style={{ display: 'flex', height: '100vh', background: '#050505', color: '#fff', overflow: 'hidden' }}>
      {/* Main Video Area */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '1rem', position: 'relative' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', padding: '0 1rem' }}>
          <div>
            <h1 style={{ fontSize: '1.2rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ display: 'inline-block', width: '10px', height: '10px', background: '#ef4444', borderRadius: '50%', animation: 'pulse 2s infinite' }} />
              البث المباشر: تطبيقات React المتقدمة
            </h1>
            <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.9rem' }}>المدرب: خالد المبرمج | المدة: 45 دقيقة</p>
          </div>
          <Link href="/dashboard" style={{ background: 'rgba(239, 68, 68, 0.2)', color: '#ef4444', padding: '0.5rem 1.5rem', borderRadius: '8px', textDecoration: 'none', fontWeight: 'bold' }}>
            مغادرة القاعة
          </Link>
        </div>

        {/* Video Grid Simulation */}
        <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '1fr', gap: '1rem', background: '#111', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.05)', overflow: 'hidden', position: 'relative' }}>
          {/* Main Instructor Video Placeholder */}
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, background: 'url(https://images.unsplash.com/photo-1516321318423-f06f85e504b3?q=80&w=2000&auto=format&fit=crop) center/cover' }}>
            <div style={{ position: 'absolute', bottom: '1rem', left: '1rem', background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(10px)', padding: '0.5rem 1rem', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Mic size={16} color="var(--success)" /> <span style={{ fontWeight: 'bold' }}>المدرب خالد</span>
            </div>
          </div>
        </div>

        {/* Control Bar Simulation */}
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '1rem', marginTop: '1rem', padding: '1rem', background: 'rgba(255,255,255,0.02)', borderRadius: '16px' }}>
          <button style={{ width: '50px', height: '50px', borderRadius: '50%', background: 'rgba(255,255,255,0.1)', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', cursor: 'pointer' }}><Mic size={24} /></button>
          <button style={{ width: '50px', height: '50px', borderRadius: '50%', background: 'rgba(255,255,255,0.1)', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', cursor: 'pointer' }}><Video size={24} /></button>
          <button style={{ width: '50px', height: '50px', borderRadius: '50%', background: 'rgba(255,255,255,0.1)', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', cursor: 'pointer' }}><Share size={24} /></button>
          <button style={{ width: '50px', height: '50px', borderRadius: '50%', background: 'rgba(203, 161, 83, 0.2)', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--warning)', cursor: 'pointer' }}><Hand size={24} /></button>
        </div>
      </div>

      {/* Sidebar - Chat & Participants */}
      <div style={{ width: '350px', background: '#0a0a0a', borderRight: '1px solid rgba(255,255,255,0.05)', display: 'flex', flexDirection: 'column' }}>
        {/* Tabs */}
        <div style={{ display: 'flex', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
          <button style={{ flex: 1, padding: '1.2rem', background: 'transparent', border: 'none', borderBottom: '2px solid var(--primary)', color: 'var(--primary)', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
            <MessageSquare size={18} /> الدردشة
          </button>
          <button style={{ flex: 1, padding: '1.2rem', background: 'transparent', border: 'none', borderBottom: '2px solid transparent', color: 'rgba(255,255,255,0.5)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
            <Users size={18} /> الحضور (12)
          </button>
        </div>

        {/* Chat Area */}
        <div style={{ flex: 1, padding: '1.5rem', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {/* Mock Messages */}
          <div style={{ background: 'rgba(255,255,255,0.05)', padding: '1rem', borderRadius: '12px', borderTopRightRadius: '4px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
              <span style={{ fontWeight: 'bold', color: '#60a5fa' }}>أحمد السوري</span>
              <span style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.4)' }}>10:42 م</span>
            </div>
            <p style={{ color: 'rgba(255,255,255,0.9)' }}>أستاذ ممكن تعيد شرح الـ useEffect لو سمحت؟</p>
          </div>

          <div style={{ background: 'rgba(203, 161, 83, 0.1)', border: '1px solid rgba(203, 161, 83, 0.2)', padding: '1rem', borderRadius: '12px', borderTopRightRadius: '4px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
              <span style={{ fontWeight: 'bold', color: 'var(--warning)' }}>المدرب خالد</span>
              <span style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.4)' }}>10:43 م</span>
            </div>
            <p style={{ color: 'rgba(255,255,255,0.9)' }}>أكيد أحمد، في نهاية الجلسة سأقوم بتلخيصها بالكامل مع مثال عملي.</p>
          </div>
          
          <div style={{ background: 'rgba(255,255,255,0.05)', padding: '1rem', borderRadius: '12px', borderTopRightRadius: '4px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
              <span style={{ fontWeight: 'bold', color: '#34d399' }}>سارة محمد</span>
              <span style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.4)' }}>10:45 م</span>
            </div>
            <p style={{ color: 'rgba(255,255,255,0.9)' }}>شكراً جداً الشرح واضح جداً 🔥</p>
          </div>
        </div>

        {/* Input */}
        <div style={{ padding: '1.5rem', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
          <input 
            type="text" 
            placeholder="اكتب رسالة للجميع..." 
            style={{ width: '100%', background: 'rgba(0,0,0,0.5)', border: '1px solid rgba(255,255,255,0.1)', padding: '1rem', borderRadius: '8px', color: '#fff' }}
          />
        </div>
      </div>

      <style jsx global>{`
        @keyframes pulse {
          0% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.7); }
          70% { box-shadow: 0 0 0 10px rgba(239, 68, 68, 0); }
          100% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0); }
        }
      `}</style>
    </div>
  );
}
