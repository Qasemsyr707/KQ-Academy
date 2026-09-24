import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ certId: string }> }
) {
  try {
    const { certId } = await params;

    if (!certId) {
      return NextResponse.json({ error: 'يرجى تزويد كود الشهادة' }, { status: 400 });
    }

    const certificate = await prisma.certificate.findFirst({
      where: {
        OR: [
          { id: certId },
          { certificateNumber: certId }
        ]
      }
    });

    if (!certificate) {
      return NextResponse.json({ error: 'الشهادة غير موجودة أو كود غير صالح' }, { status: 404 });
    }

    return NextResponse.json({
      certificateNumber: certificate.certificateNumber || certificate.id,
      studentName: certificate.studentName,
      courseName: certificate.courseName,
      courseDuration: certificate.courseDuration,
      issueDate: new Date(certificate.issuedAt).toISOString().split('T')[0],
      manager: certificate.manager1,
      pngUrl: certificate.pngUrl,
      pdfUrl: certificate.pdfUrl,
      status: 'موثقة'
    });

  } catch (error) {
    console.error('Certificate Verification Error:', error);
    return NextResponse.json({ error: 'حدث خطأ في الخادم' }, { status: 500 });
  }
}
