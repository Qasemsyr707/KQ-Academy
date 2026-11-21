import { NextResponse } from 'next/server';
import { requireRequestUser, RequestUserError } from '@/lib/request-user';
import { prisma } from '@/lib/db';
import { createLiveSession, displayStatus, LiveSessionError } from '@/lib/live-sessions';

const noStore = { 'Cache-Control': 'private, no-store', Vary: 'Cookie, Authorization' };

/** Create a live session now or for later; optional `chapterId` also adds it to the course player. */
export async function POST(req: Request) {
  try {
    const actor = await requireRequestUser(req, ['INSTRUCTOR', 'ADMIN', 'OWNER'], 'LIVE_CLASSES');
    const body = await req.json().catch(() => null);
    if (!body || typeof body !== 'object' || Array.isArray(body)) return NextResponse.json({ error: 'بيانات غير صالحة' }, { status: 400, headers: noStore });
    const liveClass = await createLiveSession(actor, body);
    return NextResponse.json({ success: true, liveClass }, { status: 201, headers: noStore });
  } catch (error) {
    if (error instanceof RequestUserError || error instanceof LiveSessionError) return NextResponse.json({ error: error.message }, { status: error.status, headers: noStore });
    console.error('Create Live Error:', error instanceof Error ? error.message : error);
    return NextResponse.json({ error: 'تعذّر إنشاء جلسة البث' }, { status: 500, headers: noStore });
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

    const now = Date.now();
    return NextResponse.json({ liveClasses: liveClasses.map((c: { status: string; scheduledAt: Date }) => ({ ...c, status: displayStatus(c, now) })) }, { headers: noStore });
  } catch (error) {
    if (error instanceof RequestUserError) return NextResponse.json({ error: error.message }, { status: error.status });
    console.error('Get Live Error:', error);
    return NextResponse.json({ error: 'Failed to fetch live classes' }, { status: 500 });
  }
}
