/**
 * In-memory token-bucket limiter for public endpoints that can be scraped or
 * enumerated (catalogue search, certificate verification, certificate
 * rendering). The platform runs as a single container, so process memory is
 * the right store; with several replicas each would limit independently.
 *
 * Limits are deliberately generous: many visitors share one public IP behind
 * mobile-carrier NAT, and a real person typing in the search box or checking a
 * certificate never comes close to them. Each bucket refills continuously.
 */
export interface RateRule {
  /** Separate buckets per rule. */
  name: string;
  /** Requests allowed in a burst. */
  burst: number;
  /** Sustained requests per minute. */
  perMinute: number;
}

export const RATE_RULES = {
  search: { name: 'search', burst: 90, perMinute: 180 },
  suggest: { name: 'suggest', burst: 90, perMinute: 240 },
  verify: { name: 'verify', burst: 30, perMinute: 40 },
  // Rendering a certificate costs real CPU time (image + PDF).
  certificateDocument: { name: 'certificate-document', burst: 12, perMinute: 20 },
} as const satisfies Record<string, RateRule>;

interface Bucket { tokens: number; updated: number }

const buckets = new Map<string, Bucket>();
const MAX_KEYS = 20_000;

function prune(now: number) {
  // Drop buckets that have been full for a while; keep memory bounded.
  for (const [key, bucket] of buckets) {
    if (now - bucket.updated > 10 * 60_000) buckets.delete(key);
  }
  if (buckets.size > MAX_KEYS) {
    const excess = buckets.size - MAX_KEYS;
    let removed = 0;
    for (const key of buckets.keys()) {
      buckets.delete(key);
      if (++removed >= excess) break;
    }
  }
}

/**
 * The visitor's IP as reported by the reverse proxy in front of the app
 * (Coolify's Traefik sets X-Real-Ip and appends to X-Forwarded-For). The
 * right-most forwarded address is the one the proxy saw, so a client cannot
 * pick its own bucket by sending a forged left-most value.
 */
export function clientIp(headers: Pick<Headers, 'get'>): string {
  const real = headers.get('x-real-ip')?.trim();
  if (real) return real.slice(0, 64);
  const forwarded = headers.get('x-forwarded-for');
  if (forwarded) {
    const last = forwarded.split(',').map(part => part.trim()).filter(Boolean).pop();
    if (last) return last.slice(0, 64);
  }
  return 'direct';
}

/** Take one request from the bucket. `retryAfter` is in whole seconds. */
export function consume(rule: RateRule, key: string, now = Date.now()): { allowed: boolean; retryAfter: number } {
  const id = `${rule.name}:${key}`;
  const refillPerMs = rule.perMinute / 60_000;
  const bucket = buckets.get(id) ?? { tokens: rule.burst, updated: now };
  bucket.tokens = Math.min(rule.burst, bucket.tokens + (now - bucket.updated) * refillPerMs);
  bucket.updated = now;
  if (!buckets.has(id)) {
    if (buckets.size >= MAX_KEYS) prune(now);
    buckets.set(id, bucket);
  }
  if (bucket.tokens >= 1) {
    bucket.tokens -= 1;
    return { allowed: true, retryAfter: 0 };
  }
  return { allowed: false, retryAfter: Math.max(1, Math.ceil((1 - bucket.tokens) / refillPerMs / 1000)) };
}

export const RATE_LIMIT_MESSAGE = 'طلبات كثيرة خلال وقت قصير، يرجى المحاولة بعد قليل';

/** For route handlers: a 429 response when the caller is over the limit, otherwise null. */
export function limitRequest(req: Request, rule: RateRule): Response | null {
  const { allowed, retryAfter } = consume(rule, clientIp(req.headers));
  if (allowed) return null;
  return Response.json({ error: RATE_LIMIT_MESSAGE }, {
    status: 429,
    headers: { 'Retry-After': String(retryAfter), 'Cache-Control': 'no-store' },
  });
}

/** Test helper: forget every bucket. */
export function resetRateLimits() {
  buckets.clear();
}
