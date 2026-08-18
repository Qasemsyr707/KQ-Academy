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

    // Fetch payment to get course and amount
    const payment = await prisma.payment.findUnique({
      where: { id: paymentId },
      include: { course: true }
    });

    if (!payment) {
      return NextResponse.json({ error: 'الدفعة غير موجودة' }, { status: 404 });
    }

    if (payment.status === 'APPROVED') {
      return NextResponse.json({ error: 'تمت الموافقة على هذه الدفعة مسبقاً' }, { status: 400 });
    }

    // Determine currency based on amount (hacky but works since we don't store currency)
    const isSYP = payment.amount >= 10000;

    // Run transaction: Update payment status, create Enrollment, Update instructor wallet
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
      }),
      // Increment instructor's wallet
      prisma.user.update({
        where: { id: payment.course.instructorId },
        data: {
          walletSYP: isSYP ? { increment: payment.amount } : undefined,
          walletUSD: !isSYP ? { increment: payment.amount } : undefined,
        }
      })
    ]);

    return NextResponse.json({ message: 'تمت الموافقة وتفعيل الكورس بنجاح' });

  } catch (error) {
    console.error('Approve Payment API Error:', error);
    return NextResponse.json({ error: 'حدث خطأ في الخادم' }, { status: 500 });
  }
}
