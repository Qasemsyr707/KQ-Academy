import { CheckCircle, XCircle, Award, Calendar, User, BookOpen, ShieldCheck } from 'lucide-react';
import Link from 'next/link';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

// Mock certificates for demo - real ones come from DB
const mockCerts: Record<string, { user: { name: string }, course: { title: string }, issuedAt: Date, grade: string }> = {
  'CERT-2026-8941': {
    user: { name: 'أحمد محمد العلي' },
    course: { title: 'تطوير تطبيقات الويب باستخدام React' },
    issuedAt: new Date('2026-06-15'),
    grade: 'امتياز (98%)'
  },
  'CERT-2026-7231': {
    user: { name: 'سارة خالد الأحمد' },
    course: { title: 'أساسيات الفيزياء التطبيقية' },
    issuedAt: new Date('2026-04-02'),
    grade: 'جيد جداً (85%)'
  },
};

export default async function VerifyCertificatePage({ params }: { params: { certId: string } }) {
  const { certId } = params;

  // Try DB first
  let certificate: any = null;
  try {
    certificate = await prisma.certificate.findUnique({
      where: { id: certId },
      include: { user: true, course: true }
    });
  } catch (e) {
    // DB might not have certificates table yet; fall through to mock
  }

  // Fallback to mock data for demo purposes
  const isMock = !certificate && mockCerts[certId];
  const cert = certificate || (isMock ? mockCerts[certId] : null);

  return (
    <div style={{
      minHeight: '100vh',
      background: '#050505',
      color: '#fff',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '2rem',
      fontFamily: 'system-ui, -apple-system, sans-serif'
    }}>
      <div style={{
        width: '100%', maxWidth: '620px',
        background: '#111',
        borderRadius: '28px',
        padding: '3rem',
        border: `1px solid ${cert ? 'rgba(34,197,94,0.2)' : 'rgba(239,68,68,0.15)'}`,
        boxShadow: cert ? '0 20px 60px rgba(34,197,94,0.08)' : '0 20px 60px rgba(239,68,68,0.06)',
        textAlign: 'center'
      }}>

        {cert ? (
          <>
            {/* Success */}
            <div style={{ width: '90px', height: '90px', background: 'rgba(34,197,94,0.1)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem auto', border: '1px solid rgba(34,197,94,0.25)', boxShadow: '0 0 40px rgba(34,197,94,0.15)' }}>
              <CheckCircle size={44} color="#22c55e" />
            </div>

            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.2)', borderRadius: '20px', padding: '0.4rem 1rem', marginBottom: '1rem' }}>
              <ShieldCheck size={14} color="#22c55e" />
              <span style={{ color: '#22c55e', fontSize: '0.85rem', fontWeight: '600' }}>تحقق ناجح</span>
            </div>

            <h1 style={{ fontSize: '2rem', fontWeight: 'bold', color: '#22c55e', marginBottom: '0.5rem' }}>شهادة موثّقة ورسمية ✓</h1>
            <p style={{ color: 'rgba(255,255,255,0.55)', marginBottom: '2.5rem', fontSize: '0.95rem', lineHeight: 1.6 }}>
              تم التحقق من صحة هذه الشهادة بنجاح من قاعدة بيانات أكاديمية K&Q.
            </p>

            {/* Certificate Card */}
            <div style={{ background: 'rgba(255,255,255,0.02)', borderRadius: '18px', padding: '2rem', textAlign: 'right', border: '1px solid rgba(255,255,255,0.06)' }}>
              {[
                { icon: <User size={20} color="var(--primary)" />, label: 'مُنحت إلى الطالب', value: cert.user.name },
                { icon: <BookOpen size={20} color="var(--primary)" />, label: 'لإتمامه بنجاح دورة', value: cert.course.title },
                { icon: <Calendar size={20} color="var(--primary)" />, label: 'تاريخ الإصدار', value: new Date(cert.issuedAt).toLocaleDateString('ar-SA', { year: 'numeric', month: 'long', day: 'numeric' }) },
                ...(cert.grade ? [{ icon: <Award size={20} color="var(--primary)" />, label: 'التقدير النهائي', value: cert.grade }] : []),
                { icon: <ShieldCheck size={20} color="var(--primary)" />, label: 'رقم الاعتماد', value: certId },
              ].map((row, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1rem 0', borderBottom: i < 3 ? '1px solid rgba(255,255,255,0.05)' : 'none' }}>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontSize: '0.82rem', color: 'rgba(255,255,255,0.4)', marginBottom: '0.25rem' }}>{row.label}</p>
                    <p style={{ fontSize: '1.05rem', fontWeight: '600', fontFamily: i === 4 ? 'monospace' : 'inherit', color: i === 4 ? 'var(--primary)' : '#fff' }}>{row.value}</p>
                  </div>
                  <div style={{ marginRight: '1rem' }}>{row.icon}</div>
                </div>
              ))}
            </div>

            {isMock && (
              <p style={{ marginTop: '1.5rem', fontSize: '0.8rem', color: 'rgba(255,255,255,0.3)' }}>
                * هذه شهادة تجريبية للعرض. الشهادات الحقيقية مسجلة في قاعدة البيانات.
              </p>
            )}

            <div style={{ marginTop: '2rem', display: 'flex', gap: '1rem', justifyContent: 'center' }}>
              <Link href="/verify" style={{ padding: '0.75rem 1.5rem', background: 'rgba(255,255,255,0.06)', color: '#fff', textDecoration: 'none', borderRadius: '12px', fontWeight: '600', fontSize: '0.95rem', border: '1px solid rgba(255,255,255,0.1)' }}>
                التحقق من شهادة أخرى
              </Link>
              <Link href="/" style={{ padding: '0.75rem 1.5rem', background: 'var(--primary)', color: '#000', textDecoration: 'none', borderRadius: '12px', fontWeight: 'bold', fontSize: '0.95rem' }}>
                الصفحة الرئيسية
              </Link>
            </div>
          </>
        ) : (
          <>
            {/* Not Found */}
            <div style={{ width: '90px', height: '90px', background: 'rgba(239,68,68,0.1)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem auto', border: '1px solid rgba(239,68,68,0.2)', boxShadow: '0 0 40px rgba(239,68,68,0.1)' }}>
              <XCircle size={44} color="#ef4444" />
            </div>

            <h1 style={{ fontSize: '2rem', fontWeight: 'bold', color: '#ef4444', marginBottom: '0.5rem' }}>شهادة غير موجودة ✗</h1>
            <p style={{ color: 'rgba(255,255,255,0.55)', marginBottom: '0.75rem', lineHeight: 1.6 }}>
              لم نتمكن من العثور على شهادة بالمعرف التالي في سجلاتنا:
            </p>
            <code style={{ display: 'inline-block', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', padding: '0.5rem 1rem', borderRadius: '8px', fontFamily: 'monospace', color: '#ef4444', marginBottom: '2rem', fontSize: '1rem' }}>
              {certId}
            </code>
            <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.9rem', marginBottom: '2rem', lineHeight: 1.6 }}>
              تأكد من صحة الرقم، أو تواصل مع الدعم الفني إذا كنت تعتقد أن هناك خطأ.
            </p>

            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
              <Link href="/verify" style={{ padding: '0.75rem 1.5rem', background: 'rgba(255,255,255,0.06)', color: '#fff', textDecoration: 'none', borderRadius: '12px', fontWeight: '600', fontSize: '0.95rem', border: '1px solid rgba(255,255,255,0.1)' }}>
                حاول مجدداً
              </Link>
              <Link href="/" style={{ padding: '0.75rem 1.5rem', background: 'rgba(239,68,68,0.1)', color: '#ef4444', textDecoration: 'none', borderRadius: '12px', fontWeight: 'bold', fontSize: '0.95rem', border: '1px solid rgba(239,68,68,0.2)' }}>
                الصفحة الرئيسية
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
