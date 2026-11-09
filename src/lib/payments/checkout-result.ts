export type CheckoutResult = { kind: 'enrolled' } | { kind: 'pending' } | { kind: 'redirect'; url: string };

/** An HTTP 200 or a return URL never means that the learner owns a course. */
export function checkoutResult(value: unknown, provider: string): CheckoutResult {
  const body = value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : null;
  if (body?.alreadyEnrolled === true && body.status === 'APPROVED') return { kind: 'enrolled' };
  if (body?.success !== true || body.status !== 'PENDING') throw new Error('تعذّر تأكيد حالة طلب الدفع');
  if (provider === 'MANUAL' && body.pending === true) return { kind: 'pending' };
  const domains: Readonly<Record<string, readonly string[]>> = {
    STRIPE: ['checkout.stripe.com'], PAYPAL: ['www.paypal.com', 'www.sandbox.paypal.com'],
    TABBY: ['tabby.ai', 'tabby.sa'], TAMARA: ['tamara.co'],
  };
  try {
    const input = body.redirectUrl ?? body.url;
    if (typeof input !== 'string') throw new Error();
    const url = new URL(input);
    if (url.protocol !== 'https:' || url.username || url.password || url.port
      || !(domains[provider] ?? []).some(domain => url.hostname === domain || url.hostname.endsWith(`.${domain}`))) throw new Error();
    return { kind: 'redirect', url: url.toString() };
  } catch { throw new Error('تعذّر الحصول على رابط دفع صالح'); }
}
