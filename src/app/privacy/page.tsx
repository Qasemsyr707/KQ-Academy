export default function PrivacyPage() {
  return (
    <div style={{ minHeight: '100vh', background: '#050505', color: '#fff', padding: '4rem 2rem' }}>
      <div style={{ maxWidth: '800px', margin: '0 auto', background: 'rgba(15,15,15,0.8)', padding: '3rem', borderRadius: '24px', border: '1px solid rgba(255,255,255,0.05)' }}>
        <h1 style={{ fontSize: '2.5rem', fontWeight: 900, marginBottom: '2rem', color: 'var(--primary)', textAlign: 'center' }}>سياسة الخصوصية</h1>
        
        <div style={{ lineHeight: '1.8', fontSize: '1rem', color: 'rgba(255,255,255,0.85)' }}>
          <p>في أكاديمية KQ، نأخذ خصوصية مستخدمينا على محمل الجد. توضح هذه السياسة كيف نقوم بجمع واستخدام وحماية معلوماتك الشخصية.</p>
          
          <h3 style={{ color: '#fff', marginTop: '2rem', marginBottom: '1rem' }}>1. المعلومات التي نجمعها</h3>
          <p>نقوم بجمع المعلومات التي تقدمها لنا مباشرة عند التسجيل (مثل الاسم، البريد الإلكتروني، رقم الهاتف) بالإضافة إلى بيانات تفاعلك مع المنصة (التقدم في الدورات، الدرجات، استخدام الميزات المتقدمة كالمختبرات والذكاء الاصطناعي).</p>

          <h3 style={{ color: '#fff', marginTop: '2rem', marginBottom: '1rem' }}>2. كيف نستخدم معلوماتك؟</h3>
          <ul style={{ paddingRight: '1.5rem', marginBottom: '1.5rem' }}>
            <li>لتخصيص وتجربة تعليمية أفضل من خلال الذكاء الاصطناعي.</li>
            <li>لإصدار الشهادات وتوثيق التقدم.</li>
            <li>للتواصل معك بخصوص أي تحديثات أو إعلانات هامة.</li>
          </ul>

          <h3 style={{ color: '#fff', marginTop: '2rem', marginBottom: '1rem' }}>3. أمان البيانات</h3>
          <p>نحن نستخدم بروتوكولات أمان متقدمة لحماية بياناتك من الوصول غير المصرح به. معلومات الدفع والمحفظة تخضع لأعلى معايير التشفير.</p>

          <h3 style={{ color: '#fff', marginTop: '2rem', marginBottom: '1rem' }}>4. مشاركة البيانات</h3>
          <p>لا نقوم ببيع أو تأجير معلوماتك الشخصية لأي أطراف ثالثة. قد نشارك بعض البيانات مع شركات التوظيف فقط إذا أعطيتنا موافقة صريحة على ذلك من خلال "بوابة الوظائف" المتاحة في المنصة.</p>
        </div>
      </div>
    </div>
  );
}
