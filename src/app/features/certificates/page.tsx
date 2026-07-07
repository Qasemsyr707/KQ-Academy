import { prisma } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import CertificatesClient from './CertificatesClient';

export const dynamic = 'force-dynamic';

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
  const formattedCerts = certificates.map(cert => ({
    id: cert.id,
    course: cert.course.title,
    instructor: cert.course.instructor.name,
    date: cert.issuedAt.toLocaleDateString('ar-SA', { year: 'numeric', month: 'long', day: 'numeric' }),
    grade: 'امتياز', // Grade could be calculated from quizAttempts if needed
    image: 'https://images.unsplash.com/photo-1523050854058-8df90110c9f1?q=80&w=600&auto=format&fit=crop'
  }));

  return <CertificatesClient initialCerts={formattedCerts} />;
}
