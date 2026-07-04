import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || !session.user) {
      return NextResponse.json({ error: 'يجب تسجيل الدخول لإتمام عملية الشراء' }, { status: 401 });
    }

    const { paymentMethod, amount, courseId, receiptImageBase64 } = await req.json();

    if (!paymentMethod || !courseId) {
      return NextResponse.json({ error: 'البيانات غير مكتملة' }, { status: 400 });
    }

    // Check if course exists
    const course = await prisma.course.findUnique({
      where: { id: courseId }
    });

    if (!course) {
      return NextResponse.json({ error: 'الكورس غير موجود' }, { status: 404 });
    }

    // Check if user already bought it
    const existingPayment = await prisma.payment.findFirst({
      where: {
        userId: (session.user as any).id,
        courseId: courseId,
        status: { in: ['PENDING', 'APPROVED'] }
      }
    });

    if (existingPayment) {
      return NextResponse.json({ error: 'لقد قمت بشراء هذا الكورس مسبقاً أو يوجد طلب قيد المراجعة' }, { status: 400 });
    }

    // Create the payment record
    const payment = await prisma.payment.create({
      data: {
        amount: parseFloat(amount) || course.price,
        paymentMethod,
        receiptImage: receiptImageBase64 || '/images/mock-receipt.jpg', // In a real app, upload to S3
        status: 'PENDING',
        userId: (session.user as any).id,
        courseId,
      }
    });

    return NextResponse.json({ message: 'تم إرسال الطلب بنجاح وهو قيد المراجعة', paymentId: payment.id }, { status: 201 });

  } catch (error) {
    console.error('Checkout API Error:', error);
    return NextResponse.json({ error: 'حدث خطأ في الخادم' }, { status: 500 });
  }
}
