import { NextResponse } from 'next/server';
import { requireRequestUser, RequestUserError } from '@/lib/request-user';
import { managedCoursesWithChapters } from '@/lib/managed-courses';

const headers = { 'Cache-Control': 'private, no-store', Vary: 'Cookie, Authorization' };

/**
 * The courses the signed-in account may manage, with their chapters.
 * `?for=live` checks the LIVE_CLASSES permission (admins), anything else COURSES.
 * Instructors get only their own courses; OWNER and permitted ADMINs get the platform's courses.
 */
export async function GET(req: Request) {
  try {
    const purpose = new URL(req.url).searchParams.get('for') === 'live' ? 'LIVE_CLASSES' : 'COURSES';
    const user = await requireRequestUser(req, ['INSTRUCTOR', 'ADMIN', 'OWNER'], purpose);
    return NextResponse.json({ courses: await managedCoursesWithChapters(user) }, { headers });
  } catch (error) {
    if (error instanceof RequestUserError) return NextResponse.json({ error: error.message }, { status: error.status, headers });
    console.error('[instructor courses]', error instanceof Error ? error.message : error);
    return NextResponse.json({ error: 'تعذّر تحميل الكورسات' }, { status: 500, headers });
  }
}
