import { prisma } from '@/lib/db';
import { ShieldCheck, Award, Calendar, User, XCircle, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { notFound } from 'next/navigation';

export const dynamic = 'force-dynamic';

export default async function VerifyCertificatePage({ params }: { params: { certId: string } }) {
  const certificate = await prisma.certificate.findUnique({
    where: { id: params.certId },
    include: {
      user: { select: { name: true } },
      course: { select: { title: true, instructor: { select: { name: true } } } }
    }
  });

  if (!certificate) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#050505', color: '#fff' }}>
        <div className="glass-card" style={{ padding: '3rem', textAlign: 'center', maxWidth: '500px', border: '1px solid rgba(239, 68, 68, 0.3)' }}>
          <XCircle size={64} color="#ef4444" style={{ margin: '0 auto 1.5rem auto' }} />
          <h1 style={{ fontSize: '2rem', marginBottom: '1rem', color: '#ef4444' }}>شهادة غير صالحة</h1>
          <p style={{ color: 'rgba(255,255,255,0.7)', marginBottom: '2rem' }}>
            رقم الشهادة الذي أدخلته غير موجود في سجلات الأكاديمية. يرجى التأكد من الرقم وإعادة المحاولة.
          </p>
          <Link href="/verify" className="btn" style={{ padding: '0.8rem 1.5rem', display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
            <ArrowRight size={18} /> العودة للبحث
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: '#050505', color: '#fff', padding: '4rem 2rem', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      
      <div style={{ width: '100%', maxWidth: '800px', marginBottom: '2rem' }}>
        <Link href="/verify" style={{ color: 'var(--primary)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <ArrowRight size={18} /> العودة للتحقق
        </Link>
      </div>

      <div style={{
        background: 'linear-gradient(135deg, rgba(203, 161, 83, 0.05), rgba(0,0,0,0.8))',
        border: '2px solid rgba(203, 161, 83, 0.3)',
        borderRadius: '24px',
        padding: '3rem',
        width: '100%',
        maxWidth: '800px',
        position: 'relative',
        overflow: 'hidden',
        boxShadow: '0 20px 50px rgba(0,0,0,0.5)'
      }}>
        {/* Background glow */}
        <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '5px', background: 'var(--primary)' }} />
        
        <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
          <ShieldCheck size={48} color="var(--primary)" style={{ margin: '0 auto 1rem auto' }} />
          <h1 style={{ fontSize: '2.5rem', fontWeight: 'bold', color: 'var(--primary)' }}>شهادة معتمدة وموثقة</h1>
          <p style={{ color: 'rgba(255,255,255,0.6)', letterSpacing: '2px', fontSize: '0.9rem', marginTop: '0.5rem' }}>
            ID: {certificate.id}
          </p>
        </div>

        <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
          <p style={{ fontSize: '1.2rem', color: 'rgba(255,255,255,0.7)', marginBottom: '0.5rem' }}>يُشهد بأن الطالب</p>
          <h2 style={{ fontSize: '2.5rem', fontWeight: 'bold', marginBottom: '1.5rem' }}>{certificate.user.name}</h2>
          <p style={{ fontSize: '1.2rem', color: 'rgba(255,255,255,0.7)', marginBottom: '0.5rem' }}>قد أتم بنجاح متطلبات كورس</p>
          <h3 style={{ fontSize: '2rem', color: 'var(--primary)', fontWeight: 'bold' }}>{certificate.course.title}</h3>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '2rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{ width: '50px', height: '50px', borderRadius: '50%', background: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <User size={24} color="#3b82f6" />
            </div>
            <div>
              <p style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.5)', marginBottom: '0.2rem' }}>بإشراف المدرب</p>
              <p style={{ fontWeight: 'bold', fontSize: '1.1rem' }}>{certificate.course.instructor.name}</p>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{ width: '50px', height: '50px', borderRadius: '50%', background: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Calendar size={24} color="#22c55e" />
            </div>
            <div>
              <p style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.5)', marginBottom: '0.2rem' }}>تاريخ الإصدار</p>
              <p style={{ fontWeight: 'bold', fontSize: '1.1rem' }}>{certificate.issuedAt.toLocaleDateString('ar-SA')}</p>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
