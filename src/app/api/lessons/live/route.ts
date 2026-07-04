import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    const user = session?.user as any;
    
    if (!session || !user || (user.role !== 'INSTRUCTOR' && user.role !== 'ADMIN' && user.role !== 'OWNER')) {
      return NextResponse.json({ error: 'غير مصرح لك بإجراء هذه العملية' }, { status: 401 });
    }

    const { title, chapterId, liveStartTime, courseId } = await request.json();

    if (!title || !chapterId || !liveStartTime || !courseId) {
      return NextResponse.json({ error: 'البيانات غير مكتملة' }, { status: 400 });
    }

    // Verify course ownership
    const course = await prisma.course.findUnique({
      where: { id: courseId }
    });

    if (!course || (course.instructorId !== user.id && user.role !== 'ADMIN' && user.role !== 'OWNER')) {
      return NextResponse.json({ error: 'الكورس غير موجود أو أنك لا تملك صلاحية إدارته' }, { status: 403 });
    }

    // Generate a unique room name for LiveKit
    const liveRoomName = `room-${courseId}-${Date.now()}`;

    // Get the highest order in this chapter to append at the end
    const lastLesson = await prisma.lesson.findFirst({
      where: { chapterId },
      orderBy: { order: 'desc' }
    });
    
    const newOrder = lastLesson ? lastLesson.order + 1 : 1;

    const newLesson = await prisma.lesson.create({
      data: {
        title,
        chapterId,
        order: newOrder,
        isLive: true,
        liveRoomName,
        liveStartTime: new Date(liveStartTime),
      }
    });

    return NextResponse.json({ message: 'تمت الجدولة بنجاح', lesson: newLesson });
  } catch (error) {
    console.error('Error creating live lesson:', error);
    return NextResponse.json({ error: 'حدث خطأ في الخادم' }, { status: 500 });
  }
}
