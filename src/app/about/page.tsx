import Link from 'next/link';

export default function AboutPage() {
  return (
    <div style={{ minHeight: '100vh', background: '#050505', color: '#fff', padding: 'clamp(2rem, 5vw, 4rem) clamp(1rem, 3vw, 2rem)' }}>
      <div style={{ maxWidth: '800px', margin: '0 auto', background: 'rgba(15,15,15,0.8)', padding: 'clamp(1.5rem, 5vw, 3rem)', borderRadius: '24px', border: '1px solid rgba(255,255,255,0.05)' }}>
        <h1 style={{ fontSize: '2.5rem', fontWeight: 900, marginBottom: '2rem', color: 'var(--primary)', textAlign: 'center' }}>من نحن</h1>
        
        <div style={{ lineHeight: '1.8', fontSize: '1.1rem', color: 'rgba(255,255,255,0.85)' }}>
          <p style={{ marginBottom: '1.5rem' }}>
            <strong>أكاديمية KQ (KQ Academy)</strong> هي منصة تعليمية ذكية رائدة مقرها في سوريا - دمشق. نحن نؤمن بأن التعليم هو المفتاح الأساسي لبناء مستقبل مشرق، ولذلك صممنا منصتنا لتكون الجسر الذي يربط بين الشغف للتعلم والفرص المهنية الحقيقية.
          </p>
          
          <h2 style={{ color: '#fff', fontSize: '1.5rem', marginTop: '2rem', marginBottom: '1rem' }}>رؤيتنا</h2>
          <p style={{ marginBottom: '1.5rem' }}>
            نهدف في KQ Academy إلى توفير بيئة تعليمية تفاعلية واحترافية تلبي احتياجات سوق العمل المتطورة. نحن لا نقدم فقط دورات تدريبية ومناهج أكاديمية، بل نسعى لتطوير مهارات الطلاب والباحثين عن عمل لتمكينهم من التفوق في مسيرتهم المهنية.
          </p>

          <h2 style={{ color: '#fff', fontSize: '1.5rem', marginTop: '2rem', marginBottom: '1rem' }}>ماذا نقدم؟</h2>
          <ul style={{ paddingRight: '1.5rem', marginBottom: '1.5rem' }}>
            <li style={{ marginBottom: '0.5rem' }}><strong>دورات احترافية ومناهج:</strong> محتوى تعليمي تفاعلي يغطي مختلف المجالات من التكنولوجيا إلى إدارة الأعمال.</li>
            <li style={{ marginBottom: '0.5rem' }}><strong>ربط بسوق العمل:</strong> نعمل كجسر بين الخريجين والشركات لتوفير فرص عمل وتدريب حقيقية.</li>
            <li style={{ marginBottom: '0.5rem' }}><strong>تقنيات حديثة:</strong> نستخدم الذكاء الاصطناعي (AI Tutor) والبث المباشر والمختبرات الافتراضية لضمان تجربة تعليمية لا مثيل لها.</li>
          </ul>

          <p style={{ marginTop: '3rem', textAlign: 'center' }}>
            <Link href="/courses" style={{ display: 'inline-block', padding: '1rem 2rem', background: 'var(--primary)', color: '#000', fontWeight: 'bold', borderRadius: '50px', textDecoration: 'none', whiteSpace: 'nowrap' }}>
              تصفح دوراتنا الآن
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
