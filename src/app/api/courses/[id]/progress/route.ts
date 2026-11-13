import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireRequestUser, RequestUserError } from '@/lib/request-user';
import { completeLessons, getCourseCompletion, ProgressError } from '@/lib/course-progress';
import { CertificateError, issueCertificate } from '@/lib/certificate-issue';

const HEADERS = { 'Cache-Control': 'private, no-store', Vary: 'Cookie, Authorization' };
const fail = (error: unknown) => {
  if (error instanceof ProgressError || error instanceof RequestUserError) {
    return NextResponse.json({ error: error.message }, { status: error.status, headers: HEADERS });
  }
  console.error('[course progress]', error);
  return NextResponse.json({ error: 'تعذّر حفظ التقدّم حالياً' }, { status: 500, headers: HEADERS });
};

/** The signed-in student's saved progress for this course. */
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireRequestUser(req);
    const { id } = await params;
    const [completion, certificate] = await Promise.all([
      getCourseCompletion(prisma, user.id, id),
      prisma.certificate.findUnique({ where: { userId_courseId: { userId: user.id, courseId: id } }, select: { id: true } }),
    ]);
    return NextResponse.json({ ...completion, certificateId: certificate?.id ?? null }, { headers: HEADERS });
  } catch (error) { return fail(error); }
}

/** Mark lessons completed: `{ lessonId }` or `{ lessonIds: [...] }`. */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireRequestUser(req);
    const { id } = await params;
    const body = await req.json().catch(() => null) as { lessonId?: unknown; lessonIds?: unknown } | null;
    const raw = Array.isArray(body?.lessonIds) ? body.lessonIds : [body?.lessonId];
    const lessonIds = raw.filter((value): value is string => typeof value === 'string' && value.length > 0 && value.length <= 200);
    if (lessonIds.length === 0) throw new ProgressError(400, 'الدرس مطلوب');
    const completion = await completeLessons(user.id, id, lessonIds);

    // Completing the last item issues the certificate once; a failure here must
    // not lose the saved progress, and the student can still request it later.
    let certificateId: string | null = null;
    if (completion.complete) {
      try { certificateId = (await issueCertificate(user.id, id)).certificate.id; }
      catch (error) { if (!(error instanceof CertificateError)) console.error('[course progress] certificate', error); }
    }
    return NextResponse.json({ ...completion, certificateId }, { headers: HEADERS });
  } catch (error) { return fail(error); }
}
