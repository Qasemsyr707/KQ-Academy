import { prisma } from '@/lib/db';
import { CheckCircle, XCircle, Award, Calendar, User, BookOpen } from 'lucide-react';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default async function VerifyCertificatePage({ params }: { params: { certId: string } }) {
  const certificate = await prisma.certificate.findUnique({
    where: { id: params.certId },
    include: {
      user: true,
      course: true
    }
  });

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#050505', color: '#fff', padding: '2rem' }}>
      <div style={{ width: '100%', maxWidth: '600px', background: '#111', borderRadius: '24px', padding: '3rem', border: '1px solid rgba(255,255,255,0.05)', boxShadow: '0 20px 40px rgba(0,0,0,0.5)', textAlign: 'center' }}>
        
        {/* Verification Status */}
        {certificate ? (
          <>
            <div style={{ width: '80px', height: '80px', background: 'rgba(34, 197, 94, 0.1)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem auto' }}>
              <CheckCircle size={40} color="#22c55e" />
            </div>
            <h1 style={{ fontSize: '2rem', fontWeight: 'bold', color: '#22c55e', marginBottom: '0.5rem' }}>شهادة موثقة ورسمية</h1>
            <p style={{ color: 'rgba(255,255,255,0.6)', marginBottom: '2rem' }}>تم التحقق من صحة هذه الشهادة من سجلات الأكاديمية بنجاح.</p>
            
            <div style={{ background: 'rgba(255,255,255,0.02)', borderRadius: '16px', padding: '2rem', textAlign: 'right', border: '1px solid rgba(255,255,255,0.05)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: '0.9rem', color: 'rgba(255,255,255,0.5)', marginBottom: '0.2rem' }}>مُنحت إلى الطالب</p>
                  <p style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>{certificate.user.name}</p>
                </div>
                <User color="var(--primary)" size={24} />
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: '0.9rem', color: 'rgba(255,255,255,0.5)', marginBottom: '0.2rem' }}>لإتمامه بنجاح دورة</p>
                  <p style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>{certificate.course.title}</p>
                </div>
                <BookOpen color="var(--primary)" size={24} />
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: '0.9rem', color: 'rgba(255,255,255,0.5)', marginBottom: '0.2rem' }}>تاريخ الإصدار</p>
                  <p style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>{new Date(certificate.issuedAt).toLocaleDateString('ar-SA')}</p>
                </div>
                <Calendar color="var(--primary)" size={24} />
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: '0.9rem', color: 'rgba(255,255,255,0.5)', marginBottom: '0.2rem' }}>المعرف الرقمي (ID)</p>
                  <p style={{ fontSize: '1rem', fontFamily: 'monospace', color: 'rgba(255,255,255,0.8)' }}>{certificate.id}</p>
                </div>
                <Award color="var(--primary)" size={24} />
              </div>
            </div>
            
            <div style={{ marginTop: '2rem' }}>
               <Link href="/" style={{ color: 'var(--primary)', textDecoration: 'none', fontWeight: 'bold' }}>العودة للصفحة الرئيسية</Link>
            </div>
          </>
        ) : (
          <>
            <div style={{ width: '80px', height: '80px', background: 'rgba(239, 68, 68, 0.1)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem auto' }}>
              <XCircle size={40} color="#ef4444" />
            </div>
            <h1 style={{ fontSize: '2rem', fontWeight: 'bold', color: '#ef4444', marginBottom: '0.5rem' }}>شهادة غير صالحة</h1>
            <p style={{ color: 'rgba(255,255,255,0.6)', marginBottom: '2rem' }}>لم نتمكن من العثور على أي شهادة تحمل هذا المعرف في سجلاتنا. قد يكون الرابط غير صحيح أو تم العبث به.</p>
            <Link href="/" style={{ display: 'inline-block', background: 'rgba(255,255,255,0.1)', color: '#fff', padding: '1rem 2rem', borderRadius: '12px', textDecoration: 'none', fontWeight: 'bold' }}>
              العودة للرئيسية
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
