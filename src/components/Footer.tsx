'use client';

import Link from 'next/link';
import { Globe } from 'lucide-react';

export default function Footer() {
  const footerLinks = [
    {
      title: 'تطوير الويب والبرمجيات',
      links: [
        { label: 'تطوير الويب (Front-end)', href: '/courses?q=web' },
        { label: 'تطبيقات الموبايل (React Native)', href: '/courses?q=mobile' },
        { label: 'برمجة بايثون (Python)', href: '/courses?q=python' },
        { label: 'تطوير الواجهات الخلفية', href: '/courses?q=backend' },
        { label: 'أساسيات البرمجة للمبتدئين', href: '/courses?q=programming' },
      ],
    },
    {
      title: 'شهادات وتكنولوجيا',
      links: [
        { label: 'الذكاء الاصطناعي و ChatGPT', href: '/courses?q=ai' },
        { label: 'علم البيانات (Data Science)', href: '/courses?q=data' },
        { label: 'الأمن السيبراني', href: '/courses?q=cyber' },
        { label: 'الحوسبة السحابية (AWS)', href: '/courses?q=cloud' },
      ],
    },
    {
      title: 'لغات وتطوير الذات',
      links: [
        { label: 'اللغة الإنجليزية الشاملة', href: '/courses?q=english' },
        { label: 'التسويق الرقمي (Digital Marketing)', href: '/courses?q=marketing' },
        { label: 'ريادة الأعمال والمشاريع', href: '/courses?q=business' },
        { label: 'مهارات التواصل والإلقاء', href: '/courses?q=communication' },
      ],
    },
    {
      title: 'المناهج الدراسية السورية',
      links: [
        { label: 'البكالوريا - الفرع العلمي', href: '/curriculum?grade=12-science' },
        { label: 'البكالوريا - الفرع الأدبي', href: '/curriculum?grade=12-literary' },
        { label: 'شهادة التعليم الأساسي (التاسع)', href: '/curriculum?grade=9' },
        { label: 'نماذج امتحانية ومكثفات', href: '/curriculum?type=exams' },
      ],
    },
    {
      title: 'KQ Academy',
      links: [
        { label: 'من نحن', href: '/about' },
        { label: 'تواصل معنا', href: '/contact' },
        { label: 'الأسئلة الشائعة', href: '/faq' },
        { label: 'المدونة', href: '/blog' },
        { label: 'انضم كمدرب', href: '/teach' },
      ],
    },
    {
      title: 'الشروط والسياسات',
      links: [
        { label: 'شروط الاستخدام', href: '/terms' },
        { label: 'سياسة الخصوصية', href: '/privacy' },
        { label: 'سياسة الاسترجاع', href: '/refund' },
        { label: 'خريطة الموقع', href: '/sitemap' },
      ],
    },
  ];

  return (
    <footer style={{ background: '#1c1d1f', color: '#fff', paddingTop: '4rem', paddingBottom: '2rem', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
      <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '0 2rem' }}>
        
        {/* Top Banner */}
        <div style={{ 
          display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '2rem',
          borderBottom: '1px solid #3e4143', paddingBottom: '2rem', marginBottom: '3rem' 
        }}>
          <div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '0.5rem', color: '#fff' }}>
              تختار الشركات الكبرى KQ Academy لتطوير مهارات موظفيها.
            </h2>
          </div>
          <div style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap', opacity: 0.8, alignItems: 'center' }}>
            <img src="https://upload.wikimedia.org/wikipedia/commons/a/a9/Amazon_logo.svg" alt="Amazon" style={{ height: '24px', filter: 'brightness(0) invert(1)' }} />
            <img src="https://upload.wikimedia.org/wikipedia/commons/2/2f/Google_2015_logo.svg" alt="Google" style={{ height: '24px', filter: 'brightness(0) invert(1)' }} />
            <img src="https://upload.wikimedia.org/wikipedia/commons/4/44/Microsoft_logo.svg" alt="Microsoft" style={{ height: '24px', filter: 'brightness(0) invert(1)' }} />
            <img src="https://upload.wikimedia.org/wikipedia/commons/b/b1/Samsung_Lettermark.svg" alt="Samsung" style={{ height: '16px', filter: 'brightness(0) invert(1)' }} />
          </div>
        </div>

        {/* Links Grid */}
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
          gap: '2rem 1.5rem',
          marginBottom: '4rem' 
        }}>
          {footerLinks.map((section, index) => (
            <div key={index}>
              <h3 style={{ fontSize: '1.05rem', fontWeight: 700, marginBottom: '1.25rem', color: '#fff' }}>
                {section.title}
              </h3>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {section.links.map((link, linkIndex) => (
                  <li key={linkIndex}>
                    <Link href={link.href} style={{ 
                      color: '#a1a1aa', 
                      textDecoration: 'none', 
                      fontSize: '0.9rem',
                      transition: 'color 0.2s',
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.color = 'var(--primary)'}
                    onMouseLeave={(e) => e.currentTarget.style.color = '#a1a1aa'}
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom Section */}
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '2rem',
          borderTop: '1px solid #3e4143',
          paddingTop: '2rem'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
            <Link href="/">
              <img src="/logo.png" alt="KQ Academy" style={{ height: '40px', width: 'auto', filter: 'drop-shadow(0 0 10px rgba(203,161,83,0.3))' }} />
            </Link>
            <span style={{ color: '#a1a1aa', fontSize: '0.9rem' }}>
              © {new Date().getFullYear()} KQ Academy. جميع الحقوق محفوظة.
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
            <button style={{ 
              display: 'flex', alignItems: 'center', gap: '0.5rem', 
              background: 'transparent', border: '1px solid #a1a1aa', color: '#fff', 
              padding: '0.5rem 1rem', borderRadius: '4px', cursor: 'pointer',
              fontSize: '0.9rem'
            }}>
              <Globe size={16} /> العربية
            </button>
            <div style={{ display: 'flex', gap: '1rem' }}>
              <a href="#" style={{ color: '#a1a1aa', textDecoration: 'none', fontSize: '0.9rem' }}>فيسبوك</a>
              <a href="#" style={{ color: '#a1a1aa', textDecoration: 'none', fontSize: '0.9rem' }}>تويتر</a>
              <a href="#" style={{ color: '#a1a1aa', textDecoration: 'none', fontSize: '0.9rem' }}>انستغرام</a>
              <a href="#" style={{ color: '#a1a1aa', textDecoration: 'none', fontSize: '0.9rem' }}>يوتيوب</a>
            </div>
          </div>
        </div>

      </div>
    </footer>
  );
}
