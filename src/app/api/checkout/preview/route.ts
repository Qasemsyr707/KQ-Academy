import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { paymentId } from '@/lib/payments/wallet-operations';
import { availableCheckoutMethods } from '@/lib/payments/public-checkout';

// The response depends on the visitor's session (enrolment flag), so it must never be cached.
const HEADERS = { 'Cache-Control': 'private, no-store', Vary: 'Cookie' };

/**
 * Public, read-only checkout summary used by the checkout page for guests and
 * signed-in customers alike: the published course, the gateways that can
 * really be completed, and whether the current viewer already owns the course.
 * It never creates payments or reveals wallet balances (those stay behind
 * `/api/checkout/info`, which requires authentication).
 */
export async function GET(req: Request) {
  const courseId = new URL(req.url).searchParams.get('courseId');
  if (!paymentId(courseId)) {
    return NextResponse.json({ error: 'معرّف الكورس غير صالح' }, { status: 400, headers: HEADERS });
  }

  try {
    const course = await prisma.course.findFirst({
      where: { id: courseId, status: 'PUBLISHED' },
      select: {
        id: true,
        title: true,
        price: true,
        priceSYP: true,
        thumbnail: true,
        instructor: { select: { name: true } },
      },
    });
    if (!course) {
      return NextResponse.json({ error: 'الكورس غير متاح للشراء حالياً' }, { status: 404, headers: HEADERS });
    }

    const session = await getServerSession(authOptions);
    const userId = session?.user?.id;
    const enrolled = userId
      ? Boolean(await prisma.enrollment.findUnique({
          where: { userId_courseId: { userId, courseId } },
          select: { id: true },
        }))
      : false;

    return NextResponse.json({
      course,
      methods: await availableCheckoutMethods(),
      viewer: { authenticated: Boolean(userId), enrolled },
    }, { headers: HEADERS });
  } catch (error) {
    console.error('[checkout/preview]', error);
    return NextResponse.json({ error: 'تعذّر تحميل بيانات الدفع حالياً، يرجى المحاولة بعد قليل' }, { status: 503, headers: HEADERS });
  }
}
