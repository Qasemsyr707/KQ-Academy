import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: 'غير مصرح' }, { status: 401 });
    }

    // Only INSTRUCTORS or ADMINs can create coupons
    if ((session.user as any).role !== 'INSTRUCTOR' && (session.user as any).role !== 'ADMIN') {
      return NextResponse.json({ error: 'صلاحيات غير كافية' }, { status: 403 });
    }

    const { code, discount, courseId } = await req.json();

    if (!code || discount === undefined) {
      return NextResponse.json({ error: 'بيانات ناقصة' }, { status: 400 });
    }

    // Check if code exists
    const existing = await prisma.coupon.findUnique({ where: { code } });
    if (existing) {
      return NextResponse.json({ error: 'كود الخصم موجود مسبقاً' }, { status: 400 });
    }

    const coupon = await prisma.coupon.create({
      data: {
        code: code.toUpperCase(),
        discount: parseFloat(discount),
        courseId: courseId || null
      }
    });

    return NextResponse.json({ coupon, message: 'تم إنشاء الكوبون بنجاح' }, { status: 201 });

  } catch (error) {
    console.error('Create Coupon API Error:', error);
    return NextResponse.json({ error: 'حدث خطأ في الخادم' }, { status: 500 });
  }
}
