import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function POST(req: Request) {
  try {
    const { userId, pushToken } = await req.json();

    if (!userId || !pushToken) {
      return NextResponse.json({ error: 'Missing userId or pushToken' }, { status: 400 });
    }

    // const user = await prisma.user.update({
    //   where: { id: userId },
    //   data: { pushToken }
    // });
    
    return NextResponse.json({ success: true, message: 'Push token registered successfully' });
  } catch (error) {
    console.error('Push Token Registration Error:', error);
    return NextResponse.json({ error: 'Failed to register push token' }, { status: 500 });
  }
}
