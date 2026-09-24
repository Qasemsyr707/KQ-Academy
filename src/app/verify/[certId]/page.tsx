import { prisma } from '@/lib/db';
import { XCircle, CheckCircle, ArrowRight, Download, FileText } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';

export const dynamic = 'force-dynamic';

export default async function VerifyCertificatePage({
  params
}: {
  params: Promise<{ certId: string }>
}) {
  const resolvedParams = await params;

  const certificate = await prisma.certificate.findFirst({
    where: {
      OR: [
        { id: resolvedParams.certId },
        { certificateNumber: resolvedParams.certId }
      ]
    }
  });

  if (!certificate) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#050505', color: '#fff' }}>
        <div style={{ padding: '3rem', textAlign: 'center', maxWidth: '500px', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: '20px', background: 'rgba(239,68,68,0.05)' }}>
          <XCircle size={64} color="#ef4444" style={{ margin: '0 auto 1.5rem auto' }} />
          <h1 style={{ fontSize: '2rem', marginBottom: '1rem', color: '#ef4444' }}>شهادة غير صالحة</h1>
          <p style={{ color: 'rgba(255,255,255,0.7)', marginBottom: '2rem' }}>
            رقم الشهادة الذي أدخلته غير موجود في سجلاتنا. يرجى التحقق من الرقم والمحاولة مرة أخرى.
          </p>
          <Link href="/verify" style={{ padding: '0.8rem 1.5rem', display: 'inline-flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(255,255,255,0.1)', color: '#fff', borderRadius: '10px', textDecoration: 'none' }}>
            <ArrowRight size={18} /> العودة للبحث
          </Link>
        </div>
      </div>
    );
  }

  const issuedDate = new Date(certificate.issuedAt).toLocaleDateString('en-GB');

  return (
    <div style={{ minHeight: '100vh', background: '#050505', color: '#fff', padding: '3rem 1rem', display: 'flex', flexDirection: 'column', alignItems: 'center', direction: 'ltr' }}>
      
      <div style={{ width: '100%', maxWidth: '800px', marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Link href="/verify" style={{ color: 'rgba(203,161,83,0.8)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.95rem' }}>
          <ArrowRight size={16} style={{ transform: 'rotate(180deg)' }} /> Back to Verification
        </Link>
      </div>

      <div style={{ background: '#111', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '24px', width: '100%', maxWidth: '800px', overflow: 'hidden' }}>
        <div style={{ background: 'rgba(34, 197, 94, 0.1)', padding: '2rem', borderBottom: '1px solid rgba(34, 197, 94, 0.2)', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <CheckCircle size={56} color="#22c55e" style={{ marginBottom: '1rem' }} />
          <h1 style={{ fontSize: '2rem', fontWeight: 'bold', color: '#22c55e', margin: 0 }}>VALID CERTIFICATE</h1>
          <p style={{ color: 'rgba(255,255,255,0.6)', marginTop: '0.5rem' }}>This certificate is officially issued by KQ Academy</p>
        </div>

        <div style={{ padding: '3rem', display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '1rem', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '1rem' }}>
            <div style={{ color: 'rgba(255,255,255,0.5)', fontWeight: 'bold' }}>Certificate No.</div>
            <div style={{ fontSize: '1.2rem', fontFamily: 'monospace', color: 'var(--primary)' }}>{certificate.certificateNumber || certificate.id}</div>
          </div>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '1rem', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '1rem' }}>
            <div style={{ color: 'rgba(255,255,255,0.5)', fontWeight: 'bold' }}>Student Name</div>
            <div style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>{certificate.studentName}</div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '1rem', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '1rem' }}>
            <div style={{ color: 'rgba(255,255,255,0.5)', fontWeight: 'bold' }}>Course Name</div>
            <div style={{ fontSize: '1.2rem', color: '#e0e0e0' }}>{certificate.courseName}</div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '1rem', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '1rem' }}>
            <div style={{ color: 'rgba(255,255,255,0.5)', fontWeight: 'bold' }}>Duration</div>
            <div style={{ fontSize: '1.1rem' }}>{certificate.courseDuration} Hours</div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '1rem', alignItems: 'center' }}>
            <div style={{ color: 'rgba(255,255,255,0.5)', fontWeight: 'bold' }}>Issue Date</div>
            <div style={{ fontSize: '1.1rem' }}>{issuedDate}</div>
          </div>
        </div>

        {certificate.pngUrl && (
          <div style={{ background: '#1a1a1a', padding: '2rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1.5rem', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
            <div style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>Original Certificate Document</div>
            
            <a href={certificate.pngUrl} target="_blank" rel="noopener noreferrer" style={{ display: 'block', width: '100%', maxWidth: '500px', border: '1px solid rgba(203,161,83,0.3)', borderRadius: '12px', overflow: 'hidden', cursor: 'zoom-in', transition: 'all 0.3s', boxShadow: '0 10px 30px rgba(0,0,0,0.5)' }} className="cert-preview">
              <img src={certificate.pngUrl} alt="Certificate Preview" style={{ width: '100%', display: 'block' }} />
            </a>

            <div style={{ display: 'flex', gap: '1rem', width: '100%', maxWidth: '500px', marginTop: '1rem' }}>
              {certificate.pdfUrl && (
                <a href={certificate.pdfUrl} target="_blank" rel="noopener noreferrer" style={{ flex: 1, padding: '1rem', background: 'var(--primary)', color: '#000', textDecoration: 'none', borderRadius: '12px', fontWeight: 'bold', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem' }}>
                  <FileText size={20} /> Download PDF
                </a>
              )}
              <a href={certificate.pngUrl} download={`KQ-Certificate-${certificate.certificateNumber}.png`} style={{ flex: 1, padding: '1rem', background: 'rgba(255,255,255,0.1)', color: '#fff', textDecoration: 'none', borderRadius: '12px', fontWeight: 'bold', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem', border: '1px solid rgba(255,255,255,0.2)' }}>
                <Download size={20} /> Download PNG
              </a>
            </div>
          </div>
        )}
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        .cert-preview:hover { transform: translateY(-5px); border-color: var(--primary); box-shadow: 0 15px 40px rgba(203,161,83,0.2); }
      `}} />
    </div>
  );
}
