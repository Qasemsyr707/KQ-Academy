import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function POST(req: Request) {
  try {
    const { code, courseId } = await req.json();

    if (!code || !courseId) {
      return NextResponse.json({ error: 'بيانات ناقصة' }, { status: 400 });
    }

    const coupon = await prisma.coupon.findUnique({
      where: { code: code.toUpperCase() }
    });

    if (!coupon) {
      return NextResponse.json({ error: 'كود الخصم غير صالح أو غير موجود' }, { status: 404 });
    }

    // Check if coupon is global or specific to this course
    if (coupon.courseId && coupon.courseId !== courseId) {
      return NextResponse.json({ error: 'كود الخصم هذا لا يمكن تطبيقه على هذا الكورس' }, { status: 400 });
    }

    // Get the course to calculate the new price
    const course = await prisma.course.findUnique({ where: { id: courseId } });
    if (!course) {
      return NextResponse.json({ error: 'الكورس غير موجود' }, { status: 404 });
    }

    const discountAmount = (course.price * coupon.discount) / 100;
    const finalPrice = Math.max(0, course.price - discountAmount);

    return NextResponse.json({ 
      couponId: coupon.id,
      discount: coupon.discount, 
      finalPrice,
      message: 'تم تطبيق الخصم بنجاح' 
    }, { status: 200 });

  } catch (error) {
    console.error('Validate Coupon API Error:', error);
    return NextResponse.json({ error: 'حدث خطأ في الخادم' }, { status: 500 });
  }
}
