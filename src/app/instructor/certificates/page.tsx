import { prisma } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { Award, ExternalLink } from 'lucide-react';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default async function InstructorCertificatesPage() {
  const session = await getServerSession(authOptions);
  
  if (!session || !session.user || ((session.user as any).role !== 'INSTRUCTOR' && (session.user as any).role !== 'ADMIN')) {
    redirect('/login');
  }

  const instructorId = (session.user as any).id;

  const certificates = await prisma.certificate.findMany({
    where: {
      course: {
        instructorId: instructorId
      }
    },
    include: {
      user: { select: { name: true, email: true } },
      course: { select: { title: true } }
    },
    orderBy: { issuedAt: 'desc' }
  });

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ fontSize: '2rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>شهادات طلابي</h1>
          <p style={{ color: 'rgba(255,255,255,0.6)' }}>سجل بجميع الشهادات المصدرة للطلاب في دوراتك</p>
        </div>
      </div>

      <div style={{ background: '#111', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.05)', overflow: 'hidden' }}>
        {certificates.length === 0 ? (
          <div style={{ padding: '4rem', textAlign: 'center', color: 'rgba(255,255,255,0.5)' }}>
            <Award size={48} style={{ margin: '0 auto 1rem auto', opacity: 0.5 }} />
            <p>لم يتم إصدار أي شهادة لطلابك حتى الآن.</p>
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: 'rgba(255,255,255,0.02)', borderBottom: '1px solid rgba(255,255,255,0.05)', textAlign: 'right' }}>
                <th style={{ padding: '1.5rem', color: 'rgba(255,255,255,0.5)', fontWeight: 'normal' }}>رقم الشهادة</th>
                <th style={{ padding: '1.5rem', color: 'rgba(255,255,255,0.5)', fontWeight: 'normal' }}>الطالب</th>
                <th style={{ padding: '1.5rem', color: 'rgba(255,255,255,0.5)', fontWeight: 'normal' }}>الكورس</th>
                <th style={{ padding: '1.5rem', color: 'rgba(255,255,255,0.5)', fontWeight: 'normal' }}>تاريخ الإصدار</th>
                <th style={{ padding: '1.5rem', color: 'rgba(255,255,255,0.5)', fontWeight: 'normal' }}>إجراءات</th>
              </tr>
            </thead>
            <tbody>
              {certificates.map(cert => (
                <tr key={cert.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                  <td style={{ padding: '1.5rem', fontFamily: 'monospace', fontSize: '0.9rem', color: 'var(--primary)' }}>{cert.id.substring(0,8)}...</td>
                  <td style={{ padding: '1.5rem' }}>
                    <div style={{ fontWeight: 'bold' }}>{cert.user.name}</div>
                    <div style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.5)' }}>{cert.user.email}</div>
                  </td>
                  <td style={{ padding: '1.5rem', fontWeight: 'bold' }}>{cert.course.title}</td>
                  <td style={{ padding: '1.5rem', color: 'rgba(255,255,255,0.7)' }}>{cert.issuedAt.toLocaleDateString('ar-SA')}</td>
                  <td style={{ padding: '1.5rem' }}>
                    <Link href={`/verify/${cert.id}`} target="_blank" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', padding: '0.5rem 1rem', background: 'rgba(255,255,255,0.05)', color: '#fff', textDecoration: 'none', borderRadius: '8px', fontSize: '0.9rem' }}>
                      <ExternalLink size={16} /> عرض
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
