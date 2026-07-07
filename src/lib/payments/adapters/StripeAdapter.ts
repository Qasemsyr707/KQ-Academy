import { IPaymentGateway, PaymentIntentResponse } from '../types';
import Stripe from 'stripe';

export class StripeAdapter implements IPaymentGateway {
  private stripe: Stripe | null = null;

  constructor() {
    const key = process.env.STRIPE_SECRET_KEY;
    if (key) {
      this.stripe = new Stripe(key, { apiVersion: '2024-04-10' as any });
    }
  }

  async createPaymentIntent(amount: number, currency: string, metadata: any): Promise<PaymentIntentResponse> {
    if (!this.stripe) {
      return { success: false, error: 'Stripe is not configured on this server.' };
    }

    try {
      // Amount must be in cents for USD
      const amountInCents = currency.toUpperCase() === 'USD' ? Math.round(amount * 100) : amount;

      const session = await this.stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        line_items: [
          {
            price_data: {
              currency: currency.toLowerCase(),
              product_data: {
                name: metadata.courseName || 'Course Purchase',
              },
              unit_amount: amountInCents,
            },
            quantity: 1,
          },
        ],
        mode: 'payment',
        success_url: `${process.env.NEXT_PUBLIC_APP_URL}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/checkout/cancel`,
        metadata: {
          userId: metadata.userId,
          courseId: metadata.courseId,
        }
      });

      return {
        success: true,
        transactionId: session.id,
        checkoutUrl: session.url || undefined
      };
    } catch (error: any) {
      console.error('Stripe create error:', error);
      return { success: false, error: error.message };
    }
  }

  async verifyPayment(transactionId: string): Promise<boolean> {
    if (!this.stripe) return false;
    try {
      const session = await this.stripe.checkout.sessions.retrieve(transactionId);
      return session.payment_status === 'paid';
    } catch (error) {
      return false;
    }
  }
}
