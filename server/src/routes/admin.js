import { Router } from 'express';
import User from '../models/User.js';
import Video from '../models/Video.js';
import Rating from '../models/Rating.js';
import Transaction from '../models/Transaction.js';
import Setting, { DEFAULT_ECONOMY } from '../models/Setting.js';
import { protect, allow } from '../middleware/auth.js';
import { fail, wrap } from '../utils/helpers.js';

const router = Router();
router.use(protect, allow('admin'));

router.get('/overview', wrap(async (_req, res) => {
  const [users, parents, minors, pendingVideos, flaggedRatings, treasury] = await Promise.all([
    User.countDocuments({ role: 'user' }),
    User.countDocuments({ role: 'parent' }),
    User.countDocuments({ isMinor: true }),
    Video.countDocuments({ status: 'pending' }),
    Rating.countDocuments({ flagged: true }),
    Transaction.aggregate([{ $match: { user: null, type: 'treasury_in' } }, { $group: { _id: null, total: { $sum: '$amount' } } }]),
  ]);
  res.json({ users, parents, minors, pendingVideos, flaggedRatings, treasury: treasury[0]?.total || 0 });
}));

// ---- Review queue ----
router.get('/videos', wrap(async (req, res) => {
  const videos = await Video.find({ status: req.query.status || 'pending' }).populate('creator', 'name email').sort('-createdAt');
  res.json({ videos });
}));

router.patch('/videos/:id', wrap(async (req, res) => {
  if (!['accepted', 'rejected', 'under_review'].includes(req.body.status)) return fail(res, 400, 'INVALID_INPUT');
  await Video.findByIdAndUpdate(req.params.id, { status: req.body.status });
  res.json({ ok: true });
}));

// ---- Flagged ratings ----
router.get('/ratings/flagged', wrap(async (_req, res) => {
  const ratings = await Rating.find({ flagged: true }).populate('student', 'name email').populate('video', 'title').sort('-createdAt');
  res.json({ ratings });
}));

router.post('/ratings/:id/resolve', wrap(async (req, res) => {
  const { action, penalize } = req.body; // action: delete | dismiss
  const rating = await Rating.findById(req.params.id);
  if (!rating) return fail(res, 404, 'NOT_FOUND');
  if (action === 'delete') {
    if (penalize) {
      const s = await User.findById(rating.student);
      if (s) {
        s.points = Math.max(0, s.points - 0.5); // عقوبة 0.5 نقطة (REQ-15)
        await s.save();
        await Transaction.create({ user: s._id, type: 'penalty', amount: -0.5, note: 'Malicious rating' });
      }
    }
    await rating.deleteOne();
  } else {
    rating.flagged = false;
    await rating.save();
  }
  res.json({ ok: true });
}));

// ---- Users / fraud (تجميد محفظة/حساب) ----
router.get('/users', wrap(async (req, res) => {
  const q = String(req.query.q || '').trim();
  const filter = q ? { $or: [{ name: new RegExp(q, 'i') }, { email: new RegExp(q, 'i') }] } : {};
  const users = await User.find({ ...filter, role: { $ne: 'admin' } }).select('name email role isMinor points frozen').limit(50);
  res.json({ users });
}));

router.patch('/users/:id/freeze', wrap(async (req, res) => {
  const u = await User.findOne({ _id: req.params.id, role: { $ne: 'admin' } });
  if (!u) return fail(res, 404, 'NOT_FOUND');
  u.frozen = !u.frozen;
  await u.save();
  res.json({ frozen: u.frozen });
}));

// ---- Economy + Simulator ----
const getEconomy = async () => (await Setting.findOne({ key: 'economy' }))?.value ?? DEFAULT_ECONOMY;

router.get('/economy', wrap(async (_req, res) => res.json(await getEconomy())));

router.put('/economy', wrap(async (req, res) => {
  const { videoCost, creatorShare, treasuryShare } = Object.fromEntries(
    Object.entries(req.body).map(([k, v]) => [k, Number(v)])
  );
  if ([videoCost, creatorShare, treasuryShare].some((n) => !(n >= 0)) || Math.abs(creatorShare + treasuryShare - videoCost) > 1e-9) {
    return fail(res, 400, 'INVALID_INPUT');
  }
  const value = { videoCost, creatorShare, treasuryShare };
  await Setting.findOneAndUpdate({ key: 'economy' }, { value }, { upsert: true });
  res.json(value);
}));

router.post('/simulate', wrap(async (req, res) => {
  const views = Math.max(0, Number(req.body.views) || 0);
  const cost = Number(req.body.videoCost) || 0;
  const cs = Number(req.body.creatorShare) || 0;
  const ts = Number(req.body.treasuryShare) || 0;
  res.json({
    pointsSpent: views * cost,
    creatorsEarn: views * cs,
    treasuryEarn: views * ts,
    treasuryMarginPct: cost ? +((ts / cost) * 100).toFixed(1) : 0,
  });
}));

export default router;