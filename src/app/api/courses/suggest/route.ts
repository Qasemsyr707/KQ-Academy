import { NextResponse } from 'next/server';
import { suggestCourses, SUGGEST_LIMITS } from '@/lib/course-search';
import { limitRequest, RATE_RULES } from '@/lib/rate-limit';

/**
 * Instant search suggestions: real public courses and the categories that contain
 * them. Public catalogue data only (no per-user data), so a short shared cache is safe.
 */
export async function GET(req: Request) {
  const limited = limitRequest(req, RATE_RULES.suggest);
  if (limited) return limited;
  try {
    const q = (new URL(req.url).searchParams.get('q') || '').slice(0, SUGGEST_LIMITS.maxLength);
    return NextResponse.json({ q, suggestions: await suggestCourses(q) }, {
      headers: { 'Cache-Control': 'public, max-age=30, s-maxage=30' },
    });
  } catch (error) {
    console.error('Suggest API Error:', error);
    return NextResponse.json({ suggestions: [] }, { headers: { 'Cache-Control': 'no-store' } });
  }
}
