export const CREDIT_PACKAGES = Object.freeze([
  { id: 'starter', name: 'Starter Pack', credits: 5, priceEGP: 140 },
  { id: 'scholar', name: 'Scholar Pack', credits: 12, priceEGP: 310 },
  { id: 'master', name: 'Master Pack', credits: 25, priceEGP: 600 },
]);

// دفع يدوي: تحويل على رقم المنصة ثم تأكيد الأدمن
export const PAYMENT_PROVIDERS = Object.freeze(['vodafone_cash', 'instapay']);
export const ORDER_TTL_MINUTES = 24 * 60;

export const getReceiver = () =>
  process.env.PAYMENT_RECEIVER_NUMBER
    ? { number: process.env.PAYMENT_RECEIVER_NUMBER, name: process.env.PAYMENT_RECEIVER_NAME || '' }
    : null;