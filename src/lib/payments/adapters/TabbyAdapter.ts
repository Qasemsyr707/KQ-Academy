import type { IPaymentGateway, PaymentExpectation, PaymentIntentResponse, PaymentMetadata, PaymentProof } from '../types';
import {
  apiRequestOptions, checkoutReturnUrl, constantTimeSecret, currencyCode, decimalMinor,
  hasRefunds, identifier, intentAmount, metadataMatches, objectValue, paymentProof,
  providerCheckoutUrl, responseObject, tabbyBaseUrl, validBuyerPhone, validExpectation,
} from '../provider-validation';

export class TabbyAdapter implements IPaymentGateway {
  private readonly key = process.env.TABBY_SECRET_KEY;
  private readonly merchantCode = process.env.TABBY_MERCHANT_CODE;
  private readonly apiUrl = tabbyBaseUrl();

  private correctMode(isTest: unknown): boolean {
    if (typeof isTest !== 'boolean') return false;
    if (this.key?.startsWith('sk_test_')) return isTest;
    if (this.key?.startsWith('sk_')) return !isTest;
    return false;
  }

  async createPaymentIntent(amount: number, currency: string, metadata: PaymentMetadata): Promise<PaymentIntentResponse> {
    const code = currencyCode(currency);
    if (!code || !['SAR', 'AED'].includes(code)) return { success: false, error: 'عملة الدفع غير مدعومة لدى البوابة المحددة' };
    const formatted = intentAmount(amount, currency, metadata);
    const success = checkoutReturnUrl(metadata.courseId, 'pending');
    const cancel = checkoutReturnUrl(metadata.courseId, 'cancelled');
    const failure = checkoutReturnUrl(metadata.courseId, 'failed');
    if (!this.key || !this.merchantCode || !this.apiUrl || !process.env.TABBY_WEBHOOK_SECRET || !success || !cancel || !failure) {
      return { success: false, error: 'بوابة الدفع غير مهيأة حالياً' };
    }
    if (!formatted) return { success: false, error: 'بيانات طلب الدفع غير صالحة' };
    if (!validBuyerPhone(metadata.userPhone)) return { success: false, error: 'يرجى إضافة رقم هاتف صالح قبل استخدام هذه البوابة' };
    try {
      const response = await fetch(`${this.apiUrl}/api/v2/checkout`, {
        ...apiRequestOptions(), method: 'POST',
        headers: { Authorization: `Bearer ${this.key}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          payment: {
            amount: formatted, currency: code, description: `شراء كورس: ${metadata.courseName}`,
            buyer: { name: metadata.userName, email: metadata.userEmail, phone: metadata.userPhone },
            order: {
              reference_id: metadata.paymentId,
              items: [{ title: metadata.courseName, quantity: 1, unit_price: formatted, reference_id: metadata.courseId }],
            },
            meta: { paymentId: metadata.paymentId, userId: metadata.userId, courseId: metadata.courseId },
          },
          lang: 'ar', merchant_code: this.merchantCode,
          merchant_urls: { success, cancel, failure },
        }),
      });
      const body = await responseObject(response);
      const payment = objectValue(body?.payment);
      const configuration = objectValue(body?.configuration);
      const products = objectValue(configuration?.available_products);
      const installments = products?.installments;
      if (!body || body.status === 'rejected' || !payment || !identifier(payment.id)
          || !Array.isArray(installments)) return { success: false, error: 'تعذّر بدء الدفع، يرجى المحاولة مجدداً' };
      for (const value of installments) {
        const product = objectValue(value);
        const url = providerCheckoutUrl(product?.web_url, ['tabby.ai', 'tabby.sa']);
        if (url) return { success: true, transactionId: payment.id, checkoutUrl: url };
      }
      return { success: false, error: 'تعذّر بدء الدفع، يرجى المحاولة مجدداً' };
    } catch { return { success: false, error: 'تعذّر بدء الدفع، يرجى المحاولة مجدداً' }; }
  }

  async verifyPayment(transactionId: string, expected: PaymentExpectation): Promise<PaymentProof | null> {
    if (!this.key || !this.apiUrl || !identifier(transactionId) || !validExpectation(expected)
        || !['SAR', 'AED'].includes(expected.currency)) return null;
    try {
      const response = await fetch(`${this.apiUrl}/api/v2/payments/${encodeURIComponent(transactionId)}`, {
        ...apiRequestOptions(), headers: { Authorization: `Bearer ${this.key}` },
      });
      const payment = await responseObject(response);
      const order = objectValue(payment?.order);
      // Authorization alone does not fulfil a course. Await provider capture/close.
      if (!payment || payment.status !== 'CLOSED' || !this.correctMode(payment.is_test)
          || hasRefunds(payment.refunds) || !metadataMatches(payment.meta, expected)
          || !Array.isArray(payment.captures) || payment.captures.length === 0) return null;
      let capturedMinor = 0;
      for (const value of payment.captures) {
        const capture = objectValue(value);
        const minor = decimalMinor(capture?.amount, expected.currency);
        if (minor === null || minor <= 0) return null;
        capturedMinor += minor;
      }
      if (!Number.isSafeInteger(capturedMinor) || capturedMinor !== expected.amountMinor) return null;
      return paymentProof(transactionId, payment.id, order?.reference_id,
        decimalMinor(payment.amount, expected.currency), payment.currency, expected);
    } catch { return null; }
  }

  async verifyWebhook(req: Request, rawBody: string): Promise<boolean> {
    if (req.method !== 'POST' || rawBody.length > 1_000_000) return false;
    try {
      // Tabby sends the exact secret header registered with the merchant webhook.
      const header = process.env.TABBY_WEBHOOK_HEADER ?? 'X-Auth-Key';
      return constantTimeSecret(process.env.TABBY_WEBHOOK_SECRET, req.headers.get(header));
    } catch { return false; }
  }
}
