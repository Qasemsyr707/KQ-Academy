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

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { title, category, type, price, image, instructorId } = body;
    
    // We assume the user exists in our DB, if not we will just use a dummy id or create it
    // Actually the mobile app might still use Firebase UID. 
    // In our Prisma schema, we have a User model, we'll try to find or create one or just link by email/id.
    // For now we will find the first instructor or admin to assign it to avoid foreign key constraint if instructorId is missing.
    
    let dbInstructor = await prisma.user.findFirst({ where: { role: 'INSTRUCTOR' } });
    if (!dbInstructor) {
      dbInstructor = await prisma.user.findFirst();
    }

    const course = await prisma.course.create({
      data: {
        title,
        description: '',
        price: parseFloat(price) || 0,
        instructorId: dbInstructor?.id || 'admin',
        category: category || 'عام',
        thumbnail: image
      }
    });

    return NextResponse.json(course, { status: 201 });
  } catch (error) {
    console.error('Mobile Courses POST API Error:', error);
    return NextResponse.json({ error: 'حدث خطأ في الخادم' }, { status: 500 });
  }
}
