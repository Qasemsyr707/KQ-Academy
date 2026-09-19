export default function RefundPage() {
  return (
    <div style={{ minHeight: '100vh', background: '#050505', color: '#fff', padding: '4rem 2rem' }}>
      <div style={{ maxWidth: '800px', margin: '0 auto', background: 'rgba(15,15,15,0.8)', padding: '3rem', borderRadius: '24px', border: '1px solid rgba(255,255,255,0.05)' }}>
        <h1 style={{ fontSize: '2.5rem', fontWeight: 900, marginBottom: '2rem', color: 'var(--primary)', textAlign: 'center' }}>سياسة الاسترجاع</h1>
        
        <div style={{ lineHeight: '1.8', fontSize: '1rem', color: 'rgba(255,255,255,0.85)' }}>
          <p>نحن في أكاديمية KQ نحرص على تقديم أفضل جودة للتعليم والمحتوى. إذا لم تكن راضياً عن عملية الشراء، فإننا نوفر سياسة استرجاع واضحة وعادلة.</p>
          
          <h3 style={{ color: '#fff', marginTop: '2rem', marginBottom: '1rem' }}>1. شروط استرجاع الأموال</h3>
          <ul style={{ paddingRight: '1.5rem', marginBottom: '1.5rem' }}>
            <li>يمكنك طلب استرداد المبلغ خلال <strong>7 أيام</strong> من تاريخ شراء الدورة.</li>
            <li>يُشترط ألا تكون قد شاهدت أو أتممت أكثر من <strong>20%</strong> من محتوى الدورة.</li>
            <li>لا يمكن استرداد مبالغ الاشتراكات الشهرية أو مبالغ المحفظة المستخدمة مسبقاً.</li>
          </ul>

          <h3 style={{ color: '#fff', marginTop: '2rem', marginBottom: '1rem' }}>2. آلية طلب الاسترجاع</h3>
          <p>لتقديم طلب استرجاع، يرجى مراسلة الدعم الفني عبر صفحة "تواصل معنا" أو عبر الواتساب مع تقديم رقم الطلب واسم الدورة والسبب. سيتم مراجعة طلبك والرد عليه خلال 48 ساعة عمل.</p>

          <h3 style={{ color: '#fff', marginTop: '2rem', marginBottom: '1rem' }}>3. الرصيد والمحفظة</h3>
          <p>في حال الموافقة على الاسترجاع، سيتم إعادة المبلغ إلى محفظتك في الأكاديمية أو إلى وسيلة الدفع الأصلية حسب ما يراه الدعم الفني مناسباً والمتاح تقنياً.</p>
        </div>
      </div>
    </div>
  );
}
