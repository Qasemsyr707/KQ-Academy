import { timingSafeEqual } from 'node:crypto';
import type { PaymentExpectation, PaymentMetadata, PaymentProof } from './types';

const EXPONENTS: Readonly<Record<string, number>> = {
  USD: 2, SAR: 2, AED: 2, KWD: 3, BHD: 3, OMR: 3,
};

export function objectValue(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown> : null;
}

export function identifier(value: unknown): value is string {
  return typeof value === 'string' && /^[A-Za-z0-9_-]{1,200}$/.test(value);
}

export function currencyCode(value: unknown): string | null {
  return typeof value === 'string' && /^[A-Za-z]{3}$/.test(value) ? value.toUpperCase() : null;
}

export function validExpectation(expected: PaymentExpectation): boolean {
  return identifier(expected.paymentId) && identifier(expected.userId) && identifier(expected.courseId)
    && Number.isSafeInteger(expected.amountMinor) && expected.amountMinor > 0
    && currencyCode(expected.currency) === expected.currency;
}

// Provider amounts are decimal strings or JSON numbers. Never round a mismatched
// payment up to the expected amount, or compare floating-point money directly.
export function decimalMinor(value: unknown, currency: string): number | null {
  const exponent = EXPONENTS[currency];
  if (exponent === undefined || (typeof value !== 'string' && typeof value !== 'number')) return null;
  if (typeof value === 'number' && !Number.isFinite(value)) return null;
  const match = /^(0|[1-9]\d*)(?:\.(\d+))?$/.exec(String(value));
  if (!match || (match[2]?.length ?? 0) > exponent) return null;
  const minor = BigInt(match[1]) * BigInt(10) ** BigInt(exponent)
    + BigInt((match[2] ?? '').padEnd(exponent, '0'));
  return minor <= BigInt(Number.MAX_SAFE_INTEGER) ? Number(minor) : null;
}

export function formatMinor(amountMinor: number, currency: string): string | null {
  const exponent = EXPONENTS[currency];
  if (exponent === undefined || !Number.isSafeInteger(amountMinor) || amountMinor < 0) return null;
  const units = BigInt(amountMinor);
  const factor = BigInt(10) ** BigInt(exponent);
  return `${units / factor}.${String(units % factor).padStart(exponent, '0')}`;
}

export function intentAmount(amount: number, currency: string, metadata: PaymentMetadata): string | null {
  const code = currencyCode(currency);
  if (!validExpectation(metadata) || !code || code !== metadata.currency
      || decimalMinor(amount, code) !== metadata.amountMinor) return null;
  return formatMinor(metadata.amountMinor, code);
}

export function metadataMatches(value: unknown, expected: PaymentExpectation): boolean {
  const metadata = objectValue(value);
  return metadata?.paymentId === expected.paymentId && metadata.userId === expected.userId
    && metadata.courseId === expected.courseId;
}

export function paymentProof(requestedId: string, responseId: unknown, reference: unknown,
  amountMinor: number | null, currency: unknown, expected: PaymentExpectation): PaymentProof | null {
  const code = currencyCode(currency);
  if (!validExpectation(expected) || !identifier(requestedId) || responseId !== requestedId
      || reference !== expected.paymentId || amountMinor !== expected.amountMinor || code !== expected.currency) return null;
  return { transactionId: requestedId, referenceId: expected.paymentId, amountMinor: expected.amountMinor, currency: code };
}

export function constantTimeSecret(expected: string | undefined, received: string | null): boolean {
  if (!expected || !received || expected.length > 4096 || received.length > 4096) return false;
  const a = Buffer.from(expected);
  const b = Buffer.from(received);
  return a.length === b.length && timingSafeEqual(a, b);
}

export function appOrigin(): string | null {
  try {
    const url = new URL(process.env.NEXT_PUBLIC_APP_URL ?? '');
    const local = ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname);
    if (url.username || url.password || url.search || url.hash || url.pathname !== '/') return null;
    if (url.protocol !== 'https:' && !(process.env.NODE_ENV !== 'production' && local && url.protocol === 'http:')) return null;
    return url.origin;
  } catch { return null; }
}

export function checkoutReturnUrl(courseId: string, status: 'pending' | 'cancelled' | 'failed'): string | null {
  const origin = appOrigin();
  if (!origin || !identifier(courseId)) return null;
  const url = new URL('/checkout', origin);
  url.searchParams.set('courseId', courseId);
  url.searchParams.set('status', status);
  return url.toString();
}

export function providerCheckoutUrl(value: unknown, domains: readonly string[]): string | null {
  try {
    if (typeof value !== 'string') return null;
    const url = new URL(value);
    if (url.protocol !== 'https:' || url.username || url.password || url.port
        || !domains.some(domain => url.hostname === domain || url.hostname.endsWith(`.${domain}`))) return null;
    return url.toString();
  } catch { return null; }
}

export function environmentBaseUrl(setting: string | undefined, sandbox: string, production: string): string | null {
  const mode = setting ?? (process.env.NODE_ENV === 'production' ? 'production' : 'sandbox');
  return mode === 'sandbox' ? sandbox : mode === 'production' ? production : null;
}

export function tabbyBaseUrl(): string | null {
  const base = process.env.TABBY_API_BASE_URL ?? 'https://api.tabby.ai';
  return ['https://api.tabby.ai', 'https://api.tabby.sa'].includes(base) ? base : null;
}

export function hasRefunds(value: unknown): boolean {
  return value !== undefined && value !== null && (!Array.isArray(value) || value.length > 0);
}

export function validBuyerPhone(value: string | null): value is string {
  return typeof value === 'string' && /^[+\d][\d ()-]{5,25}$/.test(value);
}

export function apiRequestOptions(): Pick<RequestInit, 'cache' | 'redirect' | 'signal'> {
  return { cache: 'no-store', redirect: 'error', signal: AbortSignal.timeout(15_000) };
}

export async function responseObject(response: Response): Promise<Record<string, unknown> | null> {
  if (!response.ok) return null;
  const body: unknown = await response.json();
  return objectValue(body);
}
