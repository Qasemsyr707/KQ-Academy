export default function TermsPage() {
  return (
    <div style={{ minHeight: '100vh', background: '#050505', color: '#fff', padding: '4rem 2rem' }}>
      <div style={{ maxWidth: '800px', margin: '0 auto', background: 'rgba(15,15,15,0.8)', padding: '3rem', borderRadius: '24px', border: '1px solid rgba(255,255,255,0.05)' }}>
        <h1 style={{ fontSize: '2.5rem', fontWeight: 900, marginBottom: '2rem', color: 'var(--primary)', textAlign: 'center' }}>شروط الاستخدام</h1>
        
        <div style={{ lineHeight: '1.8', fontSize: '1rem', color: 'rgba(255,255,255,0.85)' }}>
          <p>مرحباً بك في أكاديمية KQ. يرجى قراءة شروط الاستخدام بعناية قبل البدء في استخدام المنصة.</p>
          
          <h3 style={{ color: '#fff', marginTop: '2rem', marginBottom: '1rem' }}>1. القبول بالشروط</h3>
          <p>بمجرد تسجيلك في المنصة أو استخدامك لأي من خدماتنا، فإنك توافق التام على الالتزام بهذه الشروط والأحكام.</p>

          <h3 style={{ color: '#fff', marginTop: '2rem', marginBottom: '1rem' }}>2. حساب المستخدم</h3>
          <ul style={{ paddingRight: '1.5rem', marginBottom: '1.5rem' }}>
            <li>أنت مسؤول عن الحفاظ على سرية معلومات حسابك وكلمة المرور.</li>
            <li>يُمنع مشاركة حسابك مع أشخاص آخرين. سيؤدي هذا إلى إيقاف الحساب دون سابق إنذار.</li>
          </ul>

          <h3 style={{ color: '#fff', marginTop: '2rem', marginBottom: '1rem' }}>3. حقوق الملكية الفكرية</h3>
          <p>جميع المحتويات المتوفرة على منصة KQ Academy من فيديوهات، نصوص، ملفات، ومقالات هي ملكية حصرية للأكاديمية ومحفوظة بموجب حقوق الطبع والنشر. يُمنع منعاً باتاً تحميل أو إعادة توزيع أي محتوى خارج إطار المنصة.</p>

          <h3 style={{ color: '#fff', marginTop: '2rem', marginBottom: '1rem' }}>4. التعديلات</h3>
          <p>نحتفظ بالحق في تعديل أو تحديث هذه الشروط في أي وقت. استمرارك في استخدام المنصة بعد أي تغييرات يعتبر قبولاً منك لتلك التغييرات.</p>
        </div>
      </div>
    </div>
  );
}
