export interface CheckoutContext {
  version: 1;
  paymentId: string;
  userId: string;
  courseId: string;
  currency: 'USD' | 'SYP';
  amountMinor: number;
  state: 'CREATING' | 'READY' | 'VERIFIED';
  checkoutUrl?: string;
}

export class CheckoutError extends Error {
  constructor(public readonly status: number, message: string) { super(message); }
}

export function amountInMinorUnits(amount: number): number {
  const minor = Math.round(amount * 100);
  if (!Number.isFinite(amount) || amount <= 0 || !Number.isSafeInteger(minor) || minor <= 0) {
    throw new CheckoutError(400, 'قيمة الدفع غير صالحة');
  }
  return minor;
}

/** Legacy pending records lack a trustworthy currency/reference snapshot. */
export function readCheckoutContext(payment: {
  id: string; userId: string; courseId: string; amount: number; providerResponse: string | null;
}): CheckoutContext | null {
  if (!payment.providerResponse) return null;
  try {
    const value: unknown = JSON.parse(payment.providerResponse);
    if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
    const context = value as Record<string, unknown>;
    if (context.version !== 1 || context.paymentId !== payment.id || context.userId !== payment.userId
      || context.courseId !== payment.courseId || !['USD', 'SYP'].includes(String(context.currency))
      || !Number.isSafeInteger(context.amountMinor) || context.amountMinor !== amountInMinorUnits(payment.amount)
      || !['CREATING', 'READY', 'VERIFIED'].includes(String(context.state))
      || (context.checkoutUrl !== undefined && typeof context.checkoutUrl !== 'string')) return null;
    return context as unknown as CheckoutContext;
  } catch { return null; }
}
