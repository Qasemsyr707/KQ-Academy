import { prisma } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import CertificatesClient from './CertificatesClient';
import { certificateUrls, publicReference } from '@/lib/certificate-access';
import { formatDate } from '@/lib/format';

export const dynamic = 'force-dynamic'; // personal page: never cached or shared

export default async function CertificatesPage() {
  const session = await getServerSession(authOptions);
  
  if (!session || !session.user) {
    redirect('/login');
  }

  const userId = (session.user as any).id;

  // Fetch real certificates for the user
  const certificates = await prisma.certificate.findMany({
    where: { userId },
    include: {
      course: {
        select: {
          title: true,
          instructor: {
            select: { name: true }
          }
        }
      }
    },
    orderBy: { issuedAt: 'desc' }
  });

  // Format them for the client
  const formattedCerts = await Promise.all(certificates.map(async cert => {
    const reference = publicReference(cert);
    const urls = certificateUrls(reference);
    return {
    id: cert.id, // For fallback URL
    reference,
    certificateNumber: cert.certificateNumber,
    course: cert.courseName,
    instructor: cert.manager1, // Or we can use cert.course.instructor.name, but user wanted manager
    date: formatDate(cert.issuedAt),
    grade: 'امتياز', // Grade could be calculated from quizAttempts if needed
    image: urls.png,
    pdfUrl: urls.pdf,
    pngUrl: urls.png,
    };
  }));

  return <CertificatesClient initialCerts={formattedCerts} />;
}
