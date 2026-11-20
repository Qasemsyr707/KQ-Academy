import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireRoleApi } from '@/lib/rbac';

export async function POST(req: Request) {
  try {
    // Re-check the user's role and ban status against the database for every write.
    const { authorized, errorResponse, session } = await requireRoleApi(['ADMIN', 'INSTRUCTOR'], 'COURSES');
    if (!authorized) return errorResponse;

    const { title, courseId, isFree = false } = await req.json();

    if (!title || !courseId) {
      return NextResponse.json({ error: 'بيانات ناقصة' }, { status: 400 });
    }

    const course = await prisma.course.findUnique({
      where: { id: courseId },
      select: { instructorId: true },
    });
    if (!course) {
      return NextResponse.json({ error: 'الكورس غير موجود' }, { status: 404 });
    }
    const user = session.user;
    if (course.instructorId !== user.id && !['ADMIN', 'OWNER'].includes(user.role ?? '')) {
      return NextResponse.json({ error: 'غير مصرح بإضافة فصل لهذا الكورس' }, { status: 403 });
    }

    // Determine order
    const existingCount = await prisma.chapter.count({ where: { courseId } });

    const chapter = await prisma.chapter.create({
      data: {
        title,
        courseId,
        order: existingCount,
        isFree
      }
    });

    return NextResponse.json({ chapter, message: 'تم الإضافة بنجاح' }, { status: 201 });

  } catch (error) {
    console.error('Create Chapter API Error:', error);
    return NextResponse.json({ error: 'حدث خطأ في الخادم' }, { status: 500 });
  }
}
