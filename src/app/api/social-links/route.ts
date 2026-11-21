import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { DEFAULT_SOCIAL_LINKS, isSocialPlatform, SOCIAL_PLATFORMS, validateSocialUrl } from '@/lib/social-links';

// Links change from /admin/social without a build or deployment. No CDN/browser caching.
export const dynamic = 'force-dynamic';
export const revalidate = 0;
const headers = { 'Cache-Control': 'no-store, no-cache, must-revalidate' };

/** Public list: only active and validated URLs. Never expose a secret or a private setting. */
export async function GET() {
  try {
    const rows = await prisma.socialLink.findMany({ orderBy: [{ order: 'asc' }, { platform: 'asc' }] });
    // Preserve the existing public Facebook fallback for untouched installations. If ANY real
    // links were saved, never use fallback: inactive links must remain hidden.
    const source = rows.length ? rows.filter(row => row.isActive) : DEFAULT_SOCIAL_LINKS;
    const links = source.flatMap(row => {
      if (!isSocialPlatform(row.platform)) return [];
      try {
        return [{ platform: row.platform, label: SOCIAL_PLATFORMS[row.platform].label,
          url: validateSocialUrl(row.platform, row.url) }];
      } catch (error) {
        console.warn('[social-links] invalid saved URL for', row.platform,
          error instanceof Error ? error.message : 'invalid');
        return [];
      }
    });
    return NextResponse.json({ links }, { headers });
  } catch (error) {
    console.error('[social-links] database lookup failed', error instanceof Error ? error.message : 'unknown');
    return NextResponse.json({ links: [], error: 'links-unavailable' }, { status: 503, headers });
  }
}
