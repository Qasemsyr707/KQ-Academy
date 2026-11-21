import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { DEFAULT_SOCIAL_LINKS, isSocialPlatform, SOCIAL_PLATFORMS, validateSocialUrl } from '@/lib/social-links';

/** Public: the active, valid official links in display order. Never a placeholder or broken link. */
export async function GET() {
  try {
    const rows = await prisma.socialLink.findMany({ orderBy: [{ order: 'asc' }, { platform: 'asc' }] });
    const source = rows.length ? rows.filter(row => row.isActive) : DEFAULT_SOCIAL_LINKS;
    const links = source.flatMap(row => {
      if (!isSocialPlatform(row.platform)) return [];
      try { return [{ platform: row.platform, label: SOCIAL_PLATFORMS[row.platform].label, url: validateSocialUrl(row.platform, row.url) }]; }
      catch { return []; }
    });
    return NextResponse.json({ links }, { headers: { 'Cache-Control': 'public, max-age=60, s-maxage=300' } });
  } catch {
    return NextResponse.json({ links: [] }, { headers: { 'Cache-Control': 'no-store' } });
  }
}
