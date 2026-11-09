import type { IPaymentGateway, PaymentIntentResponse, PaymentMetadata } from '../types';
import { validExpectation } from '../provider-validation';

export class ManualAdapter implements IPaymentGateway {
  async createPaymentIntent(_amount: number, _currency: string, metadata: PaymentMetadata): Promise<PaymentIntentResponse> {
    // A pending receipt request never proves payment or creates enrollment.
    return validExpectation(metadata)
      ? { success: true, transactionId: metadata.paymentId }
      : { success: false, error: 'بيانات طلب الدفع غير صالحة' };
  }

  async verifyPayment(): Promise<null> { return null; }

  async verifyWebhook(): Promise<boolean> { return false; }
}
