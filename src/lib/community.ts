import { NextResponse } from 'next/server';
import { consume, RATE_LIMIT_MESSAGE } from '@/lib/rate-limit';
import { RequestUserError } from '@/lib/request-user';

/** Community input limits (characters). */
export const COMMUNITY_LIMITS = { title: 150, post: 5000, comment: 2000, pageSize: 30, maxPageSize: 50, commentsPerRead: 200 } as const;

/** Per-account write limits: a person posting normally never reaches them; a script does. */
export const COMMUNITY_RATES = {
  write: { name: 'community-write', burst: 8, perMinute: 6 },
  like: { name: 'community-like', burst: 30, perMinute: 60 },
} as const;

export class CommunityError extends Error {
  constructor(public status: number, message: string) { super(message); }
}

export const COMMUNITY_HEADERS = { 'Cache-Control': 'private, no-store' };

/** Plain text in [1, max] characters after trimming; never HTML-processed (React escapes on display). */
export function communityText(value: unknown, max: number, field: string): string {
  if (typeof value !== 'string') throw new CommunityError(400, `${field} مطلوب`);
  const text = value.replace(/\u0000/g, '').trim();
  if (!text) throw new CommunityError(400, `${field} مطلوب`);
  if (text.length > max) throw new CommunityError(400, `${field} أطول من المسموح (${max} حرفاً)`);
  return text;
}

export function limitCommunity(rule: (typeof COMMUNITY_RATES)[keyof typeof COMMUNITY_RATES], userId: string): void {
  if (!consume(rule, `user:${userId}`).allowed) throw new CommunityError(429, RATE_LIMIT_MESSAGE);
}

/** Newest-first page: `limit` (1-50, default 30) and an optional `before` timestamp cursor. */
export function communityPage(url: string): { take: number; before?: Date } {
  const params = new URL(url).searchParams;
  const limit = Number.parseInt(params.get('limit') || '', 10);
  const take = Number.isFinite(limit) ? Math.min(COMMUNITY_LIMITS.maxPageSize, Math.max(1, limit)) : COMMUNITY_LIMITS.pageSize;
  const raw = params.get('before');
  const before = raw ? new Date(raw) : undefined;
  return { take, ...(before && !Number.isNaN(before.getTime()) ? { before } : {}) };
}

/** Known errors keep their message; anything else is logged without details and answered generically. */
export function communityFailure(error: unknown, action: string) {
  if (error instanceof CommunityError || error instanceof RequestUserError) {
    return NextResponse.json({ error: error.message }, { status: error.status, headers: COMMUNITY_HEADERS });
  }
  if (error instanceof SyntaxError) return NextResponse.json({ error: 'بيانات غير صالحة' }, { status: 400, headers: COMMUNITY_HEADERS });
  console.error(`[community] ${action} failed`);
  return NextResponse.json({ error: 'تعذّر إتمام العملية' }, { status: 500, headers: COMMUNITY_HEADERS });
}

export const isStaff = (role: string) => role === 'ADMIN' || role === 'OWNER';
