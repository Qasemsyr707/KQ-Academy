import { prisma } from '@/lib/db';
import { checkoutAvailable } from './availability';

/** Display order of every gateway the platform knows about. */
export const CHECKOUT_METHODS = ['STRIPE', 'PAYPAL', 'TABBY', 'TAMARA', 'WALLET', 'MANUAL'] as const;
export type CheckoutMethod = (typeof CHECKOUT_METHODS)[number];

/**
 * Gateways a customer can actually complete right now: the deployment must
 * support the provider (`checkoutAvailable`) AND the admin switch must not be
 * off. This mirrors the checks performed when the purchase is submitted, so
 * the page never offers a method the server would refuse.
 */
export async function availableCheckoutMethods(): Promise<CheckoutMethod[]> {
  const switches = await prisma.setting.findMany({
    where: { key: { in: CHECKOUT_METHODS.map(method => `ENABLE_${method}`) } },
    select: { key: true, value: true },
  });
  const disabled = new Set(switches.filter(setting => setting.value === 'false').map(setting => setting.key));
  return CHECKOUT_METHODS.filter(method => checkoutAvailable(method) && !disabled.has(`ENABLE_${method}`));
}
