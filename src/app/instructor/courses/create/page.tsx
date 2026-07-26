'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { BookOpen, Upload, DollarSign, List, Image as ImageIcon } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';

export default function CreateCoursePage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [loading, setLoading] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priceSYP, setPriceSYP] = useState('');
  const [priceUSD, setPriceUSD] = useState('');
  const [category, setCategory] = useState('');
  const [customCategory, setCustomCategory] = useState('');
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);
  const [thumbnailPreview, setThumbnailPreview] = useState<string | null>(null);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        alert('حجم الصورة يجب أن يكون أقل من 5 ميغابايت');
        return;
      }
      setThumbnailFile(file);
      setThumbnailPreview(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      let uploadedThumbnailUrl = '';

      if (thumbnailFile) {
        const formData = new FormData();
        formData.append('image', thumbnailFile);
        
        const uploadRes = await fetch('/api/upload/image', {
          method: 'POST',
          body: formData
        });
        
        if (!uploadRes.ok) throw new Error('فشل رفع الصورة المصغرة تأكد من مجلد الرفع');
        const uploadData = await uploadRes.json();
        uploadedThumbnailUrl = uploadData.url;
      }

      const finalCategory = category === 'أخرى' ? customCategory : category;
      if (!finalCategory) {
        throw new Error('يرجى اختيار التصنيف أو كتابته');
      }

      const courseRes = await fetch('/api/courses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          description,
          price: priceUSD,
          priceSYP: priceSYP,
          category: finalCategory,
          thumbnail: uploadedThumbnailUrl
        })
      });

      if (!courseRes.ok) {
        const err = await courseRes.json();
        throw new Error(err.error || 'فشل إنشاء الكورس');
      }

      const data = await courseRes.json();
      alert('تم إنشاء الكورس بنجاح!');
      router.push(`/instructor/courses/${data.course.id}/chapters`);
      
    } catch (error: any) {
      console.error(error);
      alert(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: '2rem 5%', minHeight: '100vh', background: '#050505', color: '#fff' }}>
      <div style={{ maxWidth: '800px', margin: '0 auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
          <h1 style={{ fontSize: '2rem', fontWeight: 'bold' }}>إضافة كورس جديد</h1>
          <Link href="/instructor/courses" className="btn" style={{ padding: '0.5rem 1rem' }}>إلغاء</Link>
        </div>

        <form onSubmit={handleSubmit} className="glass-card" style={{ padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', color: 'rgba(255,255,255,0.8)' }}>عنوان الكورس</label>
            <div style={{ position: 'relative' }}>
              <BookOpen size={20} color="rgba(255,255,255,0.4)" style={{ position: 'absolute', top: '50%', right: '1rem', transform: 'translateY(-50%)' }} />
              <input required type="text" value={title} onChange={e => setTitle(e.target.value)} placeholder="مثال: دورة تطوير تطبيقات الويب" style={{ width: '100%', padding: '0.8rem 2.5rem 0.8rem 0.8rem', borderRadius: '8px', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff' }} />
            </div>
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', color: 'rgba(255,255,255,0.8)' }}>الوصف</label>
            <textarea required value={description} onChange={e => setDescription(e.target.value)} placeholder="اكتب وصفاً مفصلاً لما سيتعلمه الطالب..." rows={4} style={{ width: '100%', padding: '0.8rem', borderRadius: '8px', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff' }}></textarea>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', color: 'rgba(255,255,255,0.8)' }}>السعر بالليرة السورية</label>
              <div style={{ position: 'relative' }}>
                <DollarSign size={20} color="rgba(255,255,255,0.4)" style={{ position: 'absolute', top: '50%', right: '1rem', transform: 'translateY(-50%)' }} />
                <input type="number" min="0" value={priceSYP} onChange={e => setPriceSYP(e.target.value)} placeholder="مثال: 50000" style={{ width: '100%', padding: '0.8rem 2.5rem 0.8rem 0.8rem', borderRadius: '8px', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff' }} />
              </div>
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', color: 'rgba(255,255,255,0.8)' }}>السعر بالدولار</label>
              <div style={{ position: 'relative' }}>
                <DollarSign size={20} color="rgba(255,255,255,0.4)" style={{ position: 'absolute', top: '50%', right: '1rem', transform: 'translateY(-50%)' }} />
                <input type="number" min="0" value={priceUSD} onChange={e => setPriceUSD(e.target.value)} placeholder="مثال: 50" style={{ width: '100%', padding: '0.8rem 2.5rem 0.8rem 0.8rem', borderRadius: '8px', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff' }} />
              </div>
            </div>
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', color: 'rgba(255,255,255,0.8)' }}>التصنيف</label>
            <div style={{ position: 'relative' }}>
              <List size={20} color="rgba(255,255,255,0.4)" style={{ position: 'absolute', top: '50%', right: '1rem', transform: 'translateY(-50%)' }} />
              <select required value={category} onChange={e => setCategory(e.target.value)} style={{ width: '100%', padding: '0.8rem 2.5rem 0.8rem 0.8rem', borderRadius: '8px', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', appearance: 'none' }}>
                <option value="" disabled>اختر تصنيفاً...</option>
                <option value="البرمجة">البرمجة</option>
                <option value="التصميم">التصميم</option>
                <option value="اللغات">اللغات</option>
                <option value="العلوم">العلوم</option>
                <option value="البكالوريا">البكالوريا</option>
                <option value="التسويق">التسويق</option>
                <option value="الأعمال">الأعمال</option>
                <option value="الطب والصحة">الطب والصحة</option>
                <option value="الهندسة">الهندسة</option>
                <option value="الفنون والموسيقى">الفنون والموسيقى</option>
                <option value="تطوير الذات">تطوير الذات</option>
                <option value="أخرى">أخرى (كتابة يدوية)</option>
              </select>
            </div>
            {category === 'أخرى' && (
              <div style={{ marginTop: '0.8rem' }}>
                <input required type="text" value={customCategory} onChange={e => setCustomCategory(e.target.value)} placeholder="اكتب التصنيف هنا..." style={{ width: '100%', padding: '0.8rem', borderRadius: '8px', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(203,161,83,0.5)', color: '#fff' }} />
              </div>
            )}
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', color: 'rgba(255,255,255,0.8)' }}>الصورة المصغرة للكورس</label>
            <input 
              type="file" 
              accept="image/png, image/jpeg, image/gif" 
              ref={fileInputRef} 
              onChange={handleImageChange} 
              style={{ display: 'none' }} 
            />
            <div 
              onClick={() => fileInputRef.current?.click()}
              style={{ 
                background: 'rgba(0,0,0,0.3)', 
                border: '2px dashed rgba(255,255,255,0.1)', 
                borderRadius: '12px', 
                padding: thumbnailPreview ? '0' : '2rem', 
                textAlign: 'center', 
                cursor: 'pointer',
                overflow: 'hidden',
                position: 'relative',
                minHeight: '200px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center'
              }}>
              {thumbnailPreview ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={thumbnailPreview} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover', position: 'absolute', inset: 0 }} />
              ) : (
                <>
                  <ImageIcon size={40} color="var(--primary)" style={{ margin: '0 auto 1rem auto' }} />
                  <p style={{ color: 'rgba(255,255,255,0.7)', marginBottom: '0.5rem' }}>اضغط هنا لرفع صورة</p>
                  <p style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.4)' }}>PNG, JPG, GIF (Max. 5MB)</p>
                </>
              )}
            </div>
          </div>

          <button type="submit" disabled={loading} className="btn btn-solid" style={{ marginTop: '1rem', padding: '1rem', fontSize: '1.1rem', width: '100%' }}>
            {loading ? 'جاري الإضافة...' : 'إنشاء الكورس'}
          </button>
        </form>
      </div>
    </div>
  );
}

