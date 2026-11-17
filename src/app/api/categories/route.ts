import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { activeCategories } from '@/lib/course-taxonomy';
import { limitRequest, RATE_RULES } from '@/lib/rate-limit';

/** Active categories for the course forms. Public data (names only), cached briefly. */
export async function GET(req: Request) {
  const limited = limitRequest(req, RATE_RULES.categories);
  if (limited) return limited;
  try {
    return NextResponse.json({ categories: await activeCategories(prisma) }, {
      headers: { 'Cache-Control': 'public, max-age=60, s-maxage=60' },
    });
  } catch (error) {
    console.error('[categories] list', error);
    return NextResponse.json({ error: 'تعذّر تحميل التصنيفات' }, { status: 500, headers: { 'Cache-Control': 'no-store' } });
  }
}
