import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireRoleApi } from '@/lib/rbac';

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { authorized, errorResponse, session } = await requireRoleApi(['ADMIN', 'INSTRUCTOR']);
    if (!authorized) return errorResponse;

    const resolvedParams = await params;
    const courseId = resolvedParams.id;
    const userId = (session.user as any).id;
    const userRole = (session.user as any).role;

    const course = await prisma.course.findUnique({
      where: { id: courseId }
    });

    if (!course) {
      return NextResponse.json({ error: 'الكورس غير موجود' }, { status: 404 });
    }

    if (course.instructorId !== userId && userRole !== 'ADMIN') {
      return NextResponse.json({ error: 'غير مصرح لك بنشر هذا الكورس' }, { status: 403 });
    }

    const updatedCourse = await prisma.course.update({
      where: { id: courseId },
      data: { status: 'PUBLISHED' }
    });

    return NextResponse.json({ success: true, course: updatedCourse });

  } catch (error) {
    console.error('Publish Course Error:', error);
    return NextResponse.json({ error: 'حدث خطأ أثناء نشر الكورس' }, { status: 500 });
  }
}
