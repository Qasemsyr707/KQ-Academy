import { NextResponse } from 'next/server';
import { certificateHours, certificateUrls, maskName, publicReference, resolveCertificate } from '@/lib/certificate-access';
import { getCourseViewer } from '@/lib/course-access';
import { limitRequest, RATE_RULES } from '@/lib/rate-limit';

const HEADERS = { 'Cache-Control': 'private, no-store', Vary: 'Cookie, Authorization' };

/**
 * Public references confirm validity with a masked name and no document links.
 * Only authenticated owners and authorized staff receive private details.
 */
export async function GET(request: Request, { params }: { params: Promise<{ certId: string }> }) {
  const limited = limitRequest(request, RATE_RULES.verify);
  if (limited) return limited;
  try {
    const { certId } = await params;
    const found = await resolveCertificate(certId, await getCourseViewer(request).catch(() => null));
    if (!found) {
      return NextResponse.json({ error: 'الشهادة غير موجودة أو كود غير صالح' }, { status: 404, headers: HEADERS });
    }
    const { certificate, access } = found;
    const full = access === 'full';
    const urls = full ? certificateUrls(publicReference(certificate)) : null;
    return NextResponse.json({
      certificateNumber: certificate.certificateNumber || certificate.id,
      studentName: full ? certificate.studentName : maskName(certificate.studentName),
      nameMasked: !full,
      courseName: certificate.courseName,
      courseDuration: certificateHours(certificate, certificate.course),
      issueDate: new Date(certificate.issuedAt).toISOString().split('T')[0],
      manager: certificate.manager1,
      pngUrl: urls?.png ?? null,
      pdfUrl: urls?.pdf ?? null,
      status: 'موثقة',
    }, { headers: HEADERS });
  } catch (error) {
    console.error('Certificate Verification Error:', error);
    return NextResponse.json({ error: 'حدث خطأ في الخادم' }, { status: 500, headers: HEADERS });
  }
}
