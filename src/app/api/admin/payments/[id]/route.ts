import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireRoleApi } from '@/lib/rbac';

export async function PATCH(req: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  try {
    const admin = await requireRoleApi(['ADMIN']);
    if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { status } = await req.json(); // 'APPROVED' or 'REJECTED'

    const payment = await prisma.payment.update({
      where: { id: params.id },
      data: { status }
    });

    if (status === 'APPROVED') {
      // Create Enrollment
      await prisma.enrollment.upsert({
        where: {
          userId_courseId: {
            userId: payment.userId,
            courseId: payment.courseId
          }
        },
        create: {
          userId: payment.userId,
          courseId: payment.courseId
        },
        update: {} // already enrolled
      });
    }

    return NextResponse.json({ success: true, payment });
  } catch (error) {
    console.error('Payment Update Error:', error);
    return NextResponse.json({ error: 'Failed to update payment' }, { status: 500 });
  }
}
