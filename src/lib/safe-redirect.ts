const BASE = 'https://kq.invalid';

/**
 * Accept only a same-site, relative destination for "return after sign-in".
 * Absolute URLs, protocol-relative (`//evil`), backslash tricks (`/\evil`),
 * control characters and API routes are rejected to prevent open redirects.
 */
export function safeCallbackPath(value: unknown): string | null {
  if (typeof value !== 'string' || value.length === 0 || value.length > 512) return null;
  if (!value.startsWith('/') || value.startsWith('//')) return null;
  if (/[\\\u0000-\u001f\u007f]/.test(value)) return null;
  try {
    const url = new URL(value, BASE);
    if (url.origin !== BASE || url.pathname.startsWith('/api/')) return null;
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return null;
  }
}

/** Sign-in / sign-up links that bring the customer back to `next`. */
export function authHref(page: '/login' | '/register', next: string | null | undefined): string {
  const safe = safeCallbackPath(next);
  return safe ? `${page}?callbackUrl=${encodeURIComponent(safe)}` : page;
}
