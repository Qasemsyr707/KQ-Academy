import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireRoleApi } from '@/lib/rbac';

export async function PATCH(req: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  try {
    const admin = await requireRoleApi(['ADMIN']);
    if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { status } = await req.json(); // 'APPROVED' or 'REJECTED'

    const payment = await prisma.payment.findUnique({
      where: { id: params.id },
      include: { course: true }
    });

    if (!payment) return NextResponse.json({ error: 'الدفعة غير موجودة' }, { status: 404 });
    if (payment.status === status) return NextResponse.json({ success: true, payment });

    const updatedPayment = await prisma.payment.update({
      where: { id: params.id },
      data: { status }
    });

    if (status === 'APPROVED') {
      const isSYP = updatedPayment.amount >= 10000;
      await prisma.$transaction([
        // Create Enrollment
        prisma.enrollment.upsert({
          where: {
            userId_courseId: {
              userId: updatedPayment.userId,
              courseId: updatedPayment.courseId
            }
          },
          create: {
            userId: updatedPayment.userId,
            courseId: updatedPayment.courseId
          },
          update: {} // already enrolled
        }),
        // Increment instructor's wallet
        prisma.user.update({
          where: { id: payment.course.instructorId },
          data: {
            walletSYP: isSYP ? { increment: updatedPayment.amount } : undefined,
            walletUSD: !isSYP ? { increment: updatedPayment.amount } : undefined,
          }
        })
      ]);
    }

    return NextResponse.json({ success: true, payment });
  } catch (error) {
    console.error('Payment Update Error:', error);
    return NextResponse.json({ error: 'Failed to update payment' }, { status: 500 });
  }
}
