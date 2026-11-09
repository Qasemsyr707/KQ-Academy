import { appOrigin } from './provider-validation';

/** Course checkout currently prices online purchases in USD only. */
export function checkoutAvailable(provider: string): boolean {
  if (provider === 'STRIPE') return Boolean(process.env.STRIPE_SECRET_KEY && process.env.STRIPE_WEBHOOK_SECRET && appOrigin());
  if (provider === 'MANUAL' || provider === 'WALLET') return true;
  // PayPal still needs a trusted capture lifecycle. Tabby/Tamara need supported
  // currency pricing. Keep their verification adapters; do not accept new orders.
  return false;
}
