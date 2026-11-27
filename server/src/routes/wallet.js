import { Router } from 'express';
import crypto from 'crypto';
import mongoose from 'mongoose';
import rateLimit from 'express-rate-limit';
import { protect, allow } from '../middleware/auth.js';
import { wrap, fail } from '../utils/helpers.js';
import Transaction from '../models/Transaction.js';
import PaymentOrder from '../models/PaymentOrder.js';
import { CREDIT_PACKAGES, PAYMENT_PROVIDERS, ORDER_TTL_MINUTES, getReceiver } from '../config/wallet.js';

const router = Router();
router.use(protect, allow('user'));

const submitLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, max: 10, standardHeaders: true, legacyHeaders: false,
  keyGenerator: (req) => String(req.user._id), message: { code: 'TOO_MANY_REQUESTS' },
});

const pub = (o) => ({
  id: o._id, packageId: o.packageId, credits: o.credits, amountEGP: o.amountEGP, provider: o.provider,
  status: o.status, reference: o.reference, senderPhone: o.senderPhone, senderRef: o.senderRef,
  expiresAt: o.expiresAt, submittedAt: o.submittedAt, paidAt: o.paidAt, reviewNote: o.reviewNote,
});

router.get('/', wrap(async (req, res) => {
  const [transactions, orders] = await Promise.all([
    Transaction.find({ user: req.user._id }).sort({ createdAt: -1 }).limit(30).lean(),
    PaymentOrder.find({ user: req.user._id }).sort({ createdAt: -1 }).limit(10).lean(),
  ]);
  res.json({ balance: req.user.points, packages: CREDIT_PACKAGES, providers: PAYMENT_PROVIDERS, transactions, orders: orders.map(pub) });
}));

router.post('/orders', wrap(async (req, res) => {
  const { packageId, provider } = req.body || {};
  const pack = CREDIT_PACKAGES.find((p) => p.id === packageId);
  if (!pack || !PAYMENT_PROVIDERS.includes(provider)) return fail(res, 400, 'INVALID_INPUT');
  if (!getReceiver()) return fail(res, 503, 'PAYMENT_NOT_CONFIGURED');

  await PaymentOrder.updateMany({ user: req.user._id, status: 'pending', expiresAt: { $lt: new Date() } }, { status: 'expired' });
  const open = await PaymentOrder.countDocuments({ user: req.user._id, status: { $in: ['pending', 'submitted'] } });
  if (open >= 3) return fail(res, 429, 'TOO_MANY_OPEN_ORDERS');

  const order = await PaymentOrder.create({
    user: req.user._id, packageId: pack.id, credits: pack.credits, amountEGP: pack.priceEGP, provider,
    reference: 'SS-' + crypto.randomBytes(3).toString('hex').toUpperCase(),
    expiresAt: new Date(Date.now() + ORDER_TTL_MINUTES * 60 * 1000),
  });
  res.status(201).json({ order: pub(order), receiver: getReceiver() });
}));

router.get('/orders/:id', wrap(async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) return fail(res, 404, 'NOT_FOUND');
  const order = await PaymentOrder.findOne({ _id: req.params.id, user: req.user._id });
  if (!order) return fail(res, 404, 'NOT_FOUND');
  if (order.status === 'pending' && order.expiresAt < new Date()) { order.status = 'expired'; await order.save(); }
  res.json({ order: pub(order), receiver: getReceiver() });
}));

// الطالب بيقول "حوّلت" ويكتب رقمه ورقم العملية → بانتظار الأدمن
router.post('/orders/:id/submit', submitLimiter, wrap(async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) return fail(res, 404, 'NOT_FOUND');
  const senderPhone = String(req.body.senderPhone || '').trim();
  const senderRef = String(req.body.senderRef || '').trim();
  if (!/^01[0125]\d{8}$/.test(senderPhone) || !/^[A-Za-z0-9]{6,30}$/.test(senderRef)) return fail(res, 400, 'INVALID_INPUT');
  try {
    const order = await PaymentOrder.findOneAndUpdate(
      { _id: req.params.id, user: req.user._id, status: 'pending', expiresAt: { $gt: new Date() } },
      { status: 'submitted', senderPhone, senderRef, submittedAt: new Date() },
      { new: true }
    );
    if (!order) return fail(res, 409, 'ORDER_NOT_PENDING');
    res.json({ order: pub(order) });
  } catch (e) {
    if (e?.code === 11000) return fail(res, 409, 'REF_ALREADY_USED');
    throw e;
  }
}));

router.post('/orders/:id/cancel', wrap(async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) return fail(res, 404, 'NOT_FOUND');
  const order = await PaymentOrder.findOneAndUpdate(
    { _id: req.params.id, user: req.user._id, status: 'pending' }, { status: 'cancelled' }, { new: true }
  );
  if (!order) return fail(res, 409, 'ORDER_NOT_PENDING');
  res.json({ order: pub(order) });
}));

export default router;