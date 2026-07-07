import { IPaymentGateway } from './types';
import { StripeAdapter } from './adapters/StripeAdapter';
import { PayPalAdapter } from './adapters/PayPalAdapter';
import { ManualAdapter } from './adapters/ManualAdapter';
import { TabbyAdapter } from './adapters/TabbyAdapter';
import { TamaraAdapter } from './adapters/TamaraAdapter';

export class PaymentFactory {
  static getProvider(name: string): IPaymentGateway {
    switch (name.toUpperCase()) {
      case 'STRIPE':
        return new StripeAdapter();
      case 'PAYPAL':
        return new PayPalAdapter();
      case 'TABBY':
        return new TabbyAdapter();
      case 'TAMARA':
        return new TamaraAdapter();
      case 'MANUAL':
      default:
        return new ManualAdapter();
    }
  }
}
