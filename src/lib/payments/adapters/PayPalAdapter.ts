import { IPaymentGateway, PaymentIntentResponse } from '../types';

export class PayPalAdapter implements IPaymentGateway {
  
  // Note: For a real production app, you would use the official @paypal/checkout-server-sdk
  // or fetch directly against the PayPal REST API. Here we provide the standard REST structure.
  
  private clientId = process.env.PAYPAL_CLIENT_ID;
  private clientSecret = process.env.PAYPAL_CLIENT_SECRET;
  private apiUrl = process.env.NODE_ENV === 'production' 
    ? 'https://api-m.paypal.com' 
    : 'https://api-m.sandbox.paypal.com';

  private async getAccessToken() {
    if (!this.clientId || !this.clientSecret) return null;
    
    const auth = Buffer.from(`${this.clientId}:${this.clientSecret}`).toString('base64');
    const response = await fetch(`${this.apiUrl}/v1/oauth2/token`, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: 'grant_type=client_credentials'
    });
    const data = await response.json();
    return data.access_token;
  }

  async createPaymentIntent(amount: number, currency: string, metadata: any): Promise<PaymentIntentResponse> {
    try {
      const token = await this.getAccessToken();
      if (!token) return { success: false, error: 'PayPal is not configured' };

      const response = await fetch(`${this.apiUrl}/v2/checkout/orders`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          intent: 'CAPTURE',
          purchase_units: [{
            amount: {
              currency_code: currency.toUpperCase(),
              value: amount.toFixed(2)
            },
            custom_id: JSON.stringify({ userId: metadata.userId, courseId: metadata.courseId })
          }],
          application_context: {
            return_url: `${process.env.NEXT_PUBLIC_APP_URL}/checkout/success`,
            cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/checkout/cancel`
          }
        })
      });

      const order = await response.json();
      
      if (order.id) {
        const approveLink = order.links.find((link: any) => link.rel === 'approve');
        return {
          success: true,
          transactionId: order.id,
          checkoutUrl: approveLink?.href
        };
      }
      return { success: false, error: 'Failed to create PayPal order' };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  async verifyPayment(transactionId: string): Promise<boolean> {
    try {
      const token = await this.getAccessToken();
      if (!token) return false;

      const response = await fetch(`${this.apiUrl}/v2/checkout/orders/${transactionId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const order = await response.json();
      
      return order.status === 'COMPLETED' || order.status === 'APPROVED';
    } catch (error) {
      return false;
    }
  }
}
