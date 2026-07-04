'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowRight, Play, Square, Video, Mic, MicOff, VideoOff, Settings } from 'lucide-react';
import Link from 'next/link';
import '@livekit/components-styles';
import {
  LiveKitRoom,
  VideoConference,
  RoomAudioRenderer,
  ControlBar,
  RoomName,
  ParticipantTile,
  GridLayout,
  useRoomContext
} from '@livekit/components-react';

export default function LiveInstructorClient({ lesson, course }: { lesson: any, course: any }) {
  const [liveToken, setLiveToken] = useState('');
  const [isFetchingToken, setIsFetchingToken] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const fetchLiveToken = async () => {
      if (!lesson.isLive || !lesson.liveRoomName) return;
      setIsFetchingToken(true);
      try {
        const res = await fetch(`/api/livekit/token?room=${lesson.liveRoomName}&username=Instructor_${course.instructorId}`);
        if (res.ok) {
          const data = await res.json();
          setLiveToken(data.token);
        } else {
          console.error("Failed to fetch token");
        }
      } catch (err) {
        console.error(err);
      }
      setIsFetchingToken(false);
    };

    fetchLiveToken();
  }, [lesson, course.instructorId]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: '#050505', color: '#fff' }}>
      
      {/* Top Navbar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1rem 2rem', background: '#0a0a0a', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <h1 style={{ fontSize: '1.2rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ width: '12px', height: '12px', background: '#ef4444', borderRadius: '50%', display: 'inline-block', boxShadow: '0 0 10px #ef4444' }}></span>
            ستوديو البث: {lesson.title}
          </h1>
        </div>
        <Link href={`/instructor/courses/${course.id}/chapters`} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'rgba(255,255,255,0.6)', textDecoration: 'none' }}>
          إنهاء والعودة <ArrowRight size={16} />
        </Link>
      </div>

      {/* Main Studio Area */}
      <div style={{ flex: 1, display: 'flex', padding: '2rem', gap: '2rem', overflow: 'hidden' }}>
        
        {/* LiveKit Player Area */}
        <div style={{ flex: 1, background: '#000', borderRadius: '16px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.1)', position: 'relative' }}>
          {isFetchingToken ? (
             <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#fff' }}>جاري التحضير...</div>
          ) : liveToken ? (
            <LiveKitRoom
              video={true}
              audio={true}
              token={liveToken}
              serverUrl={process.env.NEXT_PUBLIC_LIVEKIT_URL}
              data-lk-theme="default"
              style={{ height: '100%' }}
            >
              <VideoConference />
              <RoomAudioRenderer />
            </LiveKitRoom>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'rgba(255,255,255,0.5)' }}>
              تعذر الحصول على صلاحية البث. تأكد من إعدادات LiveKit.
            </div>
          )}
        </div>

        {/* Right Sidebar: Controls & Info */}
        <div style={{ width: '350px', display: 'flex', flexDirection: 'column', gap: '1.5rem', overflowY: 'auto' }}>
          
          {/* Stream Info */}
          <div style={{ background: 'rgba(255,255,255,0.02)', padding: '1.5rem', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 'bold', marginBottom: '1rem', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '0.5rem' }}>تفاصيل الجلسة</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem', fontSize: '0.9rem', color: 'rgba(255,255,255,0.7)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>الكورس:</span>
                <span style={{ color: '#fff' }}>{course.title}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>الدرس:</span>
                <span style={{ color: '#fff' }}>{lesson.title}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>معرف الغرفة (Room):</span>
                <span style={{ color: '#fff', fontSize: '0.8rem', fontFamily: 'monospace' }}>{lesson.liveRoomName}</span>
              </div>
            </div>
          </div>

          {/* Quick Tips */}
          <div style={{ background: 'rgba(203, 161, 83, 0.1)', padding: '1.5rem', borderRadius: '12px', border: '1px solid rgba(203, 161, 83, 0.2)' }}>
             <h3 style={{ fontSize: '1.1rem', fontWeight: 'bold', marginBottom: '1rem', color: 'var(--warning)' }}>نصائح للمدرب</h3>
             <ul style={{ paddingRight: '1.2rem', margin: 0, display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.9rem', color: 'rgba(255,255,255,0.8)' }}>
               <li>تأكد من إضاءة المكان بشكل جيد.</li>
               <li>يفضل استخدام ميكروفون خارجي لضمان جودة الصوت.</li>
               <li>يمكنك مشاركة شاشتك (Screen Share) باستخدام شريط التحكم أسفل الفيديو.</li>
               <li>الطلاب سيشاهدون البث ولن يتمكنوا من فتح كاميراتهم، لكن يمكنهم التواصل معك عبر الدردشة إذا فعلتها لاحقاً.</li>
             </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
