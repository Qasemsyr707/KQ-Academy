export interface PaymentExpectation {
  paymentId: string;
  userId: string;
  courseId: string;
  amountMinor: number;
  currency: string;
}

export interface PaymentMetadata extends PaymentExpectation {
  courseName: string;
  userName: string;
  userEmail: string;
  userPhone: string | null;
}

export interface PaymentProof {
  transactionId: string;
  referenceId: string;
  amountMinor: number;
  currency: string;
}

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
  createPaymentIntent(amount: number, currency: string, metadata: PaymentMetadata): Promise<PaymentIntentResponse>;

  /**
   * Verify if a payment was successful (usually called by Webhook or return URL)
   */
  verifyPayment(transactionId: string, expected: PaymentExpectation): Promise<PaymentProof | null>;

  /** Authenticate notification origin before trusting its transaction identifier. */
  verifyWebhook(req: Request, rawBody: string): Promise<boolean>;

  /**
   * Refund a payment if applicable
   */
  refundPayment?(transactionId: string): Promise<boolean>;
}
