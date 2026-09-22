import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || (session.user as any).role !== 'INSTRUCTOR') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const instructorId = (session.user as any).id;
    const body = await req.json();
    const { title, description, courseId, scheduledAt, isImmediate, thumbnail } = body;

    if (!title || !courseId) {
      return NextResponse.json({ error: 'Missing title or courseId' }, { status: 400 });
    }

    const course = await prisma.course.findUnique({ where: { id: courseId } });
    if (!course || course.instructorId !== instructorId) {
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
    console.error('Create Live Error:', error);
    return NextResponse.json({ error: 'Failed to create live class' }, { status: 500 });
  }
}

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const userId = (session.user as any).id;
    const role = (session.user as any).role;

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
    console.error('Get Live Error:', error);
    return NextResponse.json({ error: 'Failed to fetch live classes' }, { status: 500 });
  }
}
