'use client';

import { useState, useEffect } from 'react';
import { Play, Pause, RotateCcw, Coffee, BookOpen, Settings } from 'lucide-react';
import Link from 'next/link';

export default function FocusModePage() {
  const [timeLeft, setTimeLeft] = useState(25 * 60);
  const [isRunning, setIsRunning] = useState(false);
  const [mode, setMode] = useState<'study' | 'shortBreak' | 'longBreak'>('study');
  const [cycles, setCycles] = useState(0);

  const times = {
    study: 25 * 60,
    shortBreak: 5 * 60,
    longBreak: 15 * 60
  };

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isRunning && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft(t => t - 1);
      }, 1000);
    } else if (timeLeft === 0) {
      handleComplete();
    }
    return () => clearInterval(interval);
  }, [isRunning, timeLeft]);

  const handleComplete = () => {
    setIsRunning(false);
    // Play sound notification
    try {
      const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
      audio.play();
    } catch(e) {}

    if (mode === 'study') {
      const nextCycles = cycles + 1;
      setCycles(nextCycles);
      if (nextCycles % 4 === 0) {
        changeMode('longBreak');
      } else {
        changeMode('shortBreak');
      }
    } else {
      changeMode('study');
    }
  };

  const changeMode = (newMode: 'study' | 'shortBreak' | 'longBreak') => {
    setMode(newMode);
    setTimeLeft(times[newMode]);
    setIsRunning(false);
  };

  const toggleTimer = () => setIsRunning(!isRunning);
  const resetTimer = () => {
    setIsRunning(false);
    setTimeLeft(times[mode]);
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: mode === 'study' ? '#18181b' : mode === 'shortBreak' ? '#0f766e' : '#1e3a8a',
      color: '#fff',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      transition: 'background 0.5s ease',
      fontFamily: 'system-ui, -apple-system, sans-serif'
    }}>
      
      {/* Back button */}
      <div style={{ position: 'absolute', top: '2rem', right: '2rem' }}>
        <Link href="/" style={{ padding: '0.6rem 1.2rem', background: 'rgba(255,255,255,0.1)', color: '#fff', textDecoration: 'none', borderRadius: '12px', fontWeight: 'bold' }}>
          العودة للرئيسية
        </Link>
      </div>

      <div style={{ background: 'rgba(255,255,255,0.05)', padding: '3rem', borderRadius: '32px', backdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.1)', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)', width: '100%', maxWidth: '500px', textAlign: 'center' }}>
        
        {/* Mode Selector */}
        <div style={{ display: 'flex', gap: '0.5rem', background: 'rgba(0,0,0,0.2)', padding: '0.5rem', borderRadius: '16px', marginBottom: '3rem' }}>
          {[
            { id: 'study', label: 'دراسة', icon: <BookOpen size={16} /> },
            { id: 'shortBreak', label: 'استراحة قصيرة', icon: <Coffee size={16} /> },
            { id: 'longBreak', label: 'استراحة طويلة', icon: <Coffee size={16} /> }
          ].map(m => (
            <button
              key={m.id}
              onClick={() => changeMode(m.id as any)}
              style={{
                flex: 1, padding: '0.75rem', border: 'none',
                background: mode === m.id ? 'rgba(255,255,255,0.2)' : 'transparent',
                color: mode === m.id ? '#fff' : 'rgba(255,255,255,0.6)',
                borderRadius: '12px', fontWeight: 'bold', cursor: 'pointer',
                transition: 'all 0.2s', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem', fontSize: '0.9rem'
              }}
            >
              {m.icon} {m.label}
            </button>
          ))}
        </div>

        {/* Timer Display */}
        <div style={{ fontSize: '7rem', fontWeight: '800', fontFamily: 'monospace', letterSpacing: '-2px', margin: '2rem 0', textShadow: '0 10px 30px rgba(0,0,0,0.3)', fontVariantNumeric: 'tabular-nums' }}>
          {formatTime(timeLeft)}
        </div>

        {/* Controls */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '1.5rem', marginBottom: '2rem' }}>
          <button
            onClick={resetTimer}
            style={{ width: '60px', height: '60px', borderRadius: '50%', border: 'none', background: 'rgba(255,255,255,0.1)', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            <RotateCcw size={24} />
          </button>

          <button
            onClick={toggleTimer}
            style={{ width: '90px', height: '90px', borderRadius: '50%', border: 'none', background: '#fff', color: '#000', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 10px 30px rgba(0,0,0,0.2)', transition: 'transform 0.1s' }}
            onMouseDown={e => e.currentTarget.style.transform = 'scale(0.95)'}
            onMouseUp={e => e.currentTarget.style.transform = 'scale(1)'}
          >
            {isRunning ? <Pause size={36} fill="#000" /> : <Play size={36} fill="#000" style={{ marginLeft: '4px' }} />}
          </button>

          <button
            style={{ width: '60px', height: '60px', borderRadius: '50%', border: 'none', background: 'rgba(255,255,255,0.1)', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            <Settings size={24} />
          </button>
        </div>

        <div style={{ color: 'rgba(255,255,255,0.6)', fontWeight: 'bold' }}>
          الجلسة المكتملة: {cycles}
        </div>

      </div>
    </div>
  );
}
