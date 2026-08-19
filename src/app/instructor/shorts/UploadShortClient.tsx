'use client';

import { useState } from 'react';
import * as tus from 'tus-js-client';
import { UploadCloud, PlaySquare, Link as LinkIcon, Save, Trash2, CheckCircle, Heart } from 'lucide-react';
import { motion } from 'framer-motion';

export default function UploadShortClient({ courses, initialShorts }: { courses: any[], initialShorts: any[] }) {
  const [shorts, setShorts] = useState(initialShorts);
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState('');
  const [courseId, setCourseId] = useState('');
  
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState(0);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleUpload = async () => {
    if (!file || !title) return alert('الرجاء اختيار فيديو وكتابة عنوان');

    setIsUploading(true);
    setProgress(0);

    try {
      // 1. Create Video on Bunny
      const bunnyRes = await fetch('/api/bunny/create-video', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: title })
      });
      
      if (!bunnyRes.ok) throw new Error('فشل إنشاء الفيديو في Bunny');
      const { videoId, libraryId, signature, expireTime } = await bunnyRes.json();

      // 2. Upload via TUS
      const upload = new tus.Upload(file, {
        endpoint: "https://video.bunnycdn.com/tusupload",
        retryDelays: [0, 3000, 5000, 10000, 20000],
        headers: {
          AuthorizationSignature: signature,
          AuthorizationExpire: expireTime.toString(),
          VideoId: videoId,
          LibraryId: libraryId,
        },
        metadata: {
          filetype: file.type,
          title: title,
        },
        onError: (error) => {
          console.error("Failed because: " + error);
          alert('فشل الرفع');
          setIsUploading(false);
        },
        onProgress: (bytesUploaded, bytesTotal) => {
          const percentage = ((bytesUploaded / bytesTotal) * 100).toFixed(2);
          setProgress(Number(percentage));
        },
        onSuccess: async () => {
          const finalUrl = `https://iframe.mediadelivery.net/embed/${libraryId}/${videoId}`;
          
          // 3. Save to our database
          const dbRes = await fetch('/api/instructor/shorts', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ title, videoUrl: finalUrl, courseId })
          });

          if (dbRes.ok) {
            const data = await dbRes.json();
            setShorts([data.short, ...shorts]);
            setFile(null);
            setTitle('');
            setCourseId('');
            alert('تم نشر الفيديو بنجاح!');
          } else {
            alert('فشل الحفظ في قاعدة البيانات');
          }
          setIsUploading(false);
        }
      });

      upload.start();

    } catch (e) {
      console.error(e);
      alert('حدث خطأ');
      setIsUploading(false);
    }
  };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr', gap: '2rem' }}>
      
      {/* Upload Form */}
      <div style={{ background: '#111', padding: '2rem', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.05)', height: 'fit-content' }}>
        <h2 style={{ fontSize: '1.2rem', fontWeight: 'bold', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <UploadCloud color="var(--primary)" /> رفع فيديو تسويقي جديد
        </h2>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', color: 'rgba(255,255,255,0.7)' }}>عنوان الفيديو المثير للانتباه</label>
            <input 
              type="text" 
              value={title} 
              onChange={e => setTitle(e.target.value)} 
              placeholder="مثال: أهم 3 نصائح لاجتياز المقابلة الشخصية!"
              style={{ width: '100%', padding: '1rem', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: '#fff', outline: 'none' }}
            />
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', color: 'rgba(255,255,255,0.7)' }}>اربط الفيديو بكورس (اختياري)</label>
            <div style={{ position: 'relative' }}>
              <LinkIcon size={18} style={{ position: 'absolute', right: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.4)' }} />
              <select 
                value={courseId} 
                onChange={e => setCourseId(e.target.value)}
                style={{ width: '100%', padding: '1rem 3rem 1rem 1rem', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: '#fff', outline: 'none', appearance: 'none' }}
              >
                <option value="" style={{ background: '#111' }}>-- لا تريط بكورس --</option>
                {courses.map(c => (
                  <option key={c.id} value={c.id} style={{ background: '#111' }}>{c.title}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', color: 'rgba(255,255,255,0.7)' }}>ملف الفيديو (طولي 9:16 يفضل)</label>
            <label style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
              padding: '3rem 2rem', background: 'rgba(255,255,255,0.02)', border: '2px dashed rgba(255,255,255,0.1)',
              borderRadius: '12px', cursor: 'pointer', transition: 'all 0.3s'
            }}
            onMouseOver={e => e.currentTarget.style.borderColor = 'var(--primary)'}
            onMouseOut={e => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'}
            >
              <input type="file" accept="video/*" onChange={handleFileChange} style={{ display: 'none' }} />
              <UploadCloud size={40} color={file ? 'var(--success)' : 'rgba(255,255,255,0.3)'} style={{ marginBottom: '1rem' }} />
              <span style={{ fontWeight: 'bold' }}>{file ? file.name : 'اضغط لاختيار الفيديو'}</span>
              <span style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.4)', marginTop: '0.5rem' }}>MP4, WebM (حد أقصى 50MB)</span>
            </label>
          </div>

          {isUploading && (
            <div style={{ width: '100%', background: 'rgba(255,255,255,0.1)', borderRadius: '8px', height: '10px', overflow: 'hidden' }}>
              <div style={{ width: `${progress}%`, height: '100%', background: 'var(--primary)', transition: 'width 0.3s' }} />
            </div>
          )}

          <button 
            onClick={handleUpload} 
            disabled={isUploading || !file || !title}
            style={{ width: '100%', padding: '1rem', background: 'var(--primary)', color: '#000', border: 'none', borderRadius: '8px', fontWeight: 'bold', fontSize: '1.1rem', cursor: (isUploading || !file || !title) ? 'not-allowed' : 'pointer', opacity: (isUploading || !file || !title) ? 0.5 : 1 }}
          >
            {isUploading ? `جاري الرفع... ${progress}%` : 'نشر الفيديو'}
          </button>

        </div>
      </div>

      {/* List of My Shorts */}
      <div>
        <h2 style={{ fontSize: '1.2rem', fontWeight: 'bold', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <PlaySquare color="var(--primary)" /> فيديوهاتي السابقة
        </h2>
        
        {shorts.length === 0 ? (
          <div style={{ background: 'rgba(255,255,255,0.02)', padding: '3rem', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.05)', textAlign: 'center' }}>
            <PlaySquare size={48} color="rgba(255,255,255,0.2)" style={{ margin: '0 auto 1rem auto' }} />
            <p style={{ color: 'rgba(255,255,255,0.5)' }}>لم تقم برفع أي فيديوهات قصيرة بعد.</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {shorts.map(short => (
              <div key={short.id} style={{ display: 'flex', gap: '1rem', background: '#111', padding: '1rem', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)', alignItems: 'center' }}>
                <div style={{ width: '60px', height: '100px', background: '#000', borderRadius: '8px', overflow: 'hidden', flexShrink: 0 }}>
                  {/* eslint-disable-next-line jsx-a11y/iframe-has-title */}
                  <iframe src={short.videoUrl} style={{ width: '100%', height: '100%', border: 'none', pointerEvents: 'none' }} />
                </div>
                <div style={{ flex: 1 }}>
                  <h3 style={{ fontWeight: 'bold', fontSize: '1.1rem', marginBottom: '0.3rem' }}>{short.title}</h3>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', color: 'rgba(255,255,255,0.5)' }}>
                    <Heart size={14} /> {short.likes} إعجاب
                  </div>
                  {short.course && (
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', background: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6', padding: '0.2rem 0.6rem', borderRadius: '12px', fontSize: '0.8rem', marginTop: '0.5rem' }}>
                      <LinkIcon size={12} /> مرتبط بكورس: {short.course.title}
                    </div>
                  )}
                </div>
                <button style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', border: 'none', padding: '0.5rem', borderRadius: '8px', cursor: 'pointer' }}>
                  <Trash2 size={18} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
}
