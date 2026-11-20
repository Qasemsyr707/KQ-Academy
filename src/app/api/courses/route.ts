import { hasPermission } from '@/lib/permission-check';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireRoleApi } from '@/lib/rbac';
import { notifyCourseReviewers } from '@/lib/course-change-request';

export async function POST(req: Request) {
  try {
    const { authorized, errorResponse, session } = await requireRoleApi(['ADMIN', 'INSTRUCTOR'], 'COURSES');
    if (!authorized) return errorResponse;

    const { title, description, type, price, priceSYP, category, thumbnail, includes } = await req.json();

    if (!title) {
      return NextResponse.json({ error: 'عنوان الكورس مطلوب' }, { status: 400 });
    }

    const userId = (session.user as any).id;

    const course = await prisma.course.create({
      data: {
        title,
        description,
        type: type || 'SKILL',
        price: Number(price) || 0,
        priceSYP: Number(priceSYP) || 0,
        category,
        instructorId: userId,
        // Instructor courses, and those of administrators without the review permission, wait for approval.
        status: session.user.role === 'OWNER' || (session.user.role === 'ADMIN' && await hasPermission(session.user.id, 'COURSE_PUBLISHING')) ? 'PUBLISHED' : 'PENDING',
        thumbnail: thumbnail || `linear-gradient(135deg, #${Math.floor(Math.random()*16777215).toString(16)} 0%, #0f172a 100%)`,
        includes: includes || null
      }
    });

    if (course.status === 'PENDING') {
      await notifyCourseReviewers('كورس جديد بانتظار المراجعة', `«${course.title}» بانتظار الموافقة قبل نشره`, '/admin/course-requests')
        .catch(error => console.error('[courses] notify reviewers', error));
    }
    return NextResponse.json({ course, message: course.status === 'PENDING' ? 'تم إنشاء الكورس، وسيظهر للطلاب بعد موافقة الإدارة' : 'تم إنشاء الكورس بنجاح' }, { status: 201 });

  } catch (error) {
    console.error('Create Course API Error:', error);
    return NextResponse.json({ error: 'حدث خطأ في الخادم' }, { status: 500 });
  }
}
