'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { FileText, User, Briefcase, GraduationCap, Code, Download, Eye, Plus, Trash2, ChevronRight } from 'lucide-react';
import Link from 'next/link';

interface ResumeData {
  personal: { name: string; title: string; email: string; phone: string; location: string; summary: string; website?: string; image?: string };
  experience: { id: number; company: string; role: string; period: string; desc: string }[];
  education: { id: number; institution: string; degree: string; year: string }[];
  skills: string[];
  certificates: { id: number; name: string; issuer: string; year: string }[];
}

const defaultData: ResumeData = {
  personal: {
    name: 'مراد ناصر',
    title: 'محلل نظم',
    email: 'hello@reallygreatsite.com',
    phone: '+123-456-7890',
    location: '123 Anywhere St., Any City',
    website: 'www.reallygreatsite.com',
    summary: 'أنا محلل أنظمة مركز على النتائج مع مهارات تواصل ممتازة، وكذلك فهم عميق للنظم الرقمية وعمليات سلسلة الإمداد.',
    image: ''
  },
  experience: [
    { id: 1, company: 'شركة الحلفاء بونيو', role: 'محلل نظم', period: '2018 - الآن', desc: 'مراجعة الأنظمة التنظيمية للعملاء\nترجمة متطلبات العمل إلى تصميمات وظيفية\nتدريب الموظفين والمستخدمين على برامج الكمبيوتر المختلفة' },
    { id: 2, company: 'استوديو الأقمار', role: 'محلل بيانات خبير', period: '2017 - 2018', desc: 'جمع البيانات وتحليلها باستخدام أطر عمل مختلفة\nاستكشاف مشكلات البرامج وإصلاحها\nتطبيق الأساليب الإحصائية لتشخيص مشكلات العمل' }
  ],
  education: [
    { id: 1, institution: 'معهد الرؤية', degree: 'شهادة دراسات عليا', year: '2018 - 2019' },
    { id: 2, institution: 'جامعة القاهرة', degree: 'بكالوريوس علوم', year: '2011 - 2015' }
  ],
  skills: ['التطوير الأساسي للبرمجيات', 'توثيق المشروعات', 'تحليل نموذج العمل التجاري', 'حل المشكلات', 'اختبار الجودة', 'التفكير في تصميم', 'البحث والتدريب'],
  certificates: []
};

export default function ResumePage() {
  const [data, setData] = useState<ResumeData>(defaultData);
  const [activeSection, setActiveSection] = useState<string>('personal');
  const [showPreview, setShowPreview] = useState(false);
  const [newSkill, setNewSkill] = useState('');

  const updatePersonal = (field: string, value: string) => {
    setData(d => ({ ...d, personal: { ...d.personal, [field]: value } }));
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        updatePersonal('image', reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const addExperience = () => {
    setData(d => ({
      ...d,
      experience: [...d.experience, { id: Date.now(), company: '', role: '', period: '', desc: '' }]
    }));
  };

  const updateExperience = (id: number, field: string, value: string) => {
    setData(d => ({
      ...d,
      experience: d.experience.map(e => e.id === id ? { ...e, [field]: value } : e)
    }));
  };

  const removeExperience = (id: number) => {
    setData(d => ({ ...d, experience: d.experience.filter(e => e.id !== id) }));
  };

  const addSkill = () => {
    if (newSkill.trim() && !data.skills.includes(newSkill.trim())) {
      setData(d => ({ ...d, skills: [...d.skills, newSkill.trim()] }));
      setNewSkill('');
    }
  };

  const removeSkill = (skill: string) => {
    setData(d => ({ ...d, skills: d.skills.filter(s => s !== skill) }));
  };

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '0.75rem 1rem',
    background: 'rgba(255,255,255,0.04)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: '10px', color: '#fff',
    fontSize: '0.95rem', outline: 'none',
    fontFamily: 'inherit', direction: 'rtl'
  };

  const labelStyle: React.CSSProperties = {
    display: 'block', fontSize: '0.85rem',
    color: 'rgba(255,255,255,0.5)',
    marginBottom: '0.4rem'
  };

  const sections = [
    { id: 'personal', label: 'المعلومات الشخصية', icon: <User size={18} /> },
    { id: 'experience', label: 'الخبرات العملية', icon: <Briefcase size={18} /> },
    { id: 'education', label: 'التعليم', icon: <GraduationCap size={18} /> },
    { id: 'skills', label: 'المهارات', icon: <Code size={18} /> },
    { id: 'certificates', label: 'الشهادات', icon: <FileText size={18} /> },
  ];

  return (
    <div style={{ minHeight: '100vh', background: '#050505', color: '#fff', fontFamily: 'system-ui, -apple-system, sans-serif', direction: 'rtl' }}>
      
      {/* Navbar */}
      <div style={{ padding: '1rem 2rem', background: '#0a0a0a', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 50 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <Link href="/dashboard" style={{ color: 'rgba(255,255,255,0.4)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.9rem' }}>
            لوحة التحكم <ChevronRight size={14} />
          </Link>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.7rem' }}>
            <div style={{ width: '36px', height: '36px', background: 'rgba(203,161,83,0.12)', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <FileText size={20} color="var(--primary)" />
            </div>
            <h1 style={{ fontSize: '1.1rem', fontWeight: 'bold' }}>صانع السيرة الذاتية</h1>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button
            onClick={() => setShowPreview(!showPreview)}
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.6rem 1.2rem', background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', color: '#fff', cursor: 'pointer', fontWeight: '600', fontSize: '0.9rem' }}
          >
            <Eye size={16} /> {showPreview ? 'إخفاء المعاينة' : 'معاينة'}
          </button>
          <button
            onClick={() => window.print()}
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.6rem 1.2rem', background: 'var(--primary)', border: 'none', borderRadius: '10px', color: '#000', cursor: 'pointer', fontWeight: 'bold', fontSize: '0.9rem' }}
          >
            <Download size={16} /> تحميل / طباعة
          </button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: showPreview ? '1fr 1fr' : '280px 1fr', gap: '0', height: 'calc(100vh - 65px)' }}>
        
        {/* Left: Editor Panel */}
        <div style={{ background: '#0d0d0d', borderLeft: '1px solid rgba(255,255,255,0.06)', display: 'flex', height: '100%' }}>
          
          {/* Section Tabs (vertical) */}
          <div style={{ width: '60px', borderLeft: '1px solid rgba(255,255,255,0.06)', display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: '1rem', gap: '0.5rem', flexShrink: 0 }}>
            {sections.map(s => (
              <button
                key={s.id}
                onClick={() => setActiveSection(s.id)}
                title={s.label}
                style={{
                  width: '44px', height: '44px', borderRadius: '12px', border: 'none',
                  background: activeSection === s.id ? 'rgba(203,161,83,0.15)' : 'transparent',
                  color: activeSection === s.id ? 'var(--primary)' : 'rgba(255,255,255,0.35)',
                  cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  transition: 'all 0.2s'
                }}
              >
                {s.icon}
              </button>
            ))}
          </div>

          {/* Form */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '1.5rem' }}>
            <h3 style={{ fontWeight: 'bold', fontSize: '1rem', marginBottom: '1.5rem', color: 'var(--primary)' }}>
              {sections.find(s => s.id === activeSection)?.label}
            </h3>

            {activeSection === 'personal' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div>
                  <label style={labelStyle}>الصورة الشخصية (اختياري)</label>
                  <input type="file" accept="image/*" onChange={handleImageUpload} style={{ ...inputStyle, background: 'rgba(255,255,255,0.02)', padding: '0.5rem' }} />
                </div>
                {[
                  { key: 'name', label: 'الاسم الكامل' },
                  { key: 'title', label: 'المسمى الوظيفي' },
                  { key: 'email', label: 'البريد الإلكتروني' },
                  { key: 'phone', label: 'رقم الهاتف' },
                  { key: 'website', label: 'الموقع الإلكتروني / لينكد إن' },
                  { key: 'location', label: 'الموقع / المدينة' },
                ].map(field => (
                  <div key={field.key}>
                    <label style={labelStyle}>{field.label}</label>
                    <input
                      type="text"
                      value={(data.personal as any)[field.key]}
                      onChange={e => updatePersonal(field.key, e.target.value)}
                      style={inputStyle}
                    />
                  </div>
                ))}
                <div>
                  <label style={labelStyle}>نبذة مختصرة</label>
                  <textarea
                    value={data.personal.summary}
                    onChange={e => updatePersonal('summary', e.target.value)}
                    rows={4}
                    style={{ ...inputStyle, resize: 'vertical' }}
                  />
                </div>
              </div>
            )}

            {activeSection === 'experience' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                {data.experience.map((exp, i) => (
                  <div key={exp.id} style={{ background: 'rgba(255,255,255,0.03)', borderRadius: '14px', padding: '1.2rem', border: '1px solid rgba(255,255,255,0.06)', position: 'relative' }}>
                    <button onClick={() => removeExperience(exp.id)} style={{ position: 'absolute', top: '1rem', left: '1rem', background: 'rgba(239,68,68,0.1)', border: 'none', color: '#ef4444', borderRadius: '8px', width: '30px', height: '30px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Trash2 size={14} />
                    </button>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                      {[
                        { key: 'company', label: 'اسم الشركة / المؤسسة' },
                        { key: 'role', label: 'المسمى الوظيفي' },
                        { key: 'period', label: 'الفترة الزمنية (مثال: 2022 - 2024)' },
                        { key: 'desc', label: 'وصف المهام والإنجازات' },
                      ].map(f => (
                        <div key={f.key}>
                          <label style={labelStyle}>{f.label}</label>
                          {f.key === 'desc'
                            ? <textarea value={(exp as any)[f.key]} onChange={e => updateExperience(exp.id, f.key, e.target.value)} rows={3} style={{ ...inputStyle, resize: 'vertical' }} />
                            : <input type="text" value={(exp as any)[f.key]} onChange={e => updateExperience(exp.id, f.key, e.target.value)} style={inputStyle} />
                          }
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
                <button onClick={addExperience} style={{ width: '100%', padding: '0.8rem', background: 'rgba(255,255,255,0.04)', border: '1px dashed rgba(255,255,255,0.15)', borderRadius: '12px', color: 'rgba(255,255,255,0.6)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', fontSize: '0.9rem' }}>
                  <Plus size={16} /> إضافة خبرة جديدة
                </button>
              </div>
            )}

            {activeSection === 'skills' && (
              <div>
                <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem' }}>
                  <input
                    type="text"
                    value={newSkill}
                    onChange={e => setNewSkill(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && addSkill()}
                    placeholder="أدخل مهارة..."
                    style={{ ...inputStyle, flex: 1 }}
                  />
                  <button onClick={addSkill} style={{ padding: '0.75rem 1rem', background: 'var(--primary)', color: '#000', border: 'none', borderRadius: '10px', fontWeight: 'bold', cursor: 'pointer' }}>
                    <Plus size={18} />
                  </button>
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                  {data.skills.map(skill => (
                    <div key={skill} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', background: 'rgba(203,161,83,0.1)', border: '1px solid rgba(203,161,83,0.2)', borderRadius: '20px', padding: '0.4rem 0.8rem 0.4rem 0.4rem' }}>
                      <button onClick={() => removeSkill(skill)} style={{ background: 'rgba(239,68,68,0.15)', border: 'none', color: '#ef4444', borderRadius: '50%', width: '20px', height: '20px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        ×
                      </button>
                      <span style={{ color: 'var(--primary)', fontSize: '0.9rem', fontWeight: '600' }}>{skill}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeSection === 'education' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                {data.education.map(edu => (
                  <div key={edu.id} style={{ background: 'rgba(255,255,255,0.03)', borderRadius: '14px', padding: '1.2rem', border: '1px solid rgba(255,255,255,0.06)' }}>
                    {[
                      { key: 'institution', label: 'اسم المؤسسة التعليمية' },
                      { key: 'degree', label: 'الدرجة العلمية / التخصص' },
                      { key: 'year', label: 'سنة التخرج' },
                    ].map(f => (
                      <div key={f.key} style={{ marginBottom: '0.75rem' }}>
                        <label style={labelStyle}>{f.label}</label>
                        <input type="text" value={(edu as any)[f.key]} onChange={e => setData(d => ({ ...d, education: d.education.map(ed => ed.id === edu.id ? { ...ed, [f.key]: e.target.value } : ed) }))} style={inputStyle} />
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            )}

            {activeSection === 'certificates' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {data.certificates.map(cert => (
                  <div key={cert.id} style={{ background: 'rgba(255,255,255,0.03)', borderRadius: '14px', padding: '1.2rem', border: '1px solid rgba(255,255,255,0.06)' }}>
                    {[
                      { key: 'name', label: 'اسم الشهادة' },
                      { key: 'issuer', label: 'الجهة المانحة' },
                      { key: 'year', label: 'سنة الحصول' },
                    ].map(f => (
                      <div key={f.key} style={{ marginBottom: '0.75rem' }}>
                        <label style={labelStyle}>{f.label}</label>
                        <input type="text" value={(cert as any)[f.key]} onChange={e => setData(d => ({ ...d, certificates: d.certificates.map(c => c.id === cert.id ? { ...c, [f.key]: e.target.value } : c) }))} style={inputStyle} />
                      </div>
                    ))}
                  </div>
                ))}
                <button
                  onClick={() => setData(d => ({ ...d, certificates: [...d.certificates, { id: Date.now(), name: '', issuer: '', year: '' }] }))}
                  style={{ width: '100%', padding: '0.8rem', background: 'rgba(255,255,255,0.04)', border: '1px dashed rgba(255,255,255,0.15)', borderRadius: '12px', color: 'rgba(255,255,255,0.6)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
                >
                  <Plus size={16} /> إضافة شهادة
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Right: Preview Panel */}
        <div style={{ background: '#0a0a0a', overflowY: 'auto', padding: '2rem', display: 'flex', justifyContent: 'center' }}>
          <motion.div
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            id="resume-preview"
            style={{
              width: '100%', maxWidth: '850px',
              minHeight: '1123px', // A4 Ratio approximate
              background: '#fff', color: '#1a1a1a',
              borderRadius: '0', overflow: 'hidden',
              boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
              direction: 'rtl', fontFamily: '"Segoe UI", system-ui, sans-serif',
              position: 'relative', display: 'flex'
            }}
          >
            {/* Top Slanted Background across both columns */}
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '280px', background: '#223450', clipPath: 'polygon(0 0, 100% 0, 100% 100%, 0 25%)', zIndex: 1 }} />

            {/* Right Column (Dark Blue) */}
            <div style={{ flex: '0 0 35%', background: '#223450', position: 'relative', zIndex: 2, padding: '3rem 2rem', color: '#fff', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              {/* Profile Image */}
              <div style={{ width: '180px', height: '180px', borderRadius: '50%', background: '#4a6080', border: '5px solid #84a2d4', marginBottom: '1.5rem', overflow: 'hidden', flexShrink: 0, marginTop: '2rem', zIndex: 3, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {data.personal.image ? (
                  <img src={data.personal.image} alt={data.personal.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  <User size={80} color="#fff" />
                )}
              </div>
              <h2 style={{ fontSize: '2rem', fontWeight: 'bold', marginBottom: '0.5rem', textAlign: 'center', lineHeight: 1.2 }}>{data.personal.name || 'اسمك الكامل'}</h2>
              <div style={{ fontSize: '1.1rem', color: '#b3c4dd', marginBottom: '3rem', textAlign: 'center' }}>{data.personal.title || 'المسمى الوظيفي'}</div>

              {/* Contact Info */}
              <div style={{ width: '100%', marginBottom: '3rem' }}>
                <h3 style={{ fontSize: '1.3rem', fontWeight: 'bold', borderBottom: '2px solid #fff', paddingBottom: '0.5rem', marginBottom: '1.5rem', textAlign: 'center' }}>معلومات الاتصال</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem', fontSize: '0.9rem', direction: 'ltr', textAlign: 'right' }}>
                  {data.personal.phone && <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '0.8rem' }}><span>{data.personal.phone}</span> <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: '#4a6080', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><span style={{ fontSize: '12px' }}>📞</span></div></div>}
                  {data.personal.email && <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '0.8rem' }}><span>{data.personal.email}</span> <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: '#4a6080', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><span style={{ fontSize: '12px' }}>✉</span></div></div>}
                  {data.personal.website && <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '0.8rem' }}><span>{data.personal.website}</span> <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: '#4a6080', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><span style={{ fontSize: '12px' }}>🌐</span></div></div>}
                  {data.personal.location && <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '0.8rem' }}><span style={{ direction: 'rtl' }}>{data.personal.location}</span> <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: '#4a6080', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><span style={{ fontSize: '12px' }}>📍</span></div></div>}
                </div>
              </div>

              {/* Skills */}
              {data.skills.length > 0 && (
                <div style={{ width: '100%' }}>
                  <h3 style={{ fontSize: '1.3rem', fontWeight: 'bold', borderBottom: '2px solid #fff', paddingBottom: '0.5rem', marginBottom: '1.5rem', textAlign: 'center' }}>المهارات الأساسية</h3>
                  <ul style={{ paddingRight: '1.2rem', margin: 0, display: 'flex', flexDirection: 'column', gap: '0.6rem', fontSize: '0.95rem' }}>
                    {data.skills.map(skill => <li key={skill}>{skill}</li>)}
                  </ul>
                </div>
              )}
            </div>

            {/* Left Column (White) */}
            <div style={{ flex: '0 0 65%', position: 'relative', zIndex: 2, padding: '280px 3rem 3rem 3rem' }}>
              {/* Summary */}
              {data.personal.summary && (
                <div style={{ marginBottom: '3rem', textAlign: 'center' }}>
                  <h3 style={{ fontSize: '1.6rem', fontWeight: 'bold', color: '#223450', marginBottom: '1rem' }}>الملخص الشخصي</h3>
                  <p style={{ color: '#333', lineHeight: 1.8, fontSize: '1.05rem', fontWeight: '600' }}>{data.personal.summary}</p>
                </div>
              )}

              {/* Experience */}
              {data.experience.length > 0 && (
                <div style={{ marginBottom: '3rem' }}>
                  <h3 style={{ fontSize: '1.6rem', fontWeight: 'bold', color: '#223450', marginBottom: '1.5rem', textAlign: 'center' }}>التاريخ المهني</h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                    {data.experience.map(exp => (
                      <div key={exp.id} style={{ display: 'flex', gap: '1.5rem', position: 'relative' }}>
                        <div style={{ flex: '0 0 110px', fontSize: '1rem', fontWeight: 'bold', color: '#223450', paddingTop: '0.2rem', textAlign: 'left' }}>
                          {exp.period}
                        </div>
                        <div style={{ width: '2px', background: '#d0d0d0', position: 'relative', flexShrink: 0 }}>
                          <div style={{ width: '14px', height: '14px', borderRadius: '50%', background: '#223450', position: 'absolute', top: '0.3rem', right: '-6px' }} />
                        </div>
                        <div style={{ flex: 1, paddingBottom: '1rem' }}>
                          <h4 style={{ fontSize: '1.3rem', fontWeight: 'bold', color: '#223450', margin: '0 0 0.3rem 0' }}>{exp.role || 'المسمى الوظيفي'}</h4>
                          <div style={{ fontSize: '1rem', color: '#666', marginBottom: '0.8rem', fontWeight: 'bold' }}>{exp.company || 'الشركة'}</div>
                          {exp.desc && (
                            <ul style={{ paddingRight: '1.2rem', margin: 0, color: '#444', lineHeight: 1.7, fontSize: '0.95rem', fontWeight: '600' }}>
                              {exp.desc.split('\n').filter(line => line.trim() !== '').map((line, idx) => <li key={idx}>{line}</li>)}
                            </ul>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Education */}
              {data.education.length > 0 && (
                <div style={{ marginBottom: '3rem' }}>
                  <h3 style={{ fontSize: '1.6rem', fontWeight: 'bold', color: '#223450', marginBottom: '1.5rem', textAlign: 'center' }}>التاريخ الأكاديمي</h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                    {data.education.map(edu => (
                      <div key={edu.id} style={{ display: 'flex', gap: '1.5rem', position: 'relative' }}>
                        <div style={{ flex: '0 0 110px', fontSize: '1rem', fontWeight: 'bold', color: '#223450', paddingTop: '0.2rem', textAlign: 'left' }}>
                          {edu.year}
                        </div>
                        <div style={{ width: '2px', background: '#d0d0d0', position: 'relative', flexShrink: 0 }}>
                          <div style={{ width: '14px', height: '14px', borderRadius: '50%', background: '#223450', position: 'absolute', top: '0.3rem', right: '-6px' }} />
                        </div>
                        <div style={{ flex: 1, paddingBottom: '1rem' }}>
                          <h4 style={{ fontSize: '1.3rem', fontWeight: 'bold', color: '#223450', margin: '0 0 0.3rem 0' }}>{edu.institution || 'المؤسسة'}</h4>
                          <div style={{ fontSize: '1rem', color: '#666', fontWeight: 'bold' }}>{edu.degree || 'الدرجة العلمية'}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Certificates */}
              {data.certificates.length > 0 && (
                <div>
                  <h3 style={{ fontSize: '1.6rem', fontWeight: 'bold', color: '#223450', marginBottom: '1.5rem', textAlign: 'center' }}>الشهادات</h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    {data.certificates.map(cert => (
                      <div key={cert.id} style={{ display: 'flex', gap: '1.5rem', position: 'relative' }}>
                        <div style={{ flex: '0 0 110px', fontSize: '1rem', fontWeight: 'bold', color: '#223450', paddingTop: '0.2rem', textAlign: 'left' }}>
                          {cert.year}
                        </div>
                        <div style={{ width: '2px', background: '#d0d0d0', position: 'relative', flexShrink: 0 }}>
                          <div style={{ width: '14px', height: '14px', borderRadius: '50%', background: '#223450', position: 'absolute', top: '0.3rem', right: '-6px' }} />
                        </div>
                        <div style={{ flex: 1, paddingBottom: '0.5rem' }}>
                          <h4 style={{ fontSize: '1.2rem', fontWeight: 'bold', color: '#223450', margin: '0 0 0.2rem 0' }}>{cert.name || 'اسم الشهادة'}</h4>
                          <div style={{ fontSize: '1rem', color: '#666', fontWeight: 'bold' }}>{cert.issuer || 'الجهة المانحة'}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        </div>
      </div>

      <style dangerouslySetInnerHTML={{__html: `
        @media print {
          body > *:not(#resume-preview) { display: none !important; }
          #resume-preview { box-shadow: none !important; border-radius: 0 !important; }
        }
      `}} />
    </div>
  );
}
