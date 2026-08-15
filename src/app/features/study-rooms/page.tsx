'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Headphones, Mic, MicOff, Users, ChevronRight, Hash, MessageSquare, Plus, Settings, X, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { LiveKitRoom, RoomAudioRenderer, useParticipants, useLocalParticipant, VideoConference } from '@livekit/components-react';
import '@livekit/components-styles';
import { useSession } from 'next-auth/react';

export default function StudyRoomsPage() {
  const { data: session } = useSession();
  const [rooms, setRooms] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeRoom, setActiveRoom] = useState<any | null>(null);
  const [isMuted, setIsMuted] = useState(true);
  
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newRoomTitle, setNewRoomTitle] = useState('');
  const [newRoomTheme, setNewRoomTheme] = useState('#a855f7');
  const [isCreating, setIsCreating] = useState(false);

  const [liveKitToken, setLiveKitToken] = useState<string | null>(null);

  useEffect(() => {
    fetchRooms();
  }, []);

  const fetchRooms = async () => {
    try {
      const res = await fetch('/api/study-rooms');
      if (res.ok) {
        const data = await res.json();
        setRooms(data);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRoomTitle.trim()) return;
    setIsCreating(true);
    try {
      const res = await fetch('/api/study-rooms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: newRoomTitle, themeColor: newRoomTheme })
      });
      if (res.ok) {
        const room = await res.json();
        setRooms([room, ...rooms]);
        setIsCreateModalOpen(false);
        setNewRoomTitle('');
        joinRoom(room);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setIsCreating(false);
    }
  };

  const joinRoom = async (room: any) => {
    setActiveRoom(room);
    setLiveKitToken(null);
    try {
      const res = await fetch(`/api/livekit/token?room=${room.id}&username=${session?.user?.name || 'Student'}`);
      if (res.ok) {
        const data = await res.json();
        setLiveKitToken(data.token);
      }
    } catch (error) {
      console.error('Failed to get token:', error);
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: '#050505', color: '#fff', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      
      {/* Navbar */}
      <div style={{ padding: '1.5rem 2rem', background: '#111', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 50 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <Link href="/dashboard" style={{ color: 'rgba(255,255,255,0.5)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
            لوحة التحكم <ChevronRight size={16} />
          </Link>
          <div style={{ width: '40px', height: '40px', background: 'rgba(168, 85, 247, 0.1)', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Headphones size={24} color="#a855f7" />
          </div>
          <h1 style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>غرف الدراسة الصوتية</h1>
        </div>
        <button 
          onClick={() => setIsCreateModalOpen(true)}
          style={{ background: 'var(--primary)', color: '#000', border: 'none', padding: '0.6rem 1.2rem', borderRadius: '12px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}
        >
          <Plus size={18} /> إنشاء غرفة
        </button>
      </div>

      <div style={{ display: 'flex', height: 'calc(100vh - 81px)' }}>
        
        {/* Main Content (Rooms List) */}
        <div style={{ flex: 1, padding: '3rem 2rem', overflowY: 'auto' }}>
          <div style={{ maxWidth: '800px', margin: '0 auto' }}>
            
            <div style={{ marginBottom: '2rem' }}>
              <h2 style={{ fontSize: '2rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>اكتشف الغرف النشطة</h2>
              <p style={{ color: 'rgba(255,255,255,0.6)' }}>انضم إلى زملائك، استمع للنقاشات، وشارك أفكارك.</p>
            </div>

            {loading ? (
              <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}>
                <Loader2 size={32} className="animate-spin" color="#a855f7" />
              </div>
            ) : rooms.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '3rem', color: 'rgba(255,255,255,0.5)' }}>
                لا توجد غرف نشطة حالياً. كن أول من ينشئ غرفة!
              </div>
            ) : (
              <div style={{ display: 'grid', gap: '1.5rem' }}>
                {rooms.map((room) => (
                  <div 
                    key={room.id}
                    onClick={() => joinRoom(room)}
                    style={{ 
                      background: '#111', borderRadius: '24px', padding: '1.5rem', 
                      border: activeRoom?.id === room.id ? `1px solid ${room.themeColor || '#a855f7'}` : '1px solid rgba(255,255,255,0.05)',
                      cursor: 'pointer', transition: 'all 0.2s', position: 'relative', overflow: 'hidden'
                    }}
                  >
                    <div style={{ display: 'flex', gap: '0.5rem', color: 'rgba(255,255,255,0.5)', fontSize: '0.85rem', marginBottom: '0.5rem' }}>
                      <Hash size={14} color={room.themeColor || '#a855f7'} /> غرفة عامة
                    </div>
                    
                    <h3 style={{ fontSize: '1.3rem', fontWeight: 'bold', marginBottom: '1.5rem' }}>{room.title}</h3>
                    
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                      <div style={{ display: 'flex', gap: '1rem', color: 'rgba(255,255,255,0.4)', fontSize: '0.9rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                          <Users size={16} /> الانضمام
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Sidebar (Active Room Details) */}
        <AnimatePresence>
          {activeRoom && liveKitToken && (
            <motion.div 
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 380, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              style={{ background: '#111', borderRight: '1px solid rgba(255,255,255,0.05)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}
            >
              <LiveKitRoom
                video={false}
                audio={!isMuted}
                token={liveKitToken}
                serverUrl={process.env.NEXT_PUBLIC_LIVEKIT_URL}
                data-lk-theme="default"
                style={{ height: '100%', display: 'flex', flexDirection: 'column' }}
                onDisconnected={() => setActiveRoom(null)}
              >
                <div style={{ padding: '1.5rem', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <h3 style={{ fontWeight: 'bold', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>{activeRoom.title}</h3>
                  <button onClick={() => { setActiveRoom(null); setLiveKitToken(null); }} style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '0.9rem', fontWeight: 'bold' }}>مغادرة</button>
                </div>

                <div style={{ flex: 1, overflowY: 'auto', padding: '1.5rem' }}>
                  <RoomAudioRenderer />
                  <ParticipantList />
                </div>

                <div style={{ padding: '1.5rem', borderTop: '1px solid rgba(255,255,255,0.05)', display: 'flex', gap: '1rem' }}>
                  <button 
                    onClick={() => setIsMuted(!isMuted)}
                    style={{ flex: 1, background: isMuted ? 'rgba(255,255,255,0.05)' : 'rgba(239, 68, 68, 0.1)', color: isMuted ? '#fff' : '#ef4444', border: '1px solid rgba(255,255,255,0.1)', padding: '1rem', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
                  >
                    {isMuted ? <MicOff size={24} /> : <Mic size={24} />}
                  </button>
                  <button style={{ width: '60px', background: 'rgba(255,255,255,0.05)', color: '#fff', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                    <MessageSquare size={20} />
                  </button>
                </div>
              </LiveKitRoom>
            </motion.div>
          )}
        </AnimatePresence>

      </div>

      {/* Create Room Modal */}
      {isCreateModalOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(5px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            style={{ background: '#111', padding: '2rem', borderRadius: '24px', width: '90%', maxWidth: '400px', border: '1px solid rgba(255,255,255,0.1)' }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>إنشاء غرفة دراسة</h2>
              <button onClick={() => setIsCreateModalOpen(false)} style={{ background: 'transparent', border: 'none', color: '#fff', cursor: 'pointer' }}><X size={24} /></button>
            </div>
            
            <form onSubmit={handleCreateRoom}>
              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', color: 'rgba(255,255,255,0.7)' }}>موضوع الغرفة (الاسم)</label>
                <input 
                  type="text" 
                  value={newRoomTitle}
                  onChange={e => setNewRoomTitle(e.target.value)}
                  placeholder="مثال: نقاش فيزياء البكالوريا..."
                  style={{ width: '100%', padding: '1rem', background: '#000', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', color: '#fff', outline: 'none' }}
                  autoFocus
                />
              </div>
              
              <div style={{ marginBottom: '2rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', color: 'rgba(255,255,255,0.7)' }}>لون الغرفة المميز</label>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  {['#a855f7', '#3b82f6', '#10b981', '#f59e0b', '#ef4444'].map(color => (
                    <button 
                      key={color}
                      type="button"
                      onClick={() => setNewRoomTheme(color)}
                      style={{ 
                        width: '32px', height: '32px', borderRadius: '50%', background: color, border: 'none', cursor: 'pointer',
                        boxShadow: newRoomTheme === color ? `0 0 0 3px #111, 0 0 0 5px ${color}` : 'none'
                      }}
                    />
                  ))}
                </div>
              </div>

              <button 
                type="submit"
                disabled={isCreating || !newRoomTitle.trim()}
                style={{ width: '100%', background: newRoomTheme, color: '#fff', border: 'none', padding: '1rem', borderRadius: '12px', fontWeight: 'bold', fontSize: '1.1rem', cursor: 'pointer', opacity: (!newRoomTitle.trim() || isCreating) ? 0.5 : 1, display: 'flex', justifyContent: 'center', alignItems: 'center' }}
              >
                {isCreating ? <Loader2 className="animate-spin" /> : 'بدء الغرفة الآن'}
              </button>
            </form>
          </motion.div>
        </div>
      )}

    </div>
  );
}

// Helper component to render LiveKit participants
function ParticipantList() {
  const participants = useParticipants();
  const { localParticipant } = useLocalParticipant();

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem' }}>
      {participants.map(p => (
        <div key={p.identity} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
          <div style={{ width: '60px', height: '60px', borderRadius: '50%', background: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem', fontWeight: 'bold', color: '#a855f7', position: 'relative', border: p.isSpeaking ? '2px solid #3b82f6' : '2px solid transparent' }}>
            {p.name?.[0] || 'U'}
            {!p.isMicrophoneEnabled && (
              <div style={{ position: 'absolute', bottom: -5, right: -5, background: '#ef4444', borderRadius: '50%', padding: '2px' }}>
                <MicOff size={12} color="#fff" />
              </div>
            )}
          </div>
          <div style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.7)', textAlign: 'center', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', width: '100%' }}>
            {p.name} {p.identity === localParticipant.identity ? '(أنت)' : ''}
          </div>
        </div>
      ))}
    </div>
  );
}
