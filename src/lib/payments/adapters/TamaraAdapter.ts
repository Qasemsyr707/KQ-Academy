import { IPaymentGateway, PaymentIntentResponse } from '../types';

export class TamaraAdapter implements IPaymentGateway {
  private readonly TAMARA_API_URL = 'https://api.tamara.co/checkout';
  private readonly TAMARA_MERCHANT_TOKEN = process.env.TAMARA_MERCHANT_TOKEN || '';

  async createPaymentIntent(amount: number, currency: string, metadata: any): Promise<PaymentIntentResponse> {
    try {
      // Tamara specific request structure:
      const payload = {
        order_reference_id: `${metadata.courseId}-${Date.now()}`,
        total_amount: {
          amount: amount,
          currency: currency
        },
        description: `شراء كورس: ${metadata.courseName}`,
        country_code: 'SA',
        payment_type: 'PAY_BY_INSTALMENTS',
        instalments: 3,
        consumer: {
          first_name: metadata.userName?.split(' ')[0] || 'Student',
          last_name: metadata.userName?.split(' ')[1] || 'E-Learning',
          phone_number: metadata.userPhone || '966500000000',
          email: metadata.userEmail || 'student@example.com'
        },
        merchant_url: {
          success: `${process.env.NEXT_PUBLIC_APP_URL}/api/webhooks/payments/tamara/success`,
          failure: `${process.env.NEXT_PUBLIC_APP_URL}/checkout?courseId=${metadata.courseId}&error=tamara_failed`,
          cancel: `${process.env.NEXT_PUBLIC_APP_URL}/checkout?courseId=${metadata.courseId}&error=tamara_cancelled`,
          notification: `${process.env.NEXT_PUBLIC_APP_URL}/api/webhooks/payments/tamara/notify`
        },
        items: [
          {
            reference_id: metadata.courseId,
            name: metadata.courseName,
            type: 'Digital',
            sku: metadata.courseId,
            quantity: 1,
            total_amount: { amount, currency }
          }
        ]
      };

      if (!this.TAMARA_MERCHANT_TOKEN) {
        console.warn('Tamara keys not configured. Simulating success...');
        return {
          success: true,
          transactionId: `tamara_${Date.now()}`,
          checkoutUrl: `${process.env.NEXT_PUBLIC_APP_URL}/checkout?courseId=${metadata.courseId}&simulated=tamara_success`
        };
      }

      const response = await fetch(this.TAMARA_API_URL, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.TAMARA_MERCHANT_TOKEN}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      const data = await response.json();

      if (!response.ok) {
        return { success: false, error: data.message || 'خطأ في الربط مع تمارا' };
      }

      return {
        success: true,
        transactionId: data.order_id,
        checkoutUrl: data.checkout_url
      };

    } catch (error: any) {
      console.error('Tamara Adapter Error:', error);
      return { success: false, error: 'تعذر الاتصال بتمارا' };
    }
  }

  async verifyPayment(transactionId: string): Promise<boolean> {
    try {
      if (!this.TAMARA_MERCHANT_TOKEN) return true;

      const response = await fetch(`https://api.tamara.co/orders/${transactionId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.TAMARA_MERCHANT_TOKEN}`
        }
      });
      const data = await response.json();
      return data.status === 'AUTHORISED' || data.status === 'FULLY_CAPTURED';
    } catch {
      return false;
    }
  }
}
