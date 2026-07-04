'use client';

import { motion } from 'framer-motion';
import { Camera, User, Mail, Phone, Lock, Bell, Shield, Key, Loader } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';

export default function ProfileSettings() {
  const { data: session, status, update } = useSession();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('personal');
  
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [image, setImage] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [msg, setMsg] = useState({ type: '', text: '' });
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    }
    if (session?.user) {
      setName(session.user.name || '');
      setEmail(session.user.email || '');
      // Fetch full user data from DB (image is NOT stored in JWT to avoid header size limits)
      fetch('/api/user/me')
        .then(r => r.json())
        .then(data => {
          if (data.user) {
            if (data.user.phone) setPhone(data.user.phone);
            if (data.user.image) setImage(data.user.image);
          }
        })
        .catch(() => {});
    }
  }, [session, status, router]);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      setMsg({ type: 'error', text: 'حجم الصورة يجب أن يكون أقل من 2MB' });
      return;
    }
    const reader = new FileReader();
    reader.onload = (ev) => {
      setImage(ev.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleSaveProfile = async () => {
    setIsSaving(true);
    setMsg({ type: '', text: '' });
    try {
      const res = await fetch('/api/user/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, phone, image }),
      });
      const data = await res.json();
      if (res.ok) {
        setMsg({ type: 'success', text: 'تم حفظ المعلومات بنجاح' });
        // Update name/phone in session only (NOT image — base64 is too large for JWT cookies)
        await update({ name: data.user.name, phone: data.user.phone });
      } else {
        setMsg({ type: 'error', text: data.error || 'حدث خطأ ما' });
      }
    } catch (error) {
      setMsg({ type: 'error', text: 'فشل الاتصال بالخادم' });
    } finally {
      setIsSaving(false);
    }
  };

  if (status === 'loading') {
    return <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>جاري التحميل...</div>;
  }

  if (!session?.user) return null;

  const userRole = (session.user as any).role === 'ADMIN' ? 'مدير النظام' : (session.user as any).role === 'INSTRUCTOR' ? 'مدرب' : 'طالب مميز';
  const initial = name.charAt(0).toUpperCase() || 'أ';

  return (
    <div className="container" style={{ padding: '2rem 5%' }}>
      <motion.div 
        style={{ textAlign: 'center', marginBottom: '3rem' }}
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <h1 style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>إعدادات <span style={{ color: 'var(--primary)' }}>الحساب</span></h1>
        <p style={{ opacity: 0.8, fontSize: '1.1rem' }}>تحكم في بياناتك الشخصية وتفضيلات الأمان بسهولة.</p>
      </motion.div>

      <div className="grid" style={{ gridTemplateColumns: '1fr 3fr', gap: '2rem' }}>
        
        {/* Sidebar Navigation */}
        <motion.div 
          className="glass-card" 
          style={{ padding: '1.5rem', height: 'fit-content' }}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '2rem', borderBottom: '1px solid var(--border-light)', paddingBottom: '2rem' }}>
            <div style={{ position: 'relative', marginBottom: '1rem' }}>
              {image ? (
                <img src={image} alt="Profile" style={{ width: '100px', height: '100px', borderRadius: '50%', objectFit: 'cover', border: '2px solid var(--primary)' }} />
              ) : (
                <div style={{ width: '100px', height: '100px', borderRadius: '50%', background: 'linear-gradient(135deg, var(--primary) 0%, #000 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2.5rem', fontWeight: 'bold' }}>
                  {initial}
                </div>
              )}
              <button onClick={() => fileRef.current?.click()} style={{ position: 'absolute', bottom: '0', right: '0', background: 'var(--bg)', border: '1px solid var(--border-light)', borderRadius: '50%', padding: '0.5rem', color: 'var(--primary)', cursor: 'pointer' }}>
                <Camera size={16} />
              </button>
              <input type="file" ref={fileRef} style={{ display: 'none' }} accept="image/*" onChange={handleImageChange} />
            </div>
            <h3 style={{ fontSize: '1.2rem', marginBottom: '0.2rem' }}>{name}</h3>
            <span style={{ fontSize: '0.9rem', color: 'var(--primary)', fontWeight: 'bold' }}>{userRole}</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <button 
              onClick={() => setActiveTab('personal')}
              style={{ background: activeTab === 'personal' ? 'rgba(203, 161, 83, 0.1)' : 'transparent', color: activeTab === 'personal' ? 'var(--primary)' : '#fff', border: 'none', padding: '1rem', borderRadius: '8px', textAlign: 'right', display: 'flex', alignItems: 'center', gap: '0.8rem', cursor: 'pointer', transition: 'all 0.3s' }}
            >
              <User size={18} /> المعلومات الشخصية
            </button>
            <button 
              onClick={() => setActiveTab('security')}
              style={{ background: activeTab === 'security' ? 'rgba(203, 161, 83, 0.1)' : 'transparent', color: activeTab === 'security' ? 'var(--primary)' : '#fff', border: 'none', padding: '1rem', borderRadius: '8px', textAlign: 'right', display: 'flex', alignItems: 'center', gap: '0.8rem', cursor: 'pointer', transition: 'all 0.3s' }}
            >
              <Shield size={18} /> الأمان وكلمة المرور
            </button>
            <button 
              onClick={() => setActiveTab('notifications')}
              style={{ background: activeTab === 'notifications' ? 'rgba(203, 161, 83, 0.1)' : 'transparent', color: activeTab === 'notifications' ? 'var(--primary)' : '#fff', border: 'none', padding: '1rem', borderRadius: '8px', textAlign: 'right', display: 'flex', alignItems: 'center', gap: '0.8rem', cursor: 'pointer', transition: 'all 0.3s' }}
            >
              <Bell size={18} /> الإشعارات
            </button>
          </div>
        </motion.div>

        {/* Main Settings Area */}
        <motion.div 
          className="glass-card" 
          style={{ padding: '2.5rem' }}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          {activeTab === 'personal' && (
            <div>
              <h2 style={{ fontSize: '1.5rem', marginBottom: '2rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <User size={24} color="var(--primary)" /> المعلومات الشخصية
              </h2>
              
              {msg.text && (
                <div style={{ padding: '1rem', marginBottom: '1.5rem', borderRadius: '8px', background: msg.type === 'error' ? 'rgba(239, 68, 68, 0.1)' : 'rgba(34, 197, 94, 0.1)', color: msg.type === 'error' ? '#ef4444' : '#22c55e', border: `1px solid ${msg.type === 'error' ? '#ef4444' : '#22c55e'}` }}>
                  {msg.text}
                </div>
              )}

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '2rem' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <label style={{ opacity: 0.8, fontSize: '0.9rem' }}>الاسم الكامل</label>
                  <div style={{ position: 'relative' }}>
                    <User size={18} style={{ position: 'absolute', right: '1rem', top: '50%', transform: 'translateY(-50%)', opacity: 0.5 }} />
                    <input type="text" value={name} onChange={e => setName(e.target.value)} style={{ width: '100%', padding: '0.8rem 2.5rem 0.8rem 1rem', borderRadius: '8px', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-light)', color: '#fff' }} />
                  </div>
                </div>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <label style={{ opacity: 0.8, fontSize: '0.9rem' }}>البريد الإلكتروني</label>
                  <div style={{ position: 'relative' }}>
                    <Mail size={18} style={{ position: 'absolute', right: '1rem', top: '50%', transform: 'translateY(-50%)', opacity: 0.5 }} />
                    <input type="email" value={email} disabled style={{ width: '100%', padding: '0.8rem 2.5rem 0.8rem 1rem', borderRadius: '8px', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-light)', color: 'rgba(255,255,255,0.5)', cursor: 'not-allowed' }} />
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <label style={{ opacity: 0.8, fontSize: '0.9rem' }}>رقم الهاتف (اختياري)</label>
                  <div style={{ position: 'relative' }}>
                    <Phone size={18} style={{ position: 'absolute', right: '1rem', top: '50%', transform: 'translateY(-50%)', opacity: 0.5 }} />
                    <input type="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="+963 9XX XXX XXX" style={{ width: '100%', padding: '0.8rem 2.5rem 0.8rem 1rem', borderRadius: '8px', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-light)', color: '#fff', direction: 'ltr' }} />
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', borderTop: '1px solid var(--border-light)', paddingTop: '1.5rem' }}>
                <button onClick={handleSaveProfile} disabled={isSaving} className="btn btn-solid" style={{ padding: '0.8rem 2rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  {isSaving ? <Loader size={18} className="animate-spin" /> : 'حفظ التعديلات'}
                </button>
              </div>
            </div>
          )}

          {activeTab === 'security' && (
            <div>
              <h2 style={{ fontSize: '1.5rem', marginBottom: '2rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Shield size={24} color="var(--primary)" /> الأمان وكلمة المرور
              </h2>
              
              <div style={{ maxWidth: '400px', display: 'flex', flexDirection: 'column', gap: '1.5rem', marginBottom: '2rem' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <label style={{ opacity: 0.8, fontSize: '0.9rem' }}>كلمة المرور الحالية</label>
                  <div style={{ position: 'relative' }}>
                    <Lock size={18} style={{ position: 'absolute', right: '1rem', top: '50%', transform: 'translateY(-50%)', opacity: 0.5 }} />
                    <input type="password" placeholder="••••••••" style={{ width: '100%', padding: '0.8rem 2.5rem 0.8rem 1rem', borderRadius: '8px', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-light)', color: '#fff' }} />
                  </div>
                </div>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <label style={{ opacity: 0.8, fontSize: '0.9rem' }}>كلمة المرور الجديدة</label>
                  <div style={{ position: 'relative' }}>
                    <Key size={18} style={{ position: 'absolute', right: '1rem', top: '50%', transform: 'translateY(-50%)', opacity: 0.5 }} />
                    <input type="password" placeholder="أدخل كلمة مرور قوية" style={{ width: '100%', padding: '0.8rem 2.5rem 0.8rem 1rem', borderRadius: '8px', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-light)', color: '#fff' }} />
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <label style={{ opacity: 0.8, fontSize: '0.9rem' }}>تأكيد كلمة المرور الجديدة</label>
                  <div style={{ position: 'relative' }}>
                    <Key size={18} style={{ position: 'absolute', right: '1rem', top: '50%', transform: 'translateY(-50%)', opacity: 0.5 }} />
                    <input type="password" placeholder="أعد إدخال كلمة المرور" style={{ width: '100%', padding: '0.8rem 2.5rem 0.8rem 1rem', borderRadius: '8px', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-light)', color: '#fff' }} />
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-start', borderTop: '1px solid var(--border-light)', paddingTop: '1.5rem' }}>
                <button className="btn btn-solid" style={{ padding: '0.8rem 2rem' }}>تحديث كلمة المرور</button>
              </div>
            </div>
          )}

          {activeTab === 'notifications' && (
            <div>
              <h2 style={{ fontSize: '1.5rem', marginBottom: '2rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Bell size={24} color="var(--primary)" /> تفضيلات الإشعارات
              </h2>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '2rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem', background: 'rgba(255,255,255,0.02)', borderRadius: '12px' }}>
                  <div>
                    <h4 style={{ marginBottom: '0.2rem' }}>إشعارات الدورات الجديدة</h4>
                    <p style={{ fontSize: '0.8rem', opacity: 0.6 }}>احصل على تنبيه عند إضافة دورات في تخصصاتك المفضلة.</p>
                  </div>
                  <div style={{ width: '44px', height: '24px', background: 'var(--primary)', borderRadius: '12px', position: 'relative', cursor: 'pointer' }}>
                    <div style={{ width: '20px', height: '20px', background: '#000', borderRadius: '50%', position: 'absolute', top: '2px', left: '2px' }}></div>
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem', background: 'rgba(255,255,255,0.02)', borderRadius: '12px' }}>
                  <div>
                    <h4 style={{ marginBottom: '0.2rem' }}>تنبيهات البث المباشر</h4>
                    <p style={{ fontSize: '0.8rem', opacity: 0.6 }}>تذكير قبل بدء غرف الدراسة أو البث المباشر بـ 15 دقيقة.</p>
                  </div>
                  <div style={{ width: '44px', height: '24px', background: 'var(--primary)', borderRadius: '12px', position: 'relative', cursor: 'pointer' }}>
                    <div style={{ width: '20px', height: '20px', background: '#000', borderRadius: '50%', position: 'absolute', top: '2px', left: '2px' }}></div>
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem', background: 'rgba(255,255,255,0.02)', borderRadius: '12px' }}>
                  <div>
                    <h4 style={{ marginBottom: '0.2rem' }}>رسائل ترويجية</h4>
                    <p style={{ fontSize: '0.8rem', opacity: 0.6 }}>تلقي عروض الخصم الخاصة بالأكاديمية.</p>
                  </div>
                  <div style={{ width: '44px', height: '24px', background: 'rgba(255,255,255,0.2)', borderRadius: '12px', position: 'relative', cursor: 'pointer' }}>
                    <div style={{ width: '20px', height: '20px', background: '#fff', borderRadius: '50%', position: 'absolute', top: '2px', right: '2px' }}></div>
                  </div>
                </div>
              </div>
            </div>
          )}

        </motion.div>
      </div>
    </div>
  );
}
