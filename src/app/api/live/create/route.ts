import { NextResponse } from 'next/server';
import { requireRequestUser, RequestUserError } from '@/lib/request-user';
import { prisma } from '@/lib/db';

export async function POST(req: Request) {
  try {
    const actor = await requireRequestUser(req, ['INSTRUCTOR', 'ADMIN', 'OWNER'], 'LIVE_CLASSES');
    const instructorId = actor.id;
    const body = await req.json();
    const { title, description, courseId, scheduledAt, isImmediate, thumbnail } = body;

    if (!title || !courseId) {
      return NextResponse.json({ error: 'Missing title or courseId' }, { status: 400 });
    }

    const course = await prisma.course.findUnique({ where: { id: courseId } });
    if (!course || (actor.role === 'INSTRUCTOR' && course.instructorId !== instructorId)) {
      return NextResponse.json({ error: 'Invalid course' }, { status: 403 });
    }

    const liveClass = await prisma.liveClass.create({
      data: {
        title,
        description,
        thumbnail,
        courseId,
        instructorId,
        isImmediate: !!isImmediate,
        scheduledAt: isImmediate ? new Date() : new Date(scheduledAt),
        status: isImmediate ? 'live' : 'upcoming',
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
    if (role === 'INSTRUCTOR') {
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
        where: { courseId: { in: courseIds } },
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
