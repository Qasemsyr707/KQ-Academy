import Stripe from 'stripe';
import type { IPaymentGateway, PaymentExpectation, PaymentIntentResponse, PaymentMetadata, PaymentProof } from '../types';
import {
  checkoutReturnUrl, currencyCode, identifier, intentAmount, metadataMatches,
  paymentProof, providerCheckoutUrl, validExpectation,
} from '../provider-validation';

export class StripeAdapter implements IPaymentGateway {
  private readonly stripe: Stripe | null;
  private readonly key = process.env.STRIPE_SECRET_KEY;

  constructor() {
    // Use the installed SDK's supported API version; do not cast an old version.
    this.stripe = this.key ? new Stripe(this.key, { timeout: 15_000, maxNetworkRetries: 0 }) : null;
  }

  private correctMode(livemode: unknown): boolean {
    if (typeof livemode !== 'boolean') return false;
    if (this.key?.startsWith('sk_test_') || this.key?.startsWith('rk_test_')) return !livemode;
    if (this.key?.startsWith('sk_live_') || this.key?.startsWith('rk_live_')) return livemode;
    return false;
  }

  async createPaymentIntent(amount: number, currency: string, metadata: PaymentMetadata): Promise<PaymentIntentResponse> {
    if (currencyCode(currency) !== 'USD') return { success: false, error: 'عملة الدفع غير مدعومة لدى البوابة المحددة' };
    const successUrl = checkoutReturnUrl(metadata.courseId, 'pending');
    const cancelUrl = checkoutReturnUrl(metadata.courseId, 'cancelled');
    if (!this.stripe || !process.env.STRIPE_WEBHOOK_SECRET || !successUrl || !cancelUrl) {
      return { success: false, error: 'بوابة الدفع غير مهيأة حالياً' };
    }
    if (!intentAmount(amount, currency, metadata)) return { success: false, error: 'بيانات طلب الدفع غير صالحة' };

    try {
      const binding = { paymentId: metadata.paymentId, userId: metadata.userId, courseId: metadata.courseId };
      const session = await this.stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        line_items: [{
          price_data: { currency: 'usd', product_data: { name: metadata.courseName }, unit_amount: metadata.amountMinor },
          quantity: 1,
        }],
        mode: 'payment',
        client_reference_id: metadata.paymentId,
        customer_email: metadata.userEmail,
        metadata: binding,
        payment_intent_data: { metadata: binding },
        success_url: successUrl,
        cancel_url: cancelUrl,
      }, { idempotencyKey: metadata.paymentId });
      const url = providerCheckoutUrl(session.url, ['checkout.stripe.com']);
      if (!identifier(session.id) || !url || !this.correctMode(session.livemode)) {
        return { success: false, error: 'تعذّر بدء الدفع، يرجى المحاولة مجدداً' };
      }
      return { success: true, transactionId: session.id, checkoutUrl: url };
    } catch { return { success: false, error: 'تعذّر بدء الدفع، يرجى المحاولة مجدداً' }; }
  }

  async verifyPayment(transactionId: string, expected: PaymentExpectation): Promise<PaymentProof | null> {
    if (!this.stripe || !identifier(transactionId) || !validExpectation(expected) || expected.currency !== 'USD') return null;
    try {
      const session = await this.stripe.checkout.sessions.retrieve(transactionId, { expand: ['payment_intent.latest_charge'] });
      if (session.status !== 'complete' || session.mode !== 'payment' || session.payment_status !== 'paid'
          || !this.correctMode(session.livemode) || !metadataMatches(session.metadata, expected)) return null;
      const intent = session.payment_intent;
      if (!intent || typeof intent === 'string' || intent.status !== 'succeeded'
          || intent.amount_received !== expected.amountMinor || currencyCode(intent.currency) !== expected.currency
          || !metadataMatches(intent.metadata, expected)) return null;
      const charge = intent.latest_charge;
      if (!charge || typeof charge === 'string' || !charge.paid || charge.status !== 'succeeded'
          || charge.refunded || charge.amount_refunded !== 0 || charge.disputed
          || charge.amount_captured !== expected.amountMinor || currencyCode(charge.currency) !== expected.currency) return null;
      return paymentProof(transactionId, session.id, session.client_reference_id, session.amount_total, session.currency, expected);
    } catch { return null; }
  }

  async verifyWebhook(req: Request, rawBody: string): Promise<boolean> {
    const secret = process.env.STRIPE_WEBHOOK_SECRET;
    const signature = req.headers.get('stripe-signature');
    if (!this.stripe || !secret || !signature || req.method !== 'POST' || rawBody.length > 1_000_000) return false;
    try {
      const event = this.stripe.webhooks.constructEvent(rawBody, signature, secret);
      return this.correctMode(event.livemode);
    } catch { return false; }
  }
}
