export interface PaymentIntentResponse {
  success: boolean;
  transactionId?: string;
  clientSecret?: string; // For Stripe, etc.
  checkoutUrl?: string; // For PayPal, Stripe Checkout, Tabby
  error?: string;
}

export interface IPaymentGateway {
  /**
   * Initialize a payment request with the provider
   */
  createPaymentIntent(amount: number, currency: string, metadata: any): Promise<PaymentIntentResponse>;

  /**
   * Verify if a payment was successful (usually called by Webhook or return URL)
   */
  verifyPayment(transactionId: string): Promise<boolean>;

  /**
   * Refund a payment if applicable
   */
  refundPayment?(transactionId: string): Promise<boolean>;
}
