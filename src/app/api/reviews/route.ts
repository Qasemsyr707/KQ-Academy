import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: 'يجب تسجيل الدخول لترك تقييم' }, { status: 401 });
    }

    const { courseId, rating, comment } = await req.json();

    if (!courseId || !rating) {
      return NextResponse.json({ error: 'التقييم مطلوب' }, { status: 400 });
    }

    const userId = (session.user as any).id;

    // Optional: check if user is actually enrolled
    const enrollment = await prisma.enrollment.findUnique({
      where: {
        userId_courseId: { userId, courseId }
      }
    });

    if (!enrollment) {
      return NextResponse.json({ error: 'لا يمكنك تقييم كورس لم تقم بشرائه' }, { status: 403 });
    }

    // Check if user already reviewed
    const existingReview = await prisma.review.findFirst({
      where: { userId, courseId }
    });

    if (existingReview) {
      // Update existing
      await prisma.review.update({
        where: { id: existingReview.id },
        data: { rating, comment }
      });
    } else {
      // Create new
      await prisma.review.create({
        data: {
          rating,
          comment,
          userId,
          courseId
        }
      });
    }

    // Update course average rating
    const allReviews = await prisma.review.findMany({
      where: { courseId }
    });
    const avgRating = allReviews.reduce((acc, curr) => acc + curr.rating, 0) / allReviews.length;

    await prisma.course.update({
      where: { id: courseId },
      data: { rating: avgRating }
    });

    return NextResponse.json({ message: 'تم إضافة التقييم بنجاح، شكراً لك!' }, { status: 201 });

  } catch (error) {
    console.error('Review API Error:', error);
    return NextResponse.json({ error: 'حدث خطأ في الخادم' }, { status: 500 });
  }
}
