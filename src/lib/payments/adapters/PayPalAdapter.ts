import { createHash } from 'node:crypto';
import type { IPaymentGateway, PaymentExpectation, PaymentIntentResponse, PaymentMetadata, PaymentProof } from '../types';
import {
  apiRequestOptions, checkoutReturnUrl, currencyCode, decimalMinor, environmentBaseUrl,
  hasRefunds, identifier, intentAmount, objectValue, paymentProof,
  providerCheckoutUrl, responseObject, validExpectation,
} from '../provider-validation';

export class PayPalAdapter implements IPaymentGateway {
  private readonly clientId = process.env.PAYPAL_CLIENT_ID;
  private readonly clientSecret = process.env.PAYPAL_CLIENT_SECRET;
  private readonly apiUrl = environmentBaseUrl(process.env.PAYPAL_ENVIRONMENT,
    'https://api-m.sandbox.paypal.com', 'https://api-m.paypal.com');

  private async getAccessToken(): Promise<string | null> {
    if (!this.clientId || !this.clientSecret || !this.apiUrl) return null;
    const response = await fetch(`${this.apiUrl}/v1/oauth2/token`, {
      ...apiRequestOptions(), method: 'POST',
      headers: {
        Authorization: `Basic ${Buffer.from(`${this.clientId}:${this.clientSecret}`).toString('base64')}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: 'grant_type=client_credentials',
    });
    const body = await responseObject(response);
    return typeof body?.access_token === 'string' && body.access_token.length > 0 && body.access_token.length <= 4096
      ? body.access_token : null;
  }

  async createPaymentIntent(amount: number, currency: string, metadata: PaymentMetadata): Promise<PaymentIntentResponse> {
    if (currencyCode(currency) !== 'USD') return { success: false, error: 'عملة الدفع غير مدعومة لدى البوابة المحددة' };
    const formatted = intentAmount(amount, currency, metadata);
    const returnUrl = checkoutReturnUrl(metadata.courseId, 'pending');
    const cancelUrl = checkoutReturnUrl(metadata.courseId, 'cancelled');
    if (!this.apiUrl || !process.env.PAYPAL_WEBHOOK_ID || !returnUrl || !cancelUrl) {
      return { success: false, error: 'بوابة الدفع غير مهيأة حالياً' };
    }
    if (!formatted) return { success: false, error: 'بيانات طلب الدفع غير صالحة' };
    // A unique server reference binds the buyer and course in the local context.
    // PayPal custom_id and request-id cannot hold the full context JSON.
    const requestId = createHash('sha256').update(metadata.paymentId).digest('hex').slice(0, 38);
    try {
      const token = await this.getAccessToken();
      if (!token) return { success: false, error: 'بوابة الدفع غير مهيأة حالياً' };
      const response = await fetch(`${this.apiUrl}/v2/checkout/orders`, {
        ...apiRequestOptions(), method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', 'PayPal-Request-Id': requestId },
        body: JSON.stringify({
          intent: 'CAPTURE',
          purchase_units: [{ reference_id: metadata.paymentId, custom_id: metadata.paymentId, amount: { currency_code: 'USD', value: formatted } }],
          application_context: { return_url: returnUrl, cancel_url: cancelUrl },
        }),
      });
      const order = await responseObject(response);
      const domains = this.apiUrl.includes('sandbox') ? ['www.sandbox.paypal.com'] : ['www.paypal.com'];
      if (!order || !identifier(order.id) || !Array.isArray(order.links)) return { success: false, error: 'تعذّر بدء الدفع، يرجى المحاولة مجدداً' };
      for (const value of order.links) {
        const link = objectValue(value);
        if (link?.rel !== 'approve' && link?.rel !== 'payer-action') continue;
        const url = providerCheckoutUrl(link.href, domains);
        if (url) return { success: true, transactionId: order.id, checkoutUrl: url };
      }
      return { success: false, error: 'تعذّر بدء الدفع، يرجى المحاولة مجدداً' };
    } catch { return { success: false, error: 'تعذّر بدء الدفع، يرجى المحاولة مجدداً' }; }
  }

  async verifyPayment(transactionId: string, expected: PaymentExpectation): Promise<PaymentProof | null> {
    if (!this.apiUrl || !identifier(transactionId) || !validExpectation(expected) || expected.currency !== 'USD') return null;
    try {
      const token = await this.getAccessToken();
      if (!token) return null;
      const response = await fetch(`${this.apiUrl}/v2/checkout/orders/${encodeURIComponent(transactionId)}`, {
        ...apiRequestOptions(), headers: { Authorization: `Bearer ${token}` },
      });
      const order = await responseObject(response);
      if (!order || order.id !== transactionId || order.status !== 'COMPLETED'
          || !Array.isArray(order.purchase_units) || order.purchase_units.length !== 1) return null;
      const unit = objectValue(order.purchase_units[0]);
      const total = objectValue(unit?.amount);
      const payments = objectValue(unit?.payments);
      if (!unit || !total || !payments || hasRefunds(payments.refunds) || typeof unit.custom_id !== 'string') return null;
      if (unit.custom_id !== expected.paymentId || !Array.isArray(payments.captures) || payments.captures.length === 0) return null;
      let capturedMinor = 0;
      for (const value of payments.captures) {
        const capture = objectValue(value);
        const captured = objectValue(capture?.amount);
        if (capture?.status !== 'COMPLETED' || !captured || currencyCode(captured.currency_code) !== expected.currency) return null;
        const minor = decimalMinor(captured.value, expected.currency);
        if (minor === null || minor <= 0) return null;
        capturedMinor += minor;
      }
      if (!Number.isSafeInteger(capturedMinor) || capturedMinor !== expected.amountMinor) return null;
      return paymentProof(transactionId, order.id, unit.reference_id,
        decimalMinor(total.value, expected.currency), total.currency_code, expected);
    } catch { return null; }
  }

  async verifyWebhook(req: Request, rawBody: string): Promise<boolean> {
    const webhookId = process.env.PAYPAL_WEBHOOK_ID;
    if (!this.apiUrl || !webhookId || req.method !== 'POST' || rawBody.length > 1_000_000) return false;
    try {
      const fields = {
        auth_algo: req.headers.get('paypal-auth-algo'),
        cert_url: req.headers.get('paypal-cert-url'),
        transmission_id: req.headers.get('paypal-transmission-id'),
        transmission_sig: req.headers.get('paypal-transmission-sig'),
        transmission_time: req.headers.get('paypal-transmission-time'),
      };
      if (Object.values(fields).some(value => !value || value.length > 4096)) return false;
      const event: unknown = JSON.parse(rawBody);
      if (!objectValue(event)) return false;
      const token = await this.getAccessToken();
      if (!token) return false;
      const response = await fetch(`${this.apiUrl}/v1/notifications/verify-webhook-signature`, {
        ...apiRequestOptions(), method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...fields, webhook_id: webhookId, webhook_event: event }),
      });
      return (await responseObject(response))?.verification_status === 'SUCCESS';
    } catch { return false; }
  }
}
