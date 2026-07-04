'use client';

import Link from 'next/link';
import { useState, useEffect, useRef } from 'react';
import { Headphones, Users, Timer, Play, Pause, RotateCcw, Volume2, VolumeX } from 'lucide-react';
import { motion } from 'framer-motion';

const TRACKS = [
  { id: 'lofi', title: 'Deep Focus Lo-Fi', subtitle: 'موجات ألفا للتركيز العميق', src: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3' },
  { id: 'rain', title: 'صوت المطر والمقهى', subtitle: 'ضوضاء بيضاء للاسترخاء', src: 'https://actions.google.com/sounds/v1/weather/rain_heavy_loud.ogg' },
];

export default function StudyRoomsFeature() {
  const [timeLeft, setTimeLeft] = useState(25 * 60); // 25 minutes pomodoro
  const [isActive, setIsActive] = useState(false);
  const [activeUsers] = useState(Math.floor(Math.random() * 500) + 1200);

  // Audio Player State
  const [activeTrack, setActiveTrack] = useState<string | null>(null);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const toggleTrack = (trackId: string) => {
    if (activeTrack === trackId) {
      if (isPlayingAudio) {
        audioRef.current?.pause();
        setIsPlayingAudio(false);
      } else {
        audioRef.current?.play().catch(e => console.error("Audio playback failed", e));
        setIsPlayingAudio(true);
      }
    } else {
      setActiveTrack(trackId);
      setIsPlayingAudio(true);
      
      if (audioRef.current) {
        const newTrack = TRACKS.find(t => t.id === trackId);
        if (newTrack) {
          // Synchronously set src and play to satisfy browser autoplay policies
          audioRef.current.src = newTrack.src;
          audioRef.current.play().catch(e => {
            console.error("Audio playback failed", e);
            setIsPlayingAudio(false);
          });
        }
      }
    }
  };

  // Removed the useEffect that previously handled play/pause asynchronously,
  // because asynchronous playback calls lose the user gesture token in strict browsers.

  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (isActive && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft(time => time - 1);
      }, 1000);
    } else if (timeLeft === 0) {
      setIsActive(false);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isActive, timeLeft]);

  const toggleTimer = () => setIsActive(!isActive);
  const resetTimer = () => {
    setIsActive(false);
    setTimeLeft(25 * 60);
  };

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;

  return (
    <div className="container">
      <nav className="nav" style={{ marginBottom: '2rem', display: 'flex', gap: '1rem' }}>
        <Link href="/" className="btn" style={{ padding: '0.5rem 1rem' }}>العودة للرئيسية</Link>
        <Link href="/features/career-mapping" className="btn btn-solid" style={{ padding: '0.5rem 1rem' }}>الميزة التالية ➡️</Link>
      </nav>

      <motion.div 
        className="glass-card" 
        style={{ 
          maxWidth: '1000px', 
          margin: '0 auto',
          background: 'linear-gradient(to bottom, rgba(30, 20, 50, 0.8), rgba(10, 10, 15, 0.9))',
          position: 'relative',
          overflow: 'hidden'
        }}
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
      >
        {/* Animated Background Elements */}
        <div style={{ position: 'absolute', top: '-10%', left: '-10%', width: '400px', height: '400px', background: 'radial-gradient(circle, rgba(139, 92, 246, 0.15) 0%, transparent 70%)', filter: 'blur(40px)', zIndex: 0 }} />
        <div style={{ position: 'absolute', bottom: '-10%', right: '-10%', width: '400px', height: '400px', background: 'radial-gradient(circle, rgba(203, 161, 83, 0.1) 0%, transparent 70%)', filter: 'blur(40px)', zIndex: 0 }} />

        <div style={{ position: 'relative', zIndex: 1 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '3rem' }}>
            <div>
              <h2 className="feature-title" style={{ color: '#fff', fontSize: '2.5rem' }}>
                <Headphones size={40} color="var(--primary)" /> غرف الدراسة الافتراضية
              </h2>
              <p style={{ opacity: 0.7, fontSize: '1.1rem', maxWidth: '600px' }}>
                انضم إلى زملائك في بيئة دراسية هادئة ومحفزة. ركز، استمع إلى موسيقى Lo-Fi، وحقق أهدافك اليومية.
              </p>
            </div>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', background: 'rgba(255,255,255,0.05)', padding: '0.8rem 1.5rem', borderRadius: '30px', border: '1px solid rgba(255,255,255,0.1)' }}>
              <div style={{ width: '10px', height: '10px', background: 'var(--success)', borderRadius: '50%', boxShadow: '0 0 10px var(--success)' }} />
              <Users size={20} color="var(--primary)" />
              <span style={{ fontWeight: 600 }}>{activeUsers.toLocaleString()} طالب يدرسون الآن</span>
            </div>
          </div>

          <div className="grid" style={{ gridTemplateColumns: '1fr 1fr' }}>
            {/* Pomodoro Timer */}
            <div style={{ background: 'rgba(0,0,0,0.4)', borderRadius: '20px', padding: '3rem', textAlign: 'center', border: '1px solid rgba(255,255,255,0.05)' }}>
              <Timer size={32} color="var(--primary)" style={{ marginBottom: '1rem' }} />
              <h3 style={{ marginBottom: '2rem', opacity: 0.8 }}>مؤقت التركيز (بومودورو)</h3>
              
              <div style={{ fontSize: '6rem', fontWeight: 800, fontFamily: 'monospace', color: 'var(--primary)', textShadow: '0 0 20px rgba(203, 161, 83, 0.3)', marginBottom: '2rem', lineHeight: 1 }}>
                {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
              </div>
              
              <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
                <button onClick={toggleTimer} className="btn btn-solid" style={{ borderRadius: '50%', width: '60px', height: '60px', padding: 0 }}>
                  {isActive ? <Pause size={24} /> : <Play size={24} style={{ marginLeft: '4px' }} />}
                </button>
                <button onClick={resetTimer} className="btn" style={{ borderRadius: '50%', width: '60px', height: '60px', padding: 0, background: 'rgba(255,255,255,0.1)', border: 'none', color: '#fff' }}>
                  <RotateCcw size={24} />
                </button>
              </div>
            </div>

            {/* Music & Ambience Player */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: '20px', padding: '2rem', flex: 1, border: '1px solid rgba(255,255,255,0.05)' }}>
                <h3 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Headphones size={20} /> المشغل الصوتي
                </h3>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  {TRACKS.map(track => {
                    const isCurrentTrack = activeTrack === track.id;
                    const isCurrentlyPlaying = isCurrentTrack && isPlayingAudio;
                    
                    return (
                      <div 
                        key={track.id}
                        onClick={() => toggleTrack(track.id)}
                        style={{ 
                          display: 'flex', 
                          alignItems: 'center', 
                          justifyContent: 'space-between', 
                          padding: '1rem', 
                          background: isCurrentTrack ? 'rgba(203, 161, 83, 0.1)' : 'rgba(255,255,255,0.02)', 
                          borderRadius: '12px', 
                          borderLeft: isCurrentTrack ? '4px solid var(--primary)' : '4px solid transparent',
                          cursor: 'pointer',
                          transition: 'all 0.2s'
                        }}
                        className="hover:bg-white/5"
                      >
                        <div>
                          <h4 style={{ color: '#fff', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            {track.title}
                            {isCurrentlyPlaying && <Volume2 size={14} color="var(--primary)" />}
                          </h4>
                          <p style={{ fontSize: '0.8rem', opacity: 0.6 }}>{track.subtitle}</p>
                        </div>
                        {isCurrentlyPlaying ? (
                          <div className="audio-bars">
                            <span className="bar playing"></span><span className="bar playing"></span><span className="bar playing"></span>
                          </div>
                        ) : (
                          <Play size={20} color={isCurrentTrack ? "var(--primary)" : "rgba(255,255,255,0.4)"} />
                        )}
                      </div>
                    );
                  })}
                </div>
                
                {/* Hidden Audio Element */}
                <audio 
                  ref={audioRef} 
                  src={activeTrack ? TRACKS.find(t => t.id === activeTrack)?.src : undefined} 
                  loop 
                  onEnded={() => setIsPlayingAudio(false)}
                />
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      <style dangerouslySetInnerHTML={{__html: `
        .audio-bars {
          display: flex;
          align-items: flex-end;
          gap: 3px;
          height: 20px;
        }
        .bar {
          width: 4px;
          background: var(--primary);
          border-radius: 2px;
        }
        .bar.playing {
          animation: bounce 1s infinite alternate ease-in-out;
        }
        .bar.playing:nth-child(1) { animation-delay: 0s; height: 10px; }
        .bar.playing:nth-child(2) { animation-delay: 0.2s; height: 20px; }
        .bar.playing:nth-child(3) { animation-delay: 0.4s; height: 15px; }
        @keyframes bounce {
          from { height: 5px; }
          to { height: 20px; }
        }
        .hover\\:bg-white\\/5:hover { background-color: rgba(255,255,255,0.05) !important; }
      `}} />
    </div>
  );
}
