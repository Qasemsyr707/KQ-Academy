import { IPaymentGateway, PaymentIntentResponse } from '../types';

export class ManualAdapter implements IPaymentGateway {
  
  async createPaymentIntent(amount: number, currency: string, metadata: any): Promise<PaymentIntentResponse> {
    // For manual (e.g., Syriatel Cash), there is no checkout URL.
    // The user simply uploads an image in the UI. We return success true to let the flow continue.
    return {
      success: true,
      transactionId: `manual_${Date.now()}_${Math.random().toString(36).substring(7)}`,
    };
  }

  async verifyPayment(transactionId: string): Promise<boolean> {
    // Manual payments cannot be verified automatically.
    // An admin must verify the uploaded receipt in the Dashboard.
    return false;
  }
}
