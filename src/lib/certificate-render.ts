import { NextResponse } from 'next/server';
import { PDFDocument } from 'pdf-lib';
import { prisma } from '@/lib/db';
import { generateCertificateBuffer } from '@/lib/certificate';
import { certificateHours, publicReference, resolveCertificate } from '@/lib/certificate-access';
import { getCourseViewer } from '@/lib/course-access';

const day = (value: Date) => new Date(value).toLocaleDateString('en-GB', { timeZone: 'UTC' });

/** Shared PNG/PDF delivery. A bare certificate number only works for its owner or staff. */
export async function certificateDocument(req: Request, reference: string, format: 'png' | 'pdf') {
  try {
    const viewer = await getCourseViewer(req).catch(() => null);
    const found = await resolveCertificate(reference, viewer);
    if (!found || found.access !== 'full') {
      return NextResponse.json({ error: 'Certificate not found' }, { status: 404, headers: { 'Cache-Control': 'private, no-store' } });
    }
    const { certificate } = found;
    const enrollment = await prisma.enrollment.findUnique({
      where: { userId_courseId: { userId: certificate.userId, courseId: certificate.courseId } }, select: { createdAt: true },
    });
    const png = await generateCertificateBuffer({
      studentName: certificate.studentName,
      courseName: certificate.courseName,
      // The student's own start (enrollment); course creation only for old records without one.
      startDate: day(enrollment?.createdAt ?? certificate.course.createdAt),
      endDate: day(certificate.issuedAt),
      durationHours: certificateHours(certificate, certificate.course),
      issueDate: day(certificate.issuedAt),
      certificateNumber: certificate.certificateNumber || certificate.id,
      verifyReference: await publicReference(certificate),
    });
    // Personal document: never stored by shared caches, short private reuse only.
    const headers: Record<string, string> = { 'Cache-Control': 'private, max-age=300', Vary: 'Cookie, Authorization', 'X-Robots-Tag': 'noindex' };
    if (format === 'png') return new NextResponse(new Uint8Array(png), { status: 200, headers: { ...headers, 'Content-Type': 'image/png' } });

    const pdf = await PDFDocument.create();
    const image = await pdf.embedPng(png);
    const page = pdf.addPage([image.width, image.height]);
    page.drawImage(image, { x: 0, y: 0, width: image.width, height: image.height });
    pdf.setTitle(`KQ Academy Certificate ${certificate.certificateNumber}`);
    return new NextResponse(new Uint8Array(await pdf.save()), { status: 200, headers: {
      ...headers, 'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="KQ-Certificate-${certificate.certificateNumber}.pdf"`,
    } });
  } catch (error) {
    console.error(`Certificate ${format} generation error:`, error);
    return NextResponse.json({ error: 'Failed to generate certificate' }, { status: 500 });
  }
}
