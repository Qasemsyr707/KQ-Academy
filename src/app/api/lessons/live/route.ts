import { NextResponse } from 'next/server';
import { requireRequestUser, RequestUserError } from '@/lib/request-user';
import { createLiveSession, LiveSessionError } from '@/lib/live-sessions';

const headers = { 'Cache-Control': 'private, no-store' };

/**
 * Older clients scheduled a live *lesson* here. It now creates the same unified session as
 * /api/live/create (a LiveClass plus its chapter lesson), so no second kind of record exists.
 */
export async function POST(request: Request) {
  try {
    const actor = await requireRequestUser(request, ['INSTRUCTOR', 'ADMIN', 'OWNER'], 'LIVE_CLASSES');
    const body = await request.json().catch(() => null);
    if (!body || typeof body !== 'object' || typeof body.chapterId !== 'string' || !body.chapterId) {
      return NextResponse.json({ error: 'البيانات غير مكتملة' }, { status: 400, headers });
    }
    const liveClass = await createLiveSession(actor, { ...body, scheduledAt: body.liveStartTime ?? body.scheduledAt });
    return NextResponse.json({ message: 'تمت الجدولة بنجاح', liveClass, lessonId: liveClass.lessonId }, { status: 201, headers });
  } catch (error) {
    if (error instanceof RequestUserError || error instanceof LiveSessionError) return NextResponse.json({ error: error.message }, { status: error.status, headers });
    console.error('Error creating live lesson:', error instanceof Error ? error.message : error);
    return NextResponse.json({ error: 'حدث خطأ في الخادم' }, { status: 500, headers });
  }
}
