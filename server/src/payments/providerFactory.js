
import { PAYMENT_PROVIDERS } from '../config/wallet.js';

class PaymentProvider {
  async createCheckout(_order) {
    throw new Error('NOT_IMPLEMENTED');
  }

  async verifyWebhook(_request) {
    throw new Error('NOT_IMPLEMENTED');
  }
}

class PaymobProvider extends PaymentProvider {
  async createCheckout(_order) {
    throw new Error('PAYMOB_NOT_CONFIGURED');
  }

  async verifyWebhook(_request) {
    throw new Error('PAYMOB_NOT_CONFIGURED');
  }
}

class FawryProvider extends PaymentProvider {
  async createCheckout(_order) {
    throw new Error('FAWRY_NOT_CONFIGURED');
  }

  async verifyWebhook(_request) {
    throw new Error('FAWRY_NOT_CONFIGURED');
  }
}

export function getPaymentProvider(name) {
  if (!PAYMENT_PROVIDERS.includes(name)) {
    throw new Error('UNSUPPORTED_PAYMENT_PROVIDER');
  }

  if (name === 'paymob') {
    return new PaymobProvider();
  }

  if (name === 'fawry') {
    return new FawryProvider();
  }

  throw new Error('UNSUPPORTED_PAYMENT_PROVIDER');
}
