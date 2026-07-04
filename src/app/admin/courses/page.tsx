'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { PlusCircle, Book, DollarSign, User, Image as ImageIcon, CheckCircle, Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function AdminCoursesPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    price: '',
    category: '',
    thumbnail: '',
    instructorId: 'cm4xyabcd0001example' // Mocking an instructor ID for now. In a real app, this comes from a dropdown of users.
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setSuccess(false);
    
    try {
      const res = await fetch('/api/courses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          price: parseFloat(formData.price) || 0,
          priceSYP: parseFloat((formData as any).priceSYP) || 0
        })
      });

      const data = await res.json();
      
      if (data.success) {
        setSuccess(true);
        setFormData({
          title: '',
          description: '',
          price: '',
          category: '',
          thumbnail: '',
          instructorId: 'cm4xyabcd0001example'
        });
        setTimeout(() => {
          router.push('/courses');
        }, 2000);
      } else {
        alert('حدث خطأ: ' + data.error);
      }
    } catch (error) {
      alert('خطأ في الاتصال بالخادم');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container" style={{ padding: '2rem 5%', maxWidth: '800px', margin: '0 auto' }}>
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-card" 
        style={{ padding: '3rem' }}
      >
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{ display: 'inline-flex', padding: '1rem', background: 'rgba(203, 161, 83, 0.1)', borderRadius: '50%', marginBottom: '1rem' }}>
            <PlusCircle size={40} color="var(--primary)" />
          </div>
          <h1 style={{ fontSize: '2rem' }}>إضافة دورة جديدة</h1>
          <p style={{ opacity: 0.7 }}>أدخل بيانات الدورة لتضاف فوراً لقاعدة البيانات وتظهر للمشتركين</p>
        </div>

        {success ? (
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            style={{ textAlign: 'center', padding: '3rem', background: 'rgba(16, 185, 129, 0.1)', borderRadius: '16px', border: '1px solid rgba(16, 185, 129, 0.2)' }}
          >
            <CheckCircle size={60} color="#10b981" style={{ margin: '0 auto 1rem auto' }} />
            <h2 style={{ color: '#10b981', marginBottom: '0.5rem' }}>تم إضافة الدورة بنجاح!</h2>
            <p style={{ opacity: 0.8 }}>جاري تحويلك إلى المتجر لرؤية النتيجة...</p>
          </motion.div>
        ) : (
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 600 }}>
                <Book size={18} color="var(--primary)" /> عنوان الدورة
              </label>
              <input 
                required
                type="text" 
                value={formData.title}
                onChange={e => setFormData({...formData, title: e.target.value})}
                placeholder="مثال: التصميم الجرافيكي المتقدم"
                style={{ padding: '1rem', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: '#fff', fontSize: '1rem', textAlign: 'right' }}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1.5rem' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 600 }}>
                  <DollarSign size={18} color="var(--primary)" /> السعر بالدولار ($)
                </label>
                <input 
                  required
                  type="number" 
                  value={formData.price}
                  onChange={e => setFormData({...formData, price: e.target.value})}
                  placeholder="مثال: 50"
                  style={{ padding: '1rem', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: '#fff', fontSize: '1rem', textAlign: 'right' }}
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 600 }}>
                  <DollarSign size={18} color="var(--primary)" /> السعر بالسوري (ل.س)
                </label>
                <input 
                  required
                  type="number" 
                  value={(formData as any).priceSYP || ''}
                  onChange={e => setFormData({...formData, priceSYP: e.target.value} as any)}
                  placeholder="مثال: 725000"
                  style={{ padding: '1rem', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: '#fff', fontSize: '1rem', textAlign: 'right' }}
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 600 }}>
                  <Book size={18} color="var(--primary)" /> التصنيف
                </label>
                <select 
                  required
                  value={formData.category}
                  onChange={e => setFormData({...formData, category: e.target.value})}
                  style={{ padding: '1rem', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: '#fff', fontSize: '1rem', textAlign: 'right', direction: 'rtl' }}
                >
                  <option value="" disabled style={{ color: '#000' }}>اختر التصنيف...</option>
                  <option value="برمجة وتطوير" style={{ color: '#000' }}>برمجة وتطوير</option>
                  <option value="تصميم وإبداع" style={{ color: '#000' }}>تصميم وإبداع</option>
                  <option value="ذكاء اصطناعي" style={{ color: '#000' }}>ذكاء اصطناعي</option>
                  <option value="أعمال وتسويق" style={{ color: '#000' }}>أعمال وتسويق</option>
                </select>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 600 }}>
                <ImageIcon size={18} color="var(--primary)" /> رابط صورة الغلاف (اختياري)
              </label>
              <input 
                type="text" 
                value={formData.thumbnail}
                onChange={e => setFormData({...formData, thumbnail: e.target.value})}
                placeholder="https://example.com/image.jpg"
                style={{ padding: '1rem', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: '#fff', fontSize: '1rem', textAlign: 'left', direction: 'ltr' }}
              />
            </div>

            <button 
              type="submit" 
              disabled={loading}
              className="btn btn-solid" 
              style={{ padding: '1.2rem', fontSize: '1.1rem', marginTop: '1rem', display: 'flex', justifyContent: 'center' }}
            >
              {loading ? <Loader2 className="spin" /> : 'حفظ الدورة في قاعدة البيانات'}
            </button>
          </form>
        )}
      </motion.div>

      <style jsx global>{`
        .spin {
          animation: spin 1s linear infinite;
        }
        @keyframes spin {
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
