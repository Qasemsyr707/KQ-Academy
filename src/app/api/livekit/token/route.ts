import { NextResponse } from 'next/server';
import { AccessToken } from 'livekit-server-sdk';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'غير مصرح لك بالدخول' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const room = searchParams.get('room');

    if (!room) {
      return NextResponse.json({ error: 'لم يتم تحديد الغرفة' }, { status: 400 });
    }

    const apiKey = process.env.LIVEKIT_API_KEY;
    const apiSecret = process.env.LIVEKIT_API_SECRET;

    if (!apiKey || !apiSecret) {
      return NextResponse.json({ 
        error: 'لم يتم إعداد مفاتيح LiveKit بعد. يرجى إضافة LIVEKIT_API_KEY و LIVEKIT_API_SECRET في البيئة.' 
      }, { status: 500 });
    }

    const at = new AccessToken(apiKey, apiSecret, {
      identity: session.user?.id || 'user-' + Date.now(),
      name: session.user?.name || 'مستخدم',
    });

    const isInstructor = session.user?.role === 'INSTRUCTOR' || session.user?.role === 'ADMIN';

    at.addGrant({ 
      roomJoin: true, 
      room: room,
      canPublish: isInstructor,
      canSubscribe: true
    });

    const token = await at.toJwt();

    return NextResponse.json({ token });
  } catch (error) {
    console.error('LiveKit Token Error:', error);
    return NextResponse.json({ error: 'حدث خطأ في الخادم' }, { status: 500 });
  }
}
