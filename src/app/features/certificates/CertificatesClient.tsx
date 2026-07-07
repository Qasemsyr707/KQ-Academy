'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Award, ChevronRight, Download, Share2, Search, ExternalLink, ShieldCheck } from 'lucide-react';
import Link from 'next/link';

interface CertProps {
  id: string;
  course: string;
  instructor: string;
  date: string;
  grade: string;
  image: string;
}

export default function CertificatesClient({ initialCerts }: { initialCerts: CertProps[] }) {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredCerts = initialCerts.filter(cert => 
    cert.course.toLowerCase().includes(searchQuery.toLowerCase()) || 
    cert.id.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleDownloadPdf = (certId: string) => {
    // Navigate to verify page with a print parameter which auto-triggers window.print()
    window.open(`/verify/${certId}?print=true`, '_blank');
  };

  const handleShare = async (certId: string) => {
    const url = `${window.location.origin}/verify/${certId}`;
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'شهادة تخرجي من منصة التعليم الإلكتروني السوري',
          url: url
        });
      } catch (err) {
        console.log('Share error:', err);
      }
    } else {
      navigator.clipboard.writeText(url);
      alert('تم نسخ الرابط!');
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: '#050505', color: '#fff', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      
      {/* Navbar */}
      <div style={{ padding: '1.5rem 2rem', background: '#111', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 50 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <Link href="/dashboard" style={{ color: 'rgba(255,255,255,0.5)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
            لوحة التحكم <ChevronRight size={16} />
          </Link>
          <div style={{ width: '40px', height: '40px', background: 'rgba(59, 130, 246, 0.1)', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Award size={24} color="#3b82f6" />
          </div>
          <h1 style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>شهاداتي</h1>
        </div>
        
        <div style={{ position: 'relative', width: '300px' }}>
          <Search size={18} style={{ position: 'absolute', right: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.4)' }} />
          <input 
            type="text" 
            placeholder="ابحث برقم الشهادة أو اسم الكورس..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ width: '100%', padding: '0.6rem 1rem 0.6rem 2.5rem', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '20px', color: '#fff', outline: 'none' }}
          />
        </div>
      </div>

      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '3rem 2rem' }}>
        
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '3rem' }}>
          <div>
            <h2 style={{ fontSize: '2rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>إنجازاتك الأكاديمية</h2>
            <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '1rem' }}>
              جميع الشهادات التي حصلت عليها موثقة ومحفوظة لتتمكن من إثبات خبراتك لجهات العمل.
            </p>
          </div>
          <Link href="/verify" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(255,255,255,0.05)', padding: '0.8rem 1.5rem', borderRadius: '12px', color: 'var(--primary)', textDecoration: 'none', fontWeight: 'bold' }}>
            <ShieldCheck size={18} /> مركز تحقق جهات العمل
          </Link>
        </div>

        {filteredCerts.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '5rem 0', color: 'rgba(255,255,255,0.4)' }}>
            <Award size={64} style={{ margin: '0 auto 1rem auto', opacity: 0.2 }} />
            <p>لا يوجد شهادات حتى الآن. أكمل مقرراتك للحصول عليها!</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: '2rem' }}>
            {filteredCerts.map((cert, index) => (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                key={cert.id}
                style={{ 
                  background: '#111', 
                  borderRadius: '24px', 
                  border: '1px solid rgba(255,255,255,0.05)',
                  overflow: 'hidden',
                  display: 'flex',
                  flexDirection: 'column'
                }}
              >
                <div style={{ height: '200px', width: '100%', position: 'relative', background: '#222' }}>
                  <img src={cert.image} alt="Certificate Background" style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: 0.5 }} />
                  <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, #111, transparent)' }} />
                  
                  <div style={{ position: 'absolute', bottom: '1rem', right: '1.5rem', left: '1.5rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                      <h3 style={{ fontSize: '1.25rem', fontWeight: 'bold', textShadow: '0 2px 4px rgba(0,0,0,0.5)' }}>{cert.course}</h3>
                      <Award size={28} color="var(--primary)" />
                    </div>
                  </div>
                </div>

                <div style={{ padding: '1.5rem', flex: 1, display: 'flex', flexDirection: 'column' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '2rem' }}>
                    <div>
                      <div style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.4)', marginBottom: '0.2rem' }}>رقم الاعتماد</div>
                      <div style={{ fontSize: '0.9rem', fontFamily: 'monospace', color: 'var(--primary)' }}>{cert.id}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.4)', marginBottom: '0.2rem' }}>تاريخ الإصدار</div>
                      <div style={{ fontSize: '0.9rem' }}>{cert.date}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.4)', marginBottom: '0.2rem' }}>المدرب المشرف</div>
                      <div style={{ fontSize: '0.9rem' }}>{cert.instructor}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.4)', marginBottom: '0.2rem' }}>التقدير العام</div>
                      <div style={{ fontSize: '0.9rem', color: '#22c55e', fontWeight: 'bold' }}>{cert.grade}</div>
                    </div>
                  </div>

                  <div style={{ marginTop: 'auto', display: 'flex', gap: '0.5rem' }}>
                    <button onClick={() => handleDownloadPdf(cert.id)} style={{ flex: 1, padding: '0.8rem', borderRadius: '12px', border: 'none', background: 'var(--primary)', color: '#000', fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                      <Download size={18} /> تحميل PDF
                    </button>
                    <button onClick={() => handleShare(cert.id)} style={{ width: '45px', padding: '0', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.05)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                      <Share2 size={18} />
                    </button>
                    <Link href={`/verify/${cert.id}`} style={{ width: '45px', padding: '0', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.05)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', textDecoration: 'none' }}>
                      <ExternalLink size={18} />
                    </Link>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
