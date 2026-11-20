import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireRoleApi } from '@/lib/rbac';

/**
 * Publish a course. Courses are created published, so for an instructor this only confirms
 * an already published course. A course the administration set to PENDING or REJECTED
 * stays that way until an administrator or the owner publishes it: the instructor must not
 * override a moderation decision from here.
 */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    // Role from the database (checkRole), not the session token.
    const { authorized, errorResponse, session } = await requireRoleApi(['ADMIN', 'INSTRUCTOR'], 'COURSE_PUBLISHING');
    if (!authorized) return errorResponse;

    const resolvedParams = await params;
    const courseId = resolvedParams.id;
    const user = session.user as { id?: string; role?: string };
    const isStaff = ['ADMIN', 'OWNER'].includes(user.role ?? '');

    const course = await prisma.course.findUnique({
      where: { id: courseId }
    });

    if (!course) {
      return NextResponse.json({ error: 'الكورس غير موجود' }, { status: 404 });
    }

    if (course.instructorId !== user.id && !isStaff) {
      return NextResponse.json({ error: 'غير مصرح لك بنشر هذا الكورس' }, { status: 403 });
    }

    if (course.status === 'PUBLISHED') return NextResponse.json({ success: true, course });

    if (!isStaff) {
      return NextResponse.json({ error: 'حالة هذا الكورس بقرار من الإدارة، ولا يمكن نشره إلا من قبل الإدارة' }, { status: 403 });
    }

    // The status condition is part of the write, so a concurrent moderation change is not overwritten blindly.
    const updated = await prisma.course.updateMany({ where: { id: courseId, status: course.status }, data: { status: 'PUBLISHED' } });
    if (updated.count !== 1) return NextResponse.json({ error: 'تغيّرت حالة الكورس، أعد تحميل الصفحة' }, { status: 409 });
    console.info('[courses] published by staff', { courseId, by: user.id, from: course.status });
    const updatedCourse = await prisma.course.findUnique({ where: { id: courseId } });

    return NextResponse.json({ success: true, course: updatedCourse });

  } catch (error) {
    console.error('Publish Course Error:', error);
    return NextResponse.json({ error: 'حدث خطأ أثناء نشر الكورس' }, { status: 500 });
  }
}
