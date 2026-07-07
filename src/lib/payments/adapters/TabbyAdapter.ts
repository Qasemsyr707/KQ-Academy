import { IPaymentGateway, PaymentIntentResponse } from '../types';

export class TabbyAdapter implements IPaymentGateway {
  private readonly TABBY_API_URL = 'https://api.tabby.ai/api/v2/checkout';
  private readonly TABBY_SECRET_KEY = process.env.TABBY_SECRET_KEY || '';
  private readonly TABBY_MERCHANT_CODE = process.env.TABBY_MERCHANT_CODE || '';

  async createPaymentIntent(amount: number, currency: string, metadata: any): Promise<PaymentIntentResponse> {
    try {
      // In a real environment, you would call the Tabby Checkout API
      // We will structure the exact request needed for Tabby:
      
      const payload = {
        payment: {
          amount: amount.toFixed(2),
          currency: currency,
          description: `شراء كورس: ${metadata.courseName}`,
          buyer: {
            name: metadata.userName || 'Student',
            email: metadata.userEmail || 'student@example.com',
            phone: metadata.userPhone || '+971500000000'
          },
          order: {
            reference_id: `${metadata.courseId}-${Date.now()}`,
            items: [
              {
                title: metadata.courseName,
                quantity: 1,
                unit_price: amount.toFixed(2),
                reference_id: metadata.courseId
              }
            ]
          }
        },
        lang: 'ar',
        merchant_code: this.TABBY_MERCHANT_CODE,
        merchant_urls: {
          success: `${process.env.NEXT_PUBLIC_APP_URL}/api/webhooks/payments/tabby/success`,
          cancel: `${process.env.NEXT_PUBLIC_APP_URL}/checkout?courseId=${metadata.courseId}&error=cancelled`,
          failure: `${process.env.NEXT_PUBLIC_APP_URL}/checkout?courseId=${metadata.courseId}&error=failed`
        }
      };

      if (!this.TABBY_SECRET_KEY) {
        console.warn('Tabby keys not configured. Simulating success...');
        // Mock successful response for development
        return {
          success: true,
          transactionId: `tabby_${Date.now()}`,
          checkoutUrl: `${process.env.NEXT_PUBLIC_APP_URL}/checkout?courseId=${metadata.courseId}&simulated=tabby_success`
        };
      }

      const response = await fetch(this.TABBY_API_URL, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.TABBY_SECRET_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      const data = await response.json();

      if (!response.ok || data.status === 'rejected') {
        return { success: false, error: data.error || 'تم رفض العملية من تابي' };
      }

      return {
        success: true,
        transactionId: data.payment.id,
        checkoutUrl: data.configuration.available_products.installments[0].web_url // Tabby redirect URL
      };

    } catch (error: any) {
      console.error('Tabby Adapter Error:', error);
      return { success: false, error: 'تعذر الاتصال بتابي' };
    }
  }

  async verifyPayment(transactionId: string): Promise<boolean> {
    // Verify payment status (AUTHORIZED / CLOSED / REJECTED)
    try {
      if (!this.TABBY_SECRET_KEY) return true; // Mock

      const response = await fetch(`https://api.tabby.ai/api/v2/payments/${transactionId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.TABBY_SECRET_KEY}`
        }
      });
      const data = await response.json();
      return data.status === 'AUTHORIZED' || data.status === 'CLOSED';
    } catch {
      return false;
    }
  }
}
