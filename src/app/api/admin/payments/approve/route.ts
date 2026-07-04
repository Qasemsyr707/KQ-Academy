import { NextResponse } from 'next/server';
import { requireRoleApi } from '@/lib/rbac';
import { prisma } from '@/lib/db';

export async function POST(req: Request) {
  try {
    const { authorized, errorResponse } = await requireRoleApi(['ADMIN']);
    if (!authorized) return errorResponse;

    const { paymentId, courseId, userId } = await req.json();

    if (!paymentId || !courseId || !userId) {
      return NextResponse.json({ error: 'البيانات غير مكتملة' }, { status: 400 });
    }

    // Run transaction: Update payment status AND create Enrollment
    await prisma.$transaction([
      prisma.payment.update({
        where: { id: paymentId },
        data: { status: 'APPROVED' }
      }),
      // Create enrollment or ignore if it exists
      prisma.enrollment.upsert({
        where: {
          userId_courseId: {
            userId,
            courseId
          }
        },
        update: {}, // if exists, do nothing
        create: {
          userId,
          courseId,
          progress: 0
        }
      })
    ]);

    return NextResponse.json({ message: 'تمت الموافقة وتفعيل الكورس بنجاح' });

  } catch (error) {
    console.error('Approve Payment API Error:', error);
    return NextResponse.json({ error: 'حدث خطأ في الخادم' }, { status: 500 });
  }
}
