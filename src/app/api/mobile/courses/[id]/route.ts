import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { protectCoursePlaybackLinks } from '@/lib/course-playback-links';
import { getCourseAccess, getCourseViewer } from '@/lib/course-access';
import { mobileCourseSelect } from '@/lib/public-course';

const privateHeaders = { 'Cache-Control': 'private, no-store', 'CDN-Cache-Control': 'no-store', Vary: 'Cookie, Authorization' };

export async function GET(req: Request, props: { params: Promise<{ id: string }> }) {
  try {
    const params = await props.params;
    const course = await prisma.course.findUnique({
      where: { id: params.id },
      select: mobileCourseSelect
    });

    if (!course || (course.status !== 'PUBLISHED'
      && !(await getCourseAccess(course, await getCourseViewer(req))).canView)) {
      return NextResponse.json({ error: 'الكورس غير موجود' }, { status: 404, headers: privateHeaders });
    }

    return NextResponse.json({ course: protectCoursePlaybackLinks(course) }, { status: 200, headers: privateHeaders });
  } catch (error) {
    console.error('Mobile Course Detail API Error:', error);
    return NextResponse.json({ error: 'حدث خطأ في الخادم' }, { status: 500, headers: privateHeaders });
  }
}
