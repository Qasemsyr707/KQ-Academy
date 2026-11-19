import { NextResponse } from 'next/server';
import { suggestCourses } from '@/lib/course-search';
import { limitRequest, RATE_RULES } from '@/lib/rate-limit';

/** Instant search suggestions (courses and categories) for the public catalogue. */
export async function GET(req: Request) {
  const limited = limitRequest(req, RATE_RULES.suggest);
  if (limited) return limited;
  try {
    const q = (new URL(req.url).searchParams.get('q') || '').slice(0, 80);
    return NextResponse.json({ suggestions: await suggestCourses(q) }, { headers: { 'Cache-Control': 'public, max-age=30, s-maxage=30' } });
  } catch (error) {
    console.error('Suggest API Error:', error);
    return NextResponse.json({ suggestions: [] });
  }
}
