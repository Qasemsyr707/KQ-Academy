import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { generateCertificateBuffer } from '@/lib/certificate';
import { PDFDocument } from 'pdf-lib';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ certId: string }> }
) {
  try {
    const { certId } = await params;

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

    // 1. Generate PNG buffer on the fly
    const pngBuffer = await generateCertificateBuffer({
      studentName: certificate.studentName,
      courseName: certificate.courseName,
      startDate: startDate,
      endDate: endDate,
      durationHours: certificate.courseDuration,
      issueDate: issueDate,
      certificateNumber: certificate.certificateNumber || certificate.id
    });

    // 2. Wrap in PDF
    const pdfDoc = await PDFDocument.create();
    const image = await pdfDoc.embedPng(pngBuffer);
    const page = pdfDoc.addPage([image.width, image.height]);
    page.drawImage(image, {
      x: 0,
      y: 0,
      width: image.width,
      height: image.height,
    });

    const pdfBytes = await pdfDoc.save();

    // Return the PDF as a response
    return new NextResponse(pdfBytes, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Cache-Control': 'public, max-age=31536000, immutable'
      }
    });

  } catch (error) {
    console.error('Dynamic PDF Generation Error:', error);
    return NextResponse.json({ error: 'Failed to generate PDF' }, { status: 500 });
  }
}
