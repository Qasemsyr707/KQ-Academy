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

    const instructorId = session.user.id;
    const body = await req.json();
    const { title, description, courseId, scheduledAt, isImmediate, thumbnail } = body;

    if (!title || !courseId) {
      return NextResponse.json({ error: 'Missing title or courseId' }, { status: 400 });
    }

    // Verify course belongs to instructor
    const course = await prisma.course.findUnique({
      where: { id: courseId }
    });

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
        status: isImmediate ? 'live' : 'upcoming'
      }
    });

    return NextResponse.json({ success: true, liveClass });
  } catch (error) {
    console.error('Create Live Class Error:', error);
    return NextResponse.json({ error: 'Failed to create live class' }, { status: 500 });
  }
}
