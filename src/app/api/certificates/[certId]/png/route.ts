import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { generateCertificateBuffer } from '@/lib/certificate';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ certId: string }> }
) {
  try {
    const { certId } = await params;

    // certId can be the DB id or the certificateNumber
    const certificate = await prisma.certificate.findFirst({
      where: {
        OR: [
          { id: certId },
          { certificateNumber: certId }
        ]
      },
      include: {
        course: true
      }
    });

    if (!certificate) {
      return NextResponse.json({ error: 'Certificate not found' }, { status: 404 });
    }

    const startDate = new Date(certificate.course.createdAt).toLocaleDateString('en-GB'); 
    const endDate = new Date(certificate.issuedAt).toLocaleDateString('en-GB');
    const issueDate = new Date(certificate.issuedAt).toLocaleDateString('en-GB');

    // Generate PNG buffer on the fly
    const pngBuffer = await generateCertificateBuffer({
      studentName: certificate.studentName,
      courseName: certificate.courseName,
      startDate: startDate,
      endDate: endDate,
      durationHours: certificate.courseDuration,
      issueDate: issueDate,
      certificateNumber: certificate.certificateNumber || certificate.id
    });

    // Return the image as a response
    return new NextResponse(pngBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'image/png',
        'Cache-Control': 'public, max-age=31536000, immutable'
      }
    });

  } catch (error) {
    console.error('Dynamic PNG Generation Error:', error);
    return NextResponse.json({ error: 'Failed to generate certificate' }, { status: 500 });
  }
}
