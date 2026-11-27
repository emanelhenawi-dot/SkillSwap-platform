import mongoose from 'mongoose';
const { Schema } = mongoose;

const paymentOrderSchema = new Schema({
  user: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  packageId: { type: String, required: true },
  credits: { type: Number, required: true, min: 1 },
  amountEGP: { type: Number, required: true, min: 1 },
  provider: { type: String, enum: ['vodafone_cash', 'instapay', 'paymob', 'fawry'], required: true },
  reference: { type: String, index: true },          // كود قصير يكتبه الطالب في ملاحظة التحويل
  // pending: اتعمل وبانتظار التحويل | submitted: الطالب بلّغ وبانتظار الأدمن
  status: { type: String, enum: ['pending', 'submitted', 'paid', 'failed', 'expired', 'cancelled'], default: 'pending', index: true },
  senderPhone: String,
  senderRef: String,                                  // رقم عملية التحويل
  submittedAt: Date,
  reviewedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  reviewNote: String,
  providerOrderId: { type: String, default: null },
  providerTransactionId: { type: String, default: null },
  checkoutUrl: { type: String, default: null },
  paidAt: { type: Date, default: null },
  expiresAt: { type: Date, required: true },
}, { timestamps: true });

// نفس رقم عملية التحويل ما ينفعش يتستخدم في طلبين
paymentOrderSchema.index({ senderRef: 1 }, { unique: true, partialFilterExpression: { senderRef: { $type: 'string' } } });
paymentOrderSchema.index(
  { provider: 1, providerTransactionId: 1 },
  { unique: true, partialFilterExpression: { providerTransactionId: { $type: 'string' } } }
);

export default mongoose.model('PaymentOrder', paymentOrderSchema);