'use client';

import Link from 'next/link';

export default function CurriculumPage() {
  return (
    <div className="container" style={{ paddingTop: '4rem', paddingBottom: '4rem' }}>
      <div style={{ textAlign: 'center', marginBottom: '4rem' }}>
        <h1 style={{ fontSize: '3rem', fontWeight: 'bold', marginBottom: '1rem' }}>المنهاج الدراسي</h1>
        <p style={{ opacity: 0.7, maxWidth: '600px', margin: '0 auto', fontSize: '1.1rem', lineHeight: 1.6 }}>
          استكشف المسارات التعليمية المعتمدة في K&Q Academy. كل مسار مصمم بعناية ليأخذك من الأساسيات وحتى مستوى الاحتراف لتكون جاهزاً لسوق العمل.
        </p>
      </div>
      
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem' }}>
        {/* مسار هندسة البرمجيات */}
        <div className="glass-card" style={{ padding: '2.5rem', borderRadius: '24px', borderTop: '4px solid var(--primary)', display: 'flex', flexDirection: 'column' }}>
          <h3 style={{ fontSize: '1.8rem', marginBottom: '1rem', color: 'var(--primary)' }}>مسار هندسة البرمجيات</h3>
          <p style={{ opacity: 0.8, marginBottom: '2rem', lineHeight: 1.6, flex: 1 }}>
            يغطي هذا المسار لغات البرمجة الحديثة (React, Next.js, Node.js) من الصفر وحتى الاحتراف. يتضمن مشاريع عملية واقعية وأساسيات علوم الحاسوب والخوارزميات.
          </p>
          <ul style={{ listStyle: 'none', padding: 0, marginBottom: '2rem', display: 'flex', flexDirection: 'column', gap: '0.8rem', opacity: 0.9 }}>
            <li>✅ أساسيات البرمجة والهيكلة</li>
            <li>✅ تطوير واجهات المستخدم (Frontend)</li>
            <li>✅ تطوير الخوادم وقواعد البيانات (Backend)</li>
            <li>✅ النشر وأساسيات الـ DevOps</li>
          </ul>
          <Link href="/courses" className="btn btn-solid" style={{ textAlign: 'center', padding: '1rem', fontSize: '1.1rem', width: '100%' }}>الالتحاق بالمسار</Link>
        </div>

        {/* مسار الذكاء الاصطناعي */}
        <div className="glass-card" style={{ padding: '2.5rem', borderRadius: '24px', borderTop: '4px solid #a855f7', display: 'flex', flexDirection: 'column' }}>
          <h3 style={{ fontSize: '1.8rem', marginBottom: '1rem', color: '#a855f7' }}>مسار الذكاء الاصطناعي</h3>
          <p style={{ opacity: 0.8, marginBottom: '2rem', lineHeight: 1.6, flex: 1 }}>
            تعلم بناء نماذج التعلم الآلي والشبكات العصبية باستخدام بايثون وتكامل أدوات الذكاء الاصطناعي التوليدي في تطبيقاتك.
          </p>
          <ul style={{ listStyle: 'none', padding: 0, marginBottom: '2rem', display: 'flex', flexDirection: 'column', gap: '0.8rem', opacity: 0.9 }}>
            <li>✅ تحليل البيانات (Data Science)</li>
            <li>✅ تعلم الآلة (Machine Learning)</li>
            <li>✅ التعلم العميق (Deep Learning)</li>
            <li>✅ هندسة الـ Prompts ودمج النماذج</li>
          </ul>
          <Link href="/courses" className="btn btn-solid" style={{ textAlign: 'center', padding: '1rem', fontSize: '1.1rem', width: '100%', background: '#a855f7' }}>الالتحاق بالمسار</Link>
        </div>

        {/* مسار العلوم المتقدمة */}
        <div className="glass-card" style={{ padding: '2.5rem', borderRadius: '24px', borderTop: '4px solid #3b82f6', display: 'flex', flexDirection: 'column' }}>
          <h3 style={{ fontSize: '1.8rem', marginBottom: '1rem', color: '#3b82f6' }}>العلوم والرياضيات</h3>
          <p style={{ opacity: 0.8, marginBottom: '2rem', lineHeight: 1.6, flex: 1 }}>
            مناهج متقدمة في الرياضيات والفيزياء تعتمد على مختبرات الواقع المعزز (AR) والتجارب التفاعلية لفهم أعمق للقوانين الكونية.
          </p>
          <ul style={{ listStyle: 'none', padding: 0, marginBottom: '2rem', display: 'flex', flexDirection: 'column', gap: '0.8rem', opacity: 0.9 }}>
            <li>✅ الجبر الخطي والتفاضل</li>
            <li>✅ الفيزياء الكلاسيكية والكمية</li>
            <li>✅ مختبرات الواقع المعزز 3D</li>
            <li>✅ تطبيقات العلوم في التكنولوجيا</li>
          </ul>
          <Link href="/courses" className="btn btn-solid" style={{ textAlign: 'center', padding: '1rem', fontSize: '1.1rem', width: '100%', background: '#3b82f6' }}>الالتحاق بالمسار</Link>
        </div>
      </div>
    </div>
  );
}
