import jwt from 'jsonwebtoken';
import type { IPaymentGateway, PaymentExpectation, PaymentIntentResponse, PaymentMetadata, PaymentProof } from '../types';
import {
  apiRequestOptions, appOrigin, checkoutReturnUrl, currencyCode, decimalMinor,
  environmentBaseUrl, hasRefunds, identifier, intentAmount, metadataMatches,
  objectValue, paymentProof, providerCheckoutUrl, responseObject, validBuyerPhone, validExpectation,
} from '../provider-validation';

const COUNTRIES: Readonly<Record<string, string>> = { SAR: 'SA', AED: 'AE', KWD: 'KW', BHD: 'BH', OMR: 'OM' };

export class TamaraAdapter implements IPaymentGateway {
  private readonly token = process.env.TAMARA_MERCHANT_TOKEN;
  private readonly apiUrl = environmentBaseUrl(process.env.TAMARA_ENVIRONMENT,
    'https://api-sandbox.tamara.co', 'https://api.tamara.co');

  async createPaymentIntent(amount: number, currency: string, metadata: PaymentMetadata): Promise<PaymentIntentResponse> {
    const code = currencyCode(currency);
    if (!code || !COUNTRIES[code]) return { success: false, error: 'عملة الدفع غير مدعومة لدى البوابة المحددة' };
    const formatted = intentAmount(amount, currency, metadata);
    const origin = appOrigin();
    const success = checkoutReturnUrl(metadata.courseId, 'pending');
    const cancel = checkoutReturnUrl(metadata.courseId, 'cancelled');
    const failure = checkoutReturnUrl(metadata.courseId, 'failed');
    if (!this.token || !this.apiUrl || !process.env.TAMARA_NOTIFICATION_TOKEN || !origin || !success || !cancel || !failure) {
      return { success: false, error: 'بوابة الدفع غير مهيأة حالياً' };
    }
    if (!formatted || decimalMinor(Number(formatted), code) !== metadata.amountMinor) {
      return { success: false, error: 'بيانات طلب الدفع غير صالحة' };
    }
    if (!validBuyerPhone(metadata.userPhone)) return { success: false, error: 'يرجى إضافة رقم هاتف صالح قبل استخدام هذه البوابة' };
    try {
      const total = { amount: Number(formatted), currency: code };
      const zero = { amount: 0, currency: code };
      const names = metadata.userName.trim().split(/\s+/);
      const response = await fetch(`${this.apiUrl}/checkout`, {
        ...apiRequestOptions(), method: 'POST',
        headers: { Authorization: `Bearer ${this.token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          order_reference_id: metadata.paymentId,
          total_amount: total, shipping_amount: zero, tax_amount: zero,
          description: `شراء كورس: ${metadata.courseName}`,
          country_code: COUNTRIES[code], payment_type: 'PAY_BY_INSTALMENTS', instalments: 3,
          consumer: {
            first_name: names[0], last_name: names.slice(1).join(' ') || names[0],
            phone_number: metadata.userPhone, email: metadata.userEmail,
          },
          merchant_url: { success, failure, cancel, notification: `${origin}/api/webhooks/payments/tamara` },
          items: [{
            reference_id: metadata.courseId, name: metadata.courseName, type: 'Digital', sku: metadata.courseId,
            quantity: 1, unit_price: total, total_amount: total, tax_amount: zero, discount_amount: zero,
          }],
          additional_data: { paymentId: metadata.paymentId, userId: metadata.userId, courseId: metadata.courseId },
        }),
      });
      const body = await responseObject(response);
      const url = providerCheckoutUrl(body?.checkout_url, ['tamara.co']);
      if (!body || !identifier(body.order_id) || !url) return { success: false, error: 'تعذّر بدء الدفع، يرجى المحاولة مجدداً' };
      return { success: true, transactionId: body.order_id, checkoutUrl: url };
    } catch { return { success: false, error: 'تعذّر بدء الدفع، يرجى المحاولة مجدداً' }; }
  }

  async verifyPayment(transactionId: string, expected: PaymentExpectation): Promise<PaymentProof | null> {
    if (!this.token || !this.apiUrl || !identifier(transactionId) || !validExpectation(expected) || !COUNTRIES[expected.currency]) return null;
    try {
      const response = await fetch(`${this.apiUrl}/orders/${encodeURIComponent(transactionId)}`, {
        ...apiRequestOptions(), headers: { Authorization: `Bearer ${this.token}` },
      });
      const order = await responseObject(response);
      const total = objectValue(order?.total_amount);
      // Fully captured is the only fulfilment state accepted by this integration.
      if (!order || !total || order.status !== 'fully_captured' || hasRefunds(order.refunds)
          || !Array.isArray(order.items) || order.items.length !== 1) return null;
      const item = objectValue(order.items[0]);
      if (item?.reference_id !== expected.courseId || item.quantity !== 1) return null;
      // Payment.id is a unique server-created merchant reference, binding the
      // order to its local buyer. Compare echoed additional data when present.
      if (order.additional_data !== undefined && !metadataMatches(order.additional_data, expected)) return null;
      if (order.is_test !== undefined) {
        if (typeof order.is_test !== 'boolean' || order.is_test !== this.apiUrl.includes('sandbox')) return null;
      }
      for (const field of ['refunded_amount', 'canceled_amount']) {
        if (order[field] === undefined || order[field] === null) continue;
        const money = objectValue(order[field]);
        if (!money || currencyCode(money.currency) !== expected.currency || decimalMinor(money.amount, expected.currency) !== 0) return null;
      }
      return paymentProof(transactionId, order.order_id, order.order_reference_id,
        decimalMinor(total.amount, expected.currency), total.currency, expected);
    } catch { return null; }
  }

  async verifyWebhook(req: Request, rawBody: string): Promise<boolean> {
    const secret = process.env.TAMARA_NOTIFICATION_TOKEN;
    if (!secret || req.method !== 'POST' || rawBody.length > 1_000_000) return false;
    try {
      const authorization = req.headers.get('authorization');
      const token = authorization?.startsWith('Bearer ') ? authorization.slice(7) : new URL(req.url).searchParams.get('tamaraToken');
      if (!token || token.length > 16_384) return false;
      const claims = jwt.verify(token, secret, { algorithms: ['HS256'] });
      return typeof claims !== 'string' && typeof claims.exp === 'number';
    } catch { return false; }
  }
}
