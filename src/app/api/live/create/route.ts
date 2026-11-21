import { NextResponse } from 'next/server';
import { requireRequestUser, RequestUserError } from '@/lib/request-user';
import { prisma } from '@/lib/db';

export async function POST(req: Request) {
  try {
    const actor = await requireRequestUser(req, ['INSTRUCTOR', 'ADMIN', 'OWNER'], 'LIVE_CLASSES');
    const instructorId = actor.id;
    const body = await req.json();
    const { title, description, courseId, scheduledAt, isImmediate, thumbnail } = body;

    if (typeof title !== 'string' || !title.trim() || title.length > 200 || typeof courseId !== 'string' || !courseId) {
      return NextResponse.json({ error: 'العنوان والكورس مطلوبان' }, { status: 400 });
    }
    const when = isImmediate ? new Date() : new Date(scheduledAt);
    if (Number.isNaN(when.getTime())) return NextResponse.json({ error: 'موعد الجلسة غير صالح' }, { status: 400 });

    const course = await prisma.course.findUnique({ where: { id: courseId } });
    if (!course || (actor.role === 'INSTRUCTOR' && course.instructorId !== instructorId)) {
      return NextResponse.json({ error: 'الكورس غير موجود أو لا تملك صلاحية إدارته' }, { status: 403 });
    }
    // The host's open-session quota (User.maxLiveStreams, set by administrators).
    const host = await prisma.user.findUnique({ where: { id: instructorId }, select: { maxLiveStreams: true } });
    const open = await prisma.liveClass.count({ where: { instructorId, status: { in: ['upcoming', 'live'] } } });
    if (host && open >= host.maxLiveStreams) {
      return NextResponse.json({ error: `وصلت إلى الحد الأقصى للجلسات المفتوحة (${host.maxLiveStreams}). أنهِ أو ألغِ جلسة قبل إنشاء أخرى.` }, { status: 409 });
    }

    const liveClass = await prisma.liveClass.create({
      data: {
        title: title.trim(),
        description: typeof description === 'string' ? description.slice(0, 5000) : null,
        thumbnail: typeof thumbnail === 'string' && thumbnail.startsWith('https://') ? thumbnail : null,
        courseId,
        instructorId,
        isImmediate: !!isImmediate,
        scheduledAt: when,
        // LIVE only once the host's studio has really connected (PATCH /api/live/[id] start).
        status: 'upcoming',
      },
    });

    return NextResponse.json({ success: true, liveClass });
  } catch (error) {
    if (error instanceof RequestUserError) return NextResponse.json({ error: error.message }, { status: error.status });
    console.error('Create Live Error:', error);
    return NextResponse.json({ error: 'Failed to create live class' }, { status: 500 });
  }
}

export async function GET(req: Request) {
  try {
    const user = await requireRequestUser(req);
    const userId = user.id;
    const role = user.role;

    let liveClasses;
    const visible = { status: { in: ['upcoming', 'live', 'ended'] } };
    if (role === 'OWNER' || role === 'ADMIN') {
      liveClasses = await prisma.liveClass.findMany({
        where: visible, take: 200,
        include: { instructor: { select: { name: true, image: true } }, course: { select: { title: true } } },
        orderBy: { scheduledAt: 'desc' },
      });
    } else if (role === 'INSTRUCTOR') {
      liveClasses = await prisma.liveClass.findMany({
        where: { instructorId: userId },
        include: { instructor: { select: { name: true, image: true } }, course: { select: { title: true } } },
        orderBy: { scheduledAt: 'asc' },
      });
    } else {
      // Students: only classes linked to their enrolled courses
      const enrollments = await prisma.enrollment.findMany({ where: { userId }, select: { courseId: true } });
      const courseIds = enrollments.map((e: any) => e.courseId);
      liveClasses = await prisma.liveClass.findMany({
        where: { courseId: { in: courseIds }, ...visible },
        include: { instructor: { select: { name: true, image: true } }, course: { select: { title: true } } },
        orderBy: { scheduledAt: 'asc' },
      });
    }

    return NextResponse.json({ liveClasses });
  } catch (error) {
    if (error instanceof RequestUserError) return NextResponse.json({ error: error.message }, { status: error.status });
    console.error('Get Live Error:', error);
    return NextResponse.json({ error: 'Failed to fetch live classes' }, { status: 500 });
  }
}
