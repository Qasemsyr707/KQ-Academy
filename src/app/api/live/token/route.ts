import { NextResponse } from 'next/server';
import { AccessToken } from 'livekit-server-sdk';
import { checkRole } from '@/lib/rbac';

export async function GET(req: Request) {
  try {
    const { authorized, email, session, isOwner } = await checkRole(['ADMIN', 'INSTRUCTOR']);
    const { searchParams } = new URL(req.url);
    const room = searchParams.get('room');
    
    // Default username if not logged in
    const username = session?.user?.name || `Student_${Math.floor(Math.random() * 1000)}`;
    const canPublish = authorized; // Only INSTRUCTOR, ADMIN, or OWNER can publish

    if (!room) {
      return NextResponse.json({ error: 'Missing room name' }, { status: 400 });
    }

    const apiKey = process.env.LIVEKIT_API_KEY;
    const apiSecret = process.env.LIVEKIT_API_SECRET;

    if (!apiKey || !apiSecret) {
      // Return a simulated demo state if keys are missing
      return NextResponse.json({ 
        demoMode: true, 
        message: 'LiveKit keys are missing. Running in UI Demo mode.' 
      }, { status: 200 });
    }

    const at = new AccessToken(apiKey, apiSecret, {
      identity: username,
    });

    at.addGrant({ 
      room, 
      roomJoin: true, 
      canPublish, // Only instructors/admin/owner can publish
      canSubscribe: true 
    });

    return NextResponse.json({ token: await at.toJwt() }, { status: 200 });
  } catch (error) {
    console.error('LiveKit Token Error:', error);
    return NextResponse.json({ error: 'Failed to generate token' }, { status: 500 });
  }
}
