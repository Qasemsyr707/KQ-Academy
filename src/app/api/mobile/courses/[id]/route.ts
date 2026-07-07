import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET(req: Request, props: { params: Promise<{ id: string }> }) {
  try {
    const params = await props.params;
    const course = await prisma.course.findUnique({
      where: { id: params.id },
      include: {
        instructor: { select: { name: true, image: true, id: true } },
        chapters: {
          include: { lessons: true, quizzes: true }
        }
      }
    });

    if (!course) {
      return NextResponse.json({ error: 'الكورس غير موجود' }, { status: 404 });
    }

    return NextResponse.json({ course }, { status: 200 });
  } catch (error) {
    console.error('Mobile Course Detail API Error:', error);
    return NextResponse.json({ error: 'حدث خطأ في الخادم' }, { status: 500 });
  }
}
