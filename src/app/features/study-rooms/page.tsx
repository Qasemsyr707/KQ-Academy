'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Headphones, Mic, MicOff, Users, ChevronRight, Hash, MessageSquare, Plus, Settings } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';

const mockRooms = [
  {
    id: 1,
    name: 'مراجعة فيزياء - البكالوريا',
    topic: 'الفيزياء',
    listeners: 45,
    speakers: 3,
    active: true,
    avatars: [
      'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&h=100&fit=crop',
      'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop',
      'https://images.unsplash.com/photo-1599566150163-29194dcaad36?w=100&h=100&fit=crop',
    ]
  },
  {
    id: 2,
    name: 'تحدي البرمجة بـ React',
    topic: 'تكنولوجيا',
    listeners: 120,
    speakers: 5,
    active: true,
    avatars: [
      'https://images.unsplash.com/photo-1527980965255-d3b416303d12?w=100&h=100&fit=crop',
      'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100&h=100&fit=crop',
    ]
  },
  {
    id: 3,
    name: 'نقاش مفتوح: تنظيم الوقت للدراسة',
    topic: 'تطوير الذات',
    listeners: 85,
    speakers: 4,
    active: false,
    avatars: [
      'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=100&h=100&fit=crop',
    ]
  }
];

export default function StudyRoomsPage() {
  const [activeRoom, setActiveRoom] = useState<number | null>(null);
  const [isMuted, setIsMuted] = useState(true);

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
        <button style={{ background: 'var(--primary)', color: '#000', border: 'none', padding: '0.6rem 1.2rem', borderRadius: '12px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
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

            <div style={{ display: 'grid', gap: '1.5rem' }}>
              {mockRooms.map((room) => (
                <div 
                  key={room.id}
                  onClick={() => setActiveRoom(room.id)}
                  style={{ 
                    background: '#111', borderRadius: '24px', padding: '1.5rem', 
                    border: activeRoom === room.id ? '1px solid #a855f7' : '1px solid rgba(255,255,255,0.05)',
                    cursor: 'pointer', transition: 'all 0.2s', position: 'relative', overflow: 'hidden'
                  }}
                >
                  {room.active && (
                    <div style={{ position: 'absolute', top: 0, right: 0, background: 'rgba(168, 85, 247, 0.1)', color: '#a855f7', padding: '0.4rem 1rem', borderBottomLeftRadius: '16px', fontSize: '0.8rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <span style={{ width: '6px', height: '6px', background: '#a855f7', borderRadius: '50%', animation: 'pulse 2s infinite' }} />
                      نشط الآن
                    </div>
                  )}

                  <div style={{ display: 'flex', gap: '0.5rem', color: 'rgba(255,255,255,0.5)', fontSize: '0.85rem', marginBottom: '0.5rem', marginTop: room.active ? '1rem' : '0' }}>
                    <Hash size={14} /> {room.topic}
                  </div>
                  
                  <h3 style={{ fontSize: '1.3rem', fontWeight: 'bold', marginBottom: '1.5rem' }}>{room.name}</h3>
                  
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                    <div style={{ display: 'flex', alignItems: 'center' }}>
                      {room.avatars.map((avatar, idx) => (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img 
                          key={idx} src={avatar} alt="User" 
                          style={{ width: '40px', height: '40px', borderRadius: '50%', border: '2px solid #111', marginLeft: '-10px', zIndex: room.avatars.length - idx }} 
                        />
                      ))}
                      <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'rgba(255,255,255,0.1)', border: '2px solid #111', display: 'flex', alignItems: 'center', justifyContent: 'center', marginLeft: '-10px', fontSize: '0.8rem', zIndex: 0 }}>
                        +{room.speakers + room.listeners - room.avatars.length}
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: '1rem', color: 'rgba(255,255,255,0.4)', fontSize: '0.9rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                        <Users size={16} /> {room.listeners} المستمعين
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                        <Mic size={16} /> {room.speakers} المتحدثين
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

          </div>
        </div>

        {/* Sidebar (Active Room Details) */}
        {activeRoom && (
          <motion.div 
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 350, opacity: 1 }}
            style={{ background: '#111', borderRight: '1px solid rgba(255,255,255,0.05)', display: 'flex', flexDirection: 'column' }}
          >
            <div style={{ padding: '2rem', flex: 1, display: 'flex', flexDirection: 'column' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                <h3 style={{ fontWeight: 'bold' }}>الغرفة الحالية</h3>
                <button onClick={() => setActiveRoom(null)} style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '0.9rem', fontWeight: 'bold' }}>مغادرة</button>
              </div>

              <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
                <div style={{ width: '100px', height: '100px', borderRadius: '35%', background: 'rgba(168, 85, 247, 0.1)', margin: '0 auto 1.5rem auto', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={mockRooms.find(r => r.id === activeRoom)?.avatars[0]} alt="Speaker" style={{ width: '100%', height: '100%', borderRadius: '35%', objectFit: 'cover' }} />
                  <div style={{ position: 'absolute', bottom: '-5px', right: '-5px', background: '#a855f7', width: '28px', height: '28px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '3px solid #111' }}>
                    <Mic size={14} color="#fff" />
                  </div>
                </div>
                <h4 style={{ fontSize: '1.2rem', fontWeight: 'bold', marginBottom: '0.3rem' }}>م. أحمد السوري</h4>
                <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.9rem' }}>يتحدث الآن...</div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', marginBottom: 'auto' }}>
                {Array.from({ length: 8 }).map((_, i) => (
                  <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
                    <div style={{ width: '50px', height: '50px', borderRadius: '50%', background: 'rgba(255,255,255,0.05)', position: 'relative' }}>
                      {i < 3 ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={mockRooms[0].avatars[i]} alt="User" style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover', opacity: i === 0 ? 1 : 0.5 }} />
                      ) : null}
                    </div>
                  </div>
                ))}
              </div>

              <div style={{ display: 'flex', gap: '1rem', marginTop: '2rem' }}>
                <button 
                  onClick={() => setIsMuted(!isMuted)}
                  style={{ flex: 1, background: isMuted ? 'rgba(255,255,255,0.05)' : 'rgba(239, 68, 68, 0.1)', color: isMuted ? '#fff' : '#ef4444', border: '1px solid rgba(255,255,255,0.1)', padding: '1rem', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
                >
                  {isMuted ? <MicOff size={24} /> : <Mic size={24} />}
                </button>
                <button style={{ width: '60px', background: 'rgba(255,255,255,0.05)', color: '#fff', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                  <MessageSquare size={20} />
                </button>
                <button style={{ width: '60px', background: 'rgba(255,255,255,0.05)', color: '#fff', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                  <Settings size={20} />
                </button>
              </div>
            </div>
          </motion.div>
        )}

      </div>
    </div>
  );
}
