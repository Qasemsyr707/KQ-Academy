import { NextResponse } from 'next/server';
import { PDFDocument } from 'pdf-lib';
import { prisma } from '@/lib/db';
import { generateCertificateBuffer } from '@/lib/certificate';
import { certificateDates, certificateHours, isLegacyCertificate, publicReference, resolveCertificate } from '@/lib/certificate-access';
import { limitRequest, RATE_RULES } from '@/lib/rate-limit';
import { getCourseViewer } from '@/lib/course-access';

/** Shared PNG/PDF delivery. A bare certificate number only works for its owner or staff. */
export async function certificateDocument(req: Request, reference: string, format: 'png' | 'pdf') {
  try {
    const limited = limitRequest(req, RATE_RULES.certificateDocument);
    if (limited) return limited;
    const viewer = await getCourseViewer(req).catch(() => null);
    const found = await resolveCertificate(reference, viewer);
    if (!found || found.access !== 'full') {
      return NextResponse.json({ error: 'Certificate not found' }, { status: 404, headers: { 'Cache-Control': 'private, no-store' } });
    }
    const { certificate } = found;
    const legacy = isLegacyCertificate(certificate);
    // Both kinds use stored facts only: the student's enrollment and the issue date.
    const enrollment = await prisma.enrollment.findUnique({
      where: { userId_courseId: { userId: certificate.userId, courseId: certificate.courseId } }, select: { createdAt: true },
    });
    const dates = certificateDates(certificate.issuedAt, enrollment?.createdAt);
    const png = await generateCertificateBuffer({
      template: legacy ? 'legacy' : 'v2',
      studentName: certificate.studentName,
      courseName: certificate.courseName,
      courseDate: dates.courseDate,
      durationHours: certificateHours(certificate, certificate.course),
      issueDate: dates.issueDate,
      certificateNumber: certificate.certificateNumber || certificate.id,
      verifyReference: publicReference(certificate),
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
