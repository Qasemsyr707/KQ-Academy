'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Briefcase, MapPin, DollarSign, Clock, Building, Send, Search, CheckCircle } from 'lucide-react';
import Link from 'next/link';

const jobsData = [
  {
    id: 1,
    company: "Symphony Solutions",
    role: "مطور واجهات (React.js)",
    type: "دوام كامل - عن بعد",
    salary: "$800 - $1200",
    description: "نبحث عن مطور واجهات متحمس للانضمام لفريقنا للعمل على مشاريع عالمية. يشترط خبرة جيدة في React و Next.js.",
    requirements: ["React.js", "Next.js", "TypeScript", "Tailwind CSS"],
    tags: ["عن بعد", "مستوى متوسط"]
  },
  {
    id: 2,
    company: "TechHub Syria",
    role: "تدريب منتهي بالتوظيف (Backend)",
    type: "تدريب - حضوري (دمشق)",
    salary: "مكافأة شهرية",
    description: "برنامج تدريبي مكثف لمدة 3 أشهر في تطوير النظم الخلفية باستخدام Node.js و PostgreSQL، مع فرصة توظيف للمتميزين.",
    requirements: ["Node.js", "SQL", "أساسيات البرمجة", "شغف التعلم"],
    tags: ["تدريب", "مبتدئ", "دمشق"]
  },
  {
    id: 3,
    company: "Qube Studios",
    role: "مصمم واجهات وتجربة مستخدم (UI/UX)",
    type: "دوام جزئي",
    salary: "$400 - $600",
    description: "مطلوب مصمم مبدع للعمل معنا بدوام جزئي لتصميم واجهات تطبيقات هواتف ذكية ومواقع ويب.",
    requirements: ["Figma", "Adobe XD", "معرفة بأساسيات UX"],
    tags: ["دوام جزئي", "تصميم"]
  }
];

export default function JobsMarketPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [appliedJobs, setAppliedJobs] = useState<number[]>([]);
  const [selectedJobId, setSelectedJobId] = useState<number | null>(null);

  const filteredJobs = jobsData.filter(job => 
    job.role.includes(searchTerm) || 
    job.company.includes(searchTerm) || 
    job.tags.some(tag => tag.includes(searchTerm))
  );

  const handleApply = (id: number) => {
    if (!appliedJobs.includes(id)) {
      setAppliedJobs([...appliedJobs, id]);
      setSelectedJobId(id);
      setTimeout(() => setSelectedJobId(null), 3000);
    }
  };

  return (
    <div style={{ minHeight: '100vh', padding: '6rem 2rem 2rem', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      
      {/* Header Section */}
      <div style={{ width: '100%', maxWidth: '1000px', marginBottom: '3rem', textAlign: 'center' }}>
        <h1 style={{ fontSize: '3rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '1rem', color: '#fff', marginBottom: '1rem' }}>
          <Briefcase color="var(--primary)" size={40} /> سوق العمل والتدريب
        </h1>
        <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '1.2rem', maxWidth: '600px', margin: '0 auto' }}>
          فرص حصرية لطلاب وخريجي منصة KQ Academy. تواصل مع أفضل الشركات وابدأ مسيرتك المهنية بثقة.
        </p>
      </div>

      {/* Search Bar */}
      <div style={{ width: '100%', maxWidth: '1000px', marginBottom: '3rem' }}>
        <div style={{ 
          display: 'flex', alignItems: 'center', background: 'rgba(255,255,255,0.05)', 
          border: '1px solid rgba(255,255,255,0.1)', borderRadius: '16px', padding: '0.5rem 1rem' 
        }}>
          <Search color="rgba(255,255,255,0.4)" />
          <input 
            type="text" 
            placeholder="ابحث عن وظيفة، شركة، أو مهارة (مثال: React, دمشق, عن بعد)..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ 
              background: 'transparent', border: 'none', color: '#fff', width: '100%', 
              padding: '1rem', fontSize: '1.1rem', outline: 'none'
            }}
          />
        </div>
      </div>

      {/* Jobs List */}
      <div style={{ width: '100%', maxWidth: '1000px', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        {filteredJobs.length === 0 ? (
          <div style={{ textAlign: 'center', color: 'rgba(255,255,255,0.5)', padding: '4rem 0' }}>
            <Briefcase size={48} style={{ margin: '0 auto 1rem auto', opacity: 0.3 }} />
            <p>لا توجد نتائج مطابقة للبحث.</p>
          </div>
        ) : (
          filteredJobs.map((job) => (
            <motion.div 
              key={job.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="glass-card"
              style={{ padding: '2rem', borderRadius: '20px', borderLeft: '4px solid var(--primary)', display: 'flex', flexDirection: 'column', gap: '1rem' }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
                <div>
                  <h2 style={{ fontSize: '1.5rem', color: '#fff', marginBottom: '0.5rem' }}>{job.role}</h2>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--primary)', fontWeight: 'bold' }}>
                    <Building size={16} /> {job.company}
                  </div>
                </div>
                
                {/* Apply Button Logic */}
                {appliedJobs.includes(job.id) ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--success)', fontWeight: 'bold', padding: '0.6rem 1.5rem', background: 'rgba(16,185,129,0.1)', borderRadius: '12px' }}>
                    <CheckCircle size={20} /> تم التقديم
                  </div>
                ) : (
                  <button 
                    onClick={() => handleApply(job.id)}
                    className="btn btn-solid" 
                    style={{ padding: '0.6rem 2rem', fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                  >
                    <Send size={18} /> قدم الآن
                  </button>
                )}
              </div>

              <div style={{ display: 'flex', gap: '1.5rem', color: 'rgba(255,255,255,0.6)', fontSize: '0.9rem', flexWrap: 'wrap' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}><MapPin size={16} /> {job.type}</span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}><DollarSign size={16} /> {job.salary}</span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}><Clock size={16} /> منذ يومين</span>
              </div>

              <p style={{ color: 'rgba(255,255,255,0.8)', lineHeight: 1.6 }}>{job.description}</p>

              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginTop: '0.5rem' }}>
                {job.requirements.map(req => (
                  <span key={req} style={{ background: 'rgba(255,255,255,0.1)', padding: '0.3rem 0.8rem', borderRadius: '20px', fontSize: '0.85rem', color: '#fff' }}>
                    {req}
                  </span>
                ))}
                {job.tags.map(tag => (
                  <span key={tag} style={{ background: 'rgba(203,161,83,0.15)', color: 'var(--primary)', padding: '0.3rem 0.8rem', borderRadius: '20px', fontSize: '0.85rem' }}>
                    {tag}
                  </span>
                ))}
              </div>
            </motion.div>
          ))
        )}
      </div>

      {/* Success Application Overlay */}
      <AnimatePresence>
        {selectedJobId && (
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -50 }}
            style={{
              position: 'fixed', bottom: '2rem', left: '50%', transform: 'translateX(-50%)',
              background: 'var(--success)', color: '#fff', padding: '1rem 2rem', borderRadius: '12px',
              display: 'flex', alignItems: 'center', gap: '1rem', fontWeight: 'bold', boxShadow: '0 10px 30px rgba(16,185,129,0.3)',
              zIndex: 100
            }}
          >
            <CheckCircle size={24} /> تم إرسال سيرتك الذاتية بنجاح!
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
