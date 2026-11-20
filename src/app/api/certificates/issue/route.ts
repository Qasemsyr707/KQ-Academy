import { NextResponse } from 'next/server';
import { requireRequestUser, RequestUserError } from '@/lib/request-user';
import { CertificateError, issueCertificate } from '@/lib/certificate-issue';

const HEADERS = { 'Cache-Control': 'private, no-store' };

/** Web and mobile (Bearer) certificate issuing; eligibility is checked on the server. */
export async function POST(req: Request) {
  try {
    const user = await requireRequestUser(req);
    const body = await req.json().catch(() => null) as { courseId?: unknown } | null;
    const { certificate, created } = await issueCertificate(user.id, body?.courseId);
    return NextResponse.json(
      { certificateId: certificate.id, certificateNumber: certificate.certificateNumber,
        message: created ? 'تم إصدار الشهادة بنجاح!' : 'الشهادة موجودة مسبقاً' },
      { status: created ? 201 : 200, headers: HEADERS },
    );
  } catch (error) {
    if (error instanceof CertificateError || error instanceof RequestUserError) {
      return NextResponse.json({ error: error.message }, { status: error.status, headers: HEADERS });
    }
    console.error('Issue Certificate API Error:', error);
    return NextResponse.json({ error: 'حدث خطأ في الخادم' }, { status: 500, headers: HEADERS });
  }
}
