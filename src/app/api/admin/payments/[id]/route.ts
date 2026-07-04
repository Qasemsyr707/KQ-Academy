import { NextResponse } from 'next/server';
import { requireRoleApi } from '@/lib/rbac';
import { prisma } from '@/lib/db';

export async function PATCH(req: Request, props: { params: Promise<{ id: string }> }) {
  try {
    const { authorized, errorResponse } = await requireRoleApi(['ADMIN']);
    if (!authorized) return errorResponse;

    const params = await props.params;
    const { status } = await req.json();

    const payment = await prisma.payment.update({
      where: { id: params.id },
      data: { status }
    });

    // If APPROVED, enroll the user in the course
    if (status === 'APPROVED') {
      await prisma.enrollment.upsert({
        where: {
          userId_courseId: {
            userId: payment.userId,
            courseId: payment.courseId
          }
        },
        update: {},
        create: {
          userId: payment.userId,
          courseId: payment.courseId,
          progress: 0
        }
      });
    }

    return NextResponse.json({ message: 'تم تحديث حالة الدفع بنجاح' }, { status: 200 });
  } catch (error) {
    console.error('Update Payment API Error:', error);
    return NextResponse.json({ error: 'حدث خطأ في الخادم' }, { status: 500 });
  }
}
