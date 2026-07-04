import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET() {
  try {
    const courses = await prisma.course.findMany({
      include: {
        instructor: { select: { name: true } },
        chapters: {
          include: { lessons: true, quizzes: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    return NextResponse.json({ courses }, { status: 200 });
  } catch (error) {
    console.error('Mobile Courses API Error:', error);
    return NextResponse.json({ error: 'حدث خطأ في الخادم' }, { status: 500 });
  }
}
