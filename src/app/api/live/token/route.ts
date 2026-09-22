import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { AccessToken } from 'livekit-server-sdk';

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = (session.user as any).id;
    const { searchParams } = new URL(req.url);
    const liveClassId = searchParams.get('id');

    if (!liveClassId) {
      return NextResponse.json({ error: 'Live class ID is required' }, { status: 400 });
    }

    const liveClass = await prisma.liveClass.findUnique({ where: { id: liveClassId } });
    if (!liveClass) {
      return NextResponse.json({ error: 'Live class not found' }, { status: 404 });
    }

    const isInstructor = liveClass.instructorId === userId;

    if (!isInstructor) {
      const enrollment = await prisma.enrollment.findUnique({
        where: { userId_courseId: { userId, courseId: liveClass.courseId } },
      });
      if (!enrollment) {
        return NextResponse.json({ error: 'Not enrolled in this course' }, { status: 403 });
      }
    }

    const roomName = `live_${liveClass.id}`;
    const at = new AccessToken(
      process.env.LIVEKIT_API_KEY!,
      process.env.LIVEKIT_API_SECRET!,
      { identity: userId, name: (session.user as any).name || 'مستخدم' }
    );

    at.addGrant({
      roomJoin: true,
      room: roomName,
      canPublish: isInstructor,
      canPublishData: true,
      canSubscribe: true,
    });

    const token = await at.toJwt();
    return NextResponse.json({ token, roomName });
  } catch (error) {
    console.error('LiveKit Token Error:', error);
    return NextResponse.json({ error: 'Failed to generate token' }, { status: 500 });
  }
}
