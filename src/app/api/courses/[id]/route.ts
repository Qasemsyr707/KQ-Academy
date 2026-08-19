import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireRoleApi } from '@/lib/rbac';

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { authorized, errorResponse, session } = await requireRoleApi(['ADMIN', 'INSTRUCTOR']);
    if (!authorized) return errorResponse;

    const body = await req.json();
    const resolvedParams = await params;
    const { id } = resolvedParams;

    // Verify ownership
    const course = await prisma.course.findUnique({
      where: { id: id },
      select: { instructorId: true }
    });

    if (!course) {
      return NextResponse.json({ error: 'الكورس غير موجود' }, { status: 404 });
    }

    if (course.instructorId !== (session.user as any).id && (session.user as any).role !== 'ADMIN') {
      return NextResponse.json({ error: 'غير مصرح لك بتعديل هذا الكورس' }, { status: 403 });
    }

    // Update the course
    const updatedCourse = await prisma.course.update({
      where: { id: id },
      data: body
    });

    return NextResponse.json(updatedCourse);
  } catch (error) {
    console.error('Update Course API Error:', error);
    return NextResponse.json({ error: 'حدث خطأ في الخادم' }, { status: 500 });
  }
}
