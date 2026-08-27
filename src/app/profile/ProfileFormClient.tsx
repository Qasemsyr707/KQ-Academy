'use client';

import { useState } from 'react';
import { Settings } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function ProfileFormClient({ user }: { user: any }) {
  const [loading, setLoading] = useState(false);
  const [bio, setBio] = useState(user.bio || '');
  const [phone, setPhone] = useState(user.phone || '');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [message, setMessage] = useState('');
  const router = useRouter();

  const compressImage = (file: File): Promise<File> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target?.result as string;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;
          const MAX_SIZE = 1200;

          if (width > height) {
            if (width > MAX_SIZE) {
              height *= MAX_SIZE / width;
              width = MAX_SIZE;
            }
          } else {
            if (height > MAX_SIZE) {
              width *= MAX_SIZE / height;
              height = MAX_SIZE;
            }
          }
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0, width, height);
          
          canvas.toBlob((blob) => {
            if (blob) {
              const newFile = new File([blob], file.name.replace(/\.[^/.]+$/, "") + ".webp", {
                type: 'image/webp',
                lastModified: Date.now(),
              });
              resolve(newFile);
            } else {
              resolve(file); // fallback to original
            }
          }, 'image/webp', 0.85);
        };
        img.onerror = () => resolve(file); // fallback to original
      };
      reader.onerror = () => resolve(file); // fallback to original
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    try {
      let imageUrl = undefined;
      
      if (imageFile) {
        const compressedFile = await compressImage(imageFile);
        const formData = new FormData();
        formData.append('file', compressedFile);
        
        const uploadRes = await fetch('/api/upload', {
          method: 'POST',
          body: formData
        });
        
        if (!uploadRes.ok) throw new Error('فشل في رفع الصورة');
        const uploadData = await uploadRes.json();
        imageUrl = uploadData.url;
      }

      const res = await fetch('/api/user/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          bio, 
          phone, 
          ...(imageUrl && { image: imageUrl })
        })
      });

      if (!res.ok) {
        throw new Error('فشل في حفظ البيانات');
      }

      setMessage('تم حفظ التعديلات بنجاح ✔️');
      router.refresh();
    } catch (err: any) {
      setMessage('حدث خطأ: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="glass-card" style={{ padding: '2rem' }}>
      <h3 style={{ fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <Settings size={20} color="var(--primary)" /> إعدادات الحساب
      </h3>
      
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', color: 'rgba(255,255,255,0.7)' }}>الاسم الكامل</label>
            <input type="text" defaultValue={user.name} disabled style={{ width: '100%', padding: '0.8rem', borderRadius: '8px', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.5)' }} />
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', color: 'rgba(255,255,255,0.7)' }}>البريد الإلكتروني</label>
            <input type="email" defaultValue={user.email} disabled style={{ width: '100%', padding: '0.8rem', borderRadius: '8px', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.5)' }} />
          </div>
        </div>
        
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', color: 'rgba(255,255,255,0.7)' }}>تغيير الصورة الشخصية</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '0.5rem', borderRadius: '8px', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)' }}>
              <input type="file" accept="image/*" onChange={(e) => setImageFile(e.target.files?.[0] || null)} style={{ color: 'rgba(255,255,255,0.7)', width: '100%', fontSize: '0.85rem' }} />
            </div>
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', color: 'rgba(255,255,255,0.7)' }}>رقم الهاتف</label>
            <input type="text" value={phone} onChange={e => setPhone(e.target.value)} placeholder="أدخل رقم الهاتف" style={{ width: '100%', padding: '0.8rem', borderRadius: '8px', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff' }} />
          </div>
        </div>

        <div>
          <label style={{ display: 'block', marginBottom: '0.5rem', color: 'rgba(255,255,255,0.7)' }}>نبذة عني (للمدربين)</label>
          <textarea 
            value={bio} 
            onChange={e => setBio(e.target.value)} 
            placeholder="اكتب نبذة مختصرة عن خبراتك ومؤهلاتك ليتعرف عليك الطلاب..." 
            rows={4}
            style={{ width: '100%', padding: '0.8rem', borderRadius: '8px', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff' }} 
          />
          <p style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.5)', marginTop: '0.5rem' }}>
            ستظهر هذه النبذة في قسم "عن المدرب" في صفحات الكورسات الخاصة بك.
          </p>
        </div>

        {message && (
          <div style={{ color: message.includes('خطأ') ? 'var(--danger)' : '#22c55e', fontWeight: 'bold' }}>
            {message}
          </div>
        )}

        <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
          <button type="submit" disabled={loading} className="btn btn-solid" style={{ padding: '0.8rem 2rem', borderRadius: '8px', fontWeight: 'bold' }}>
            {loading ? 'جاري الحفظ...' : 'حفظ التعديلات'}
          </button>
        </div>
      </form>
    </div>
  );
}
