'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Save, ArrowRight } from 'lucide-react';
import Link from 'next/link';

export default function CreateCoursePage() {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priceUSD, setPriceUSD] = useState('');
  const [priceSYP, setPriceSYP] = useState('');
  const [category, setCategory] = useState('برمجة وتطوير');
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const categories = [
    'برمجة وتطوير', 'الذكاء الاصطناعي', 'إدارة أعمال', 'تصميم جرافيك', 
    'تسويق رقمي', 'لغات', 'الطب والصحة', 'هندسة معمارية', 'التصوير والمونتاج',
    'المالية والمحاسبة', 'التنمية البشرية', 'التغذية والرياضة', 'أخرى'
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const res = await fetch('/api/courses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          description,
          price: Number(priceUSD),
          priceSYP: Number(priceSYP),
          category
        })
      });

      if (res.ok) {
        const data = await res.json();
        // Redirect to curriculum builder for this course
        router.push(`/instructor/courses/${data.course.id}/chapters`);
      } else {
        const data = await res.json();
        alert(data.error);
      }
    } catch (error) {
      alert('حدث خطأ أثناء الإنشاء');
    }
    setIsLoading(false);
  };

  return (
    <div style={{ padding: '2rem', maxWidth: '800px', margin: '0 auto', color: '#fff' }}>
      <Link href="/instructor/courses" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', color: 'rgba(255,255,255,0.6)', textDecoration: 'none', marginBottom: '2rem' }}>
        <ArrowRight size={20} /> العودة للكورسات
      </Link>

      <h1 style={{ fontSize: '2rem', fontWeight: 'bold', marginBottom: '2rem' }}>إنشاء كورس جديد 🚀</h1>

      <form onSubmit={handleSubmit} style={{ background: '#111', padding: '2rem', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.05)' }}>
        
        <div style={{ marginBottom: '1.5rem' }}>
          <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>عنوان الكورس</label>
          <input 
            required
            type="text" 
            placeholder="مثال: دورة تطوير تطبيقات الموبايل"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            style={{ width: '100%', padding: '1rem', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', borderRadius: '8px' }}
          />
        </div>

        <div style={{ marginBottom: '1.5rem' }}>
          <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>وصف الكورس</label>
          <textarea 
            required
            placeholder="اكتب وصفاً جذاباً يشرح ماذا سيتعلم الطالب..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            style={{ width: '100%', height: '120px', padding: '1rem', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', borderRadius: '8px', resize: 'none' }}
          />
        </div>

        <div style={{ display: 'flex', gap: '1.5rem', marginBottom: '2rem' }}>
          <div style={{ flex: 1 }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>السعر (بالدولار الأمريكي $)</label>
            <input 
              required
              type="number" 
              min="0"
              placeholder="مثال: 50"
              value={priceUSD}
              onChange={(e) => setPriceUSD(e.target.value)}
              style={{ width: '100%', padding: '1rem', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', borderRadius: '8px' }}
            />
          </div>

          <div style={{ flex: 1 }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>السعر (بالليرة السورية)</label>
            <input 
              required
              type="number" 
              min="0"
              placeholder="مثال: 750000"
              value={priceSYP}
              onChange={(e) => setPriceSYP(e.target.value)}
              style={{ width: '100%', padding: '1rem', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', borderRadius: '8px' }}
            />
          </div>

          <div style={{ flex: 1 }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>التصنيف</label>
            <select 
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              style={{ width: '100%', padding: '1rem', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', borderRadius: '8px' }}
            >
              {categories.map(cat => <option key={cat} value={cat} style={{ background: '#111' }}>{cat}</option>)}
            </select>
          </div>
        </div>

        <button 
          type="submit" 
          disabled={isLoading}
          style={{ width: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem', padding: '1rem', background: 'var(--primary)', color: '#000', borderRadius: '8px', fontWeight: 'bold', border: 'none', cursor: 'pointer', fontSize: '1.1rem' }}
        >
          {isLoading ? 'جاري الإنشاء...' : <><Save size={20} /> حفظ والانتقال لإضافة الدروس</>}
        </button>

      </form>
    </div>
  );
}
