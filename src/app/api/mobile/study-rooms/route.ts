import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET(request: Request) {
  try {
    const rooms = await prisma.studyRoom.findMany({
      orderBy: { currentUsers: 'desc' }
    });
    return NextResponse.json(rooms);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch rooms' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { roomId } = await request.json();
    if (!roomId) return NextResponse.json({ error: 'roomId required' }, { status: 400 });

    const room = await prisma.studyRoom.update({
      where: { id: roomId },
      data: { currentUsers: { increment: 1 } }
    });
    return NextResponse.json(room);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to join room' }, { status: 500 });
  }
}
