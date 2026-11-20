'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { BookOpen, DollarSign } from 'lucide-react';
import Link from 'next/link';
import CourseTaxonomyFields, { type TaxonomyValue } from '@/components/course/CourseTaxonomyFields';
import CoverPicker from '@/components/course/CoverPicker';

export default function CreateCoursePage() {
  const router = useRouter();
  
  const [loading, setLoading] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priceSYP, setPriceSYP] = useState('');
  const [durationHours, setDurationHours] = useState('');
  const [priceUSD, setPriceUSD] = useState('');
  const [taxonomy, setTaxonomy] = useState<TaxonomyValue>({ categoryId: '', tags: [], trainingType: '' });
  const [courseType, setCourseType] = useState('SKILL');
  // Uploaded 1280x720 cover URL, prepared and previewed by CoverPicker.
  const [thumbnail, setThumbnail] = useState<string | null>(null);
  
  // Dynamic features state
  const [includes, setIncludes] = useState<string[]>([]);
  const [newFeature, setNewFeature] = useState('');

  const addFeature = () => {
    if (newFeature.trim() !== '') {
      setIncludes([...includes, newFeature.trim()]);
      setNewFeature('');
    }
  };

  const removeFeature = (index: number) => {
    setIncludes(includes.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (!taxonomy.categoryId) {
        throw new Error('يرجى اختيار تصنيف الكورس');
      }

      const courseRes = await fetch('/api/courses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          description,
          type: courseType,
          price: priceUSD,
          priceSYP: priceSYP,
          categoryId: taxonomy.categoryId,
          tags: taxonomy.tags,
          trainingType: taxonomy.trainingType || null,
          thumbnail: thumbnail ?? undefined,
          includes: includes,
          durationHours
        })
      });

      if (!courseRes.ok) {
        const err = await courseRes.json();
        throw new Error(err.error || 'فشل إنشاء الكورس');
      }

      const data = await courseRes.json();
      alert(data.message || 'تم إنشاء الكورس');
      router.push(`/instructor/courses/${data.course.id}/chapters`);
      
    } catch (error: any) {
      console.error(error);
      alert(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: '2rem 5%', minHeight: '100vh', background: 'var(--background)', color: '#fff' }}>
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

          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', color: 'rgba(255,255,255,0.8)' }}>نوع الكورس</label>
            <div style={{ position: 'relative' }}>
              <select required value={courseType} onChange={e => { setCourseType(e.target.value); setTaxonomy(current => ({ ...current, categoryId: '' })); }} style={{ width: '100%', padding: '0.8rem 2.5rem 0.8rem 0.8rem', borderRadius: '8px', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', appearance: 'none' }}>
                <option value="SKILL">كورس مهاري عام (برمجة، لغات، أعمال...)</option>
                <option value="CURRICULUM">منهاج دراسي (بكالوريا، تاسع...)</option>
              </select>
            </div>
          </div>

          <div>
            <label htmlFor="course-duration-hours" style={{ display: 'block', marginBottom: '0.5rem', color: 'rgba(255,255,255,0.8)' }}>مدة الكورس بالساعات (اختياري)</label>
            <input id="course-duration-hours" type="number" min="0" max="2000" step="0.5" inputMode="decimal" value={durationHours} onChange={e => setDurationHours(e.target.value)} placeholder="تظهر على شهادة الإتمام. اتركها فارغة إن لم تكن محددة" style={{ width: '100%', padding: '0.8rem', borderRadius: '8px', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff' }} />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 250px), 1fr))', gap: '1.5rem' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', color: 'rgba(255,255,255,0.8)' }}>السعر المقترح بالليرة السورية</label>
              <div style={{ position: 'relative' }}>
                <DollarSign size={20} color="rgba(255,255,255,0.4)" style={{ position: 'absolute', top: '50%', right: '1rem', transform: 'translateY(-50%)' }} />
                <input type="number" min="0" value={priceSYP} onChange={e => setPriceSYP(e.target.value)} placeholder="مثال: 50000" style={{ width: '100%', padding: '0.8rem 2.5rem 0.8rem 0.8rem', borderRadius: '8px', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff' }} />
              </div>
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', color: 'rgba(255,255,255,0.8)' }}>السعر المقترح بالدولار</label>
              <div style={{ position: 'relative' }}>
                <DollarSign size={20} color="rgba(255,255,255,0.4)" style={{ position: 'absolute', top: '50%', right: '1rem', transform: 'translateY(-50%)' }} />
                <input type="number" min="0" value={priceUSD} onChange={e => setPriceUSD(e.target.value)} placeholder="مثال: 50" style={{ width: '100%', padding: '0.8rem 2.5rem 0.8rem 0.8rem', borderRadius: '8px', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff' }} />
              </div>
            </div>
            <p style={{ gridColumn: '1 / -1', margin: 0, fontSize: '0.85rem', opacity: 0.7 }}>
              يُحفظ الكورس كمسودة غير ظاهرة للطلاب. الإدارة تعتمد السعر النهائي عند مراجعة الكورس ونشره.
            </p>
          </div>

          <CourseTaxonomyFields value={taxonomy} onChange={setTaxonomy} courseType={courseType} />

          <div>
            <span style={{ display: 'block', marginBottom: '0.5rem', color: 'rgba(255,255,255,0.8)' }}>صورة غلاف الكورس</span>
            <CoverPicker value={thumbnail} onChange={setThumbnail} disabled={loading} />
          </div>

          <div style={{ padding: '1.5rem', background: 'rgba(255,255,255,0.02)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
            <label style={{ display: 'block', marginBottom: '0.8rem', color: '#fff', fontWeight: 'bold' }}>ماذا يتضمن هذا الكورس؟ (الميزات)</label>
            <p style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.5)', marginBottom: '1rem' }}>أضف ميزات الكورس مثل "متابعة شخصية"، "تدريب عملي"، الخ. سيتم عرض أيقونة الصح ✔️ بجانب كل ميزة.</p>
            
            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
              <input 
                type="text" 
                value={newFeature} 
                onChange={e => setNewFeature(e.target.value)} 
                onKeyDown={(e) => { if(e.key === 'Enter') { e.preventDefault(); addFeature(); } }}
                placeholder="أدخل ميزة جديدة..." 
                style={{ flex: 1, padding: '0.8rem', borderRadius: '8px', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff' }} 
              />
              <button type="button" onClick={addFeature} className="btn btn-solid" style={{ padding: '0 1.5rem', borderRadius: '8px' }}>إضافة</button>
            </div>

            {includes.length > 0 && (
              <ul style={{ listStyle: 'none', padding: 0, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {includes.map((feature, idx) => (
                  <li key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(0,0,0,0.4)', padding: '0.8rem 1rem', borderRadius: '8px' }}>
                    <span style={{ color: 'rgba(255,255,255,0.9)' }}>✔️ {feature}</span>
                    <button type="button" onClick={() => removeFeature(idx)} style={{ color: 'var(--danger)', background: 'transparent', border: 'none', cursor: 'pointer', fontWeight: 'bold' }}>حذف</button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <button type="submit" disabled={loading} className="btn btn-solid" style={{ marginTop: '1rem', padding: '1rem', fontSize: '1.1rem', width: '100%' }}>
            {loading ? 'جاري الإضافة...' : 'إنشاء الكورس'}
          </button>
        </form>
      </div>
    </div>
  );
}

