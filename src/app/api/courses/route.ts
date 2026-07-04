import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireRoleApi } from '@/lib/rbac';

export async function POST(req: Request) {
  try {
    const { authorized, errorResponse, session } = await requireRoleApi(['ADMIN', 'INSTRUCTOR']);
    if (!authorized) return errorResponse;

    const { title, description, price, priceSYP, category } = await req.json();

    if (!title) {
      return NextResponse.json({ error: 'عنوان الكورس مطلوب' }, { status: 400 });
    }

    const userId = (session.user as any).id;

    const course = await prisma.course.create({
      data: {
        title,
        description,
        price,
        priceSYP,
        category,
        instructorId: userId,
        // Mocking a default thumbnail gradient based on title length just for aesthetics
        thumbnail: `linear-gradient(135deg, #${Math.floor(Math.random()*16777215).toString(16)} 0%, #0f172a 100%)`
      }
    });

    return NextResponse.json({ course, message: 'تم إنشاء الكورس بنجاح' }, { status: 201 });

  } catch (error) {
    console.error('Create Course API Error:', error);
    return NextResponse.json({ error: 'حدث خطأ في الخادم' }, { status: 500 });
  }
}
