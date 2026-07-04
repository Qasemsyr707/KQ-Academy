'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Briefcase, MapPin, DollarSign, Clock, Search, Filter, ChevronRight, Building2, CheckCircle2 } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';

const mockJobs = [
  {
    id: 1,
    title: 'مطور واجهات أمامية (React)',
    company: 'سيريتل (Syriatel)',
    type: 'دوام كامل',
    location: 'دمشق، سوريا (أو عن بُعد)',
    salary: '5,000,000 - 8,000,000 ل.س',
    posted: 'قبل يومين',
    tags: ['React', 'Next.js', 'TypeScript'],
    logo: 'https://images.unsplash.com/photo-1611162617474-5b21e879e113?w=100&h=100&fit=crop'
  },
  {
    id: 2,
    title: 'متدرب تسويق رقمي',
    company: 'MTN Syria',
    type: 'تدريب (Internship)',
    location: 'دمشق، سوريا',
    salary: 'مكافأة شهرية',
    posted: 'قبل 5 ساعات',
    tags: ['SEO', 'Social Media', 'Content Creation'],
    logo: 'https://images.unsplash.com/photo-1611162616305-c69b3fa7fbe0?w=100&h=100&fit=crop'
  },
  {
    id: 3,
    title: 'مدرس فيزياء (مرحلة ثانوية)',
    company: 'مدرسة الأوائل الخاصة',
    type: 'دوام جزئي',
    location: 'حلب، سوريا',
    salary: 'يحدد بعد المقابلة',
    posted: 'قبل أسبوع',
    tags: ['فيزياء', 'تدريس', 'تواصل'],
    logo: 'https://images.unsplash.com/photo-1546410531-bd4cb01b524b?w=100&h=100&fit=crop'
  }
];

export default function JobsPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [appliedJobs, setAppliedJobs] = useState<number[]>([]);

  const filteredJobs = mockJobs.filter(job => 
    job.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
    job.company.toLowerCase().includes(searchQuery.toLowerCase()) ||
    job.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const handleApply = (id: number) => {
    setAppliedJobs(prev => [...prev, id]);
  };

  return (
    <div style={{ minHeight: '100vh', background: '#050505', color: '#fff', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      
      {/* Navbar */}
      <div style={{ padding: '1.5rem 2rem', background: '#111', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 50 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <Link href="/dashboard" style={{ color: 'rgba(255,255,255,0.5)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
            لوحة التحكم <ChevronRight size={16} />
          </Link>
          <div style={{ width: '40px', height: '40px', background: 'rgba(124, 58, 237, 0.1)', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Briefcase size={24} color="#7c3aed" />
          </div>
          <h1 style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>سوق العمل والتدريب</h1>
        </div>
      </div>

      <div style={{ maxWidth: '1000px', margin: '0 auto', padding: '3rem 2rem' }}>
        
        {/* Search & Filter Header */}
        <div style={{ background: 'linear-gradient(135deg, rgba(124, 58, 237, 0.1), rgba(124, 58, 237, 0.02))', padding: '3rem', borderRadius: '24px', border: '1px solid rgba(124, 58, 237, 0.2)', marginBottom: '3rem', textAlign: 'center' }}>
          <h2 style={{ fontSize: '2.5rem', fontWeight: 'bold', marginBottom: '1rem' }}>ابدأ مسيرتك المهنية الآن</h2>
          <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '1.1rem', marginBottom: '2rem', maxWidth: '600px', margin: '0 auto 2rem auto' }}>
            نوصلك بأفضل الشركات والمؤسسات لتبدأ رحلتك سواء كمتدرب أو كموظف بدوام كامل.
          </p>
          
          <div style={{ display: 'flex', gap: '1rem', maxWidth: '700px', margin: '0 auto' }}>
            <div style={{ position: 'relative', flex: 1 }}>
              <Search size={20} style={{ position: 'absolute', right: '1.2rem', top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.4)' }} />
              <input 
                type="text" 
                placeholder="ابحث عن مسمى وظيفي، مهارة، أو شركة..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{ width: '100%', padding: '1rem 1rem 1rem 3rem', background: '#111', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '16px', color: '#fff', outline: 'none', fontSize: '1rem' }}
              />
            </div>
            <button style={{ background: '#111', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '16px', padding: '0 1.5rem', color: '#fff', display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
              <Filter size={20} /> تصفية
            </button>
          </div>
        </div>

        {/* Jobs List */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
            <h3 style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>أحدث الفرص المتاحة</h3>
            <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.9rem' }}>{filteredJobs.length} وظيفة</span>
          </div>

          {filteredJobs.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '4rem 0', color: 'rgba(255,255,255,0.4)' }}>
              <Briefcase size={48} style={{ margin: '0 auto 1rem auto', opacity: 0.2 }} />
              <p>لا يوجد وظائف تطابق بحثك حالياً.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {filteredJobs.map((job, index) => {
                const isApplied = appliedJobs.includes(job.id);
                
                return (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                    key={job.id}
                    style={{ 
                      background: '#111', 
                      borderRadius: '20px', 
                      border: '1px solid rgba(255,255,255,0.05)',
                      padding: '1.5rem',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '1.5rem'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div style={{ display: 'flex', gap: '1.5rem' }}>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={job.logo} alt={job.company} style={{ width: '64px', height: '64px', borderRadius: '12px', objectFit: 'cover' }} />
                        <div>
                          <h4 style={{ fontSize: '1.3rem', fontWeight: 'bold', marginBottom: '0.3rem' }}>{job.title}</h4>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'rgba(255,255,255,0.6)', fontSize: '0.95rem' }}>
                            <Building2 size={16} /> {job.company}
                          </div>
                        </div>
                      </div>
                      
                      <button 
                        onClick={() => !isApplied && handleApply(job.id)}
                        disabled={isApplied}
                        style={{
                          background: isApplied ? 'rgba(34, 197, 94, 0.1)' : 'var(--primary)',
                          color: isApplied ? '#22c55e' : '#000',
                          border: isApplied ? '1px solid rgba(34, 197, 94, 0.3)' : 'none',
                          padding: '0.8rem 2rem',
                          borderRadius: '12px',
                          fontWeight: 'bold',
                          cursor: isApplied ? 'default' : 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.5rem',
                          transition: 'all 0.2s'
                        }}
                      >
                        {isApplied ? (
                          <>تم التقديم <CheckCircle2 size={18} /></>
                        ) : (
                          'تقديم سريع'
                        )}
                      </button>
                    </div>

                    <div style={{ display: 'flex', gap: '2rem', color: 'rgba(255,255,255,0.7)', fontSize: '0.9rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        <MapPin size={16} /> {job.location}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        <Briefcase size={16} /> {job.type}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        <DollarSign size={16} /> {job.salary}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginRight: 'auto' }}>
                        <Clock size={16} /> {job.posted}
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                      {job.tags.map((tag, idx) => (
                        <span key={idx} style={{ background: 'rgba(255,255,255,0.05)', padding: '0.3rem 0.8rem', borderRadius: '8px', fontSize: '0.85rem', color: 'rgba(255,255,255,0.8)' }}>
                          {tag}
                        </span>
                      ))}
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
