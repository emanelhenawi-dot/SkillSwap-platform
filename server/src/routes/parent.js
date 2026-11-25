import { Router } from 'express';
import User from '../models/User.js';
import Notification from '../models/Notification.js';
import LiveRequest from '../models/LiveRequest.js';
import { protect, allow } from '../middleware/auth.js';
import { fail, wrap } from '../utils/helpers.js';
import { parseNationalId } from '../utils/nationalId.js';
import { linkParentChild } from '../utils/family.js';
import { sendMail, childInviteEmail } from '../utils/mailer.js';

const router = Router();
router.use(protect, allow('parent')); // ولي الأمر بس

// Dashboard كله في طلب واحد
router.get('/overview', wrap(async (req, res) => {
  const me = await User.findById(req.user._id).populate('children', 'name email points isMinor');
  const ids = me.children.map((c) => c._id);
  const [notifications, liveRequests] = await Promise.all([
    Notification.find({ user: me._id }).sort('-createdAt').limit(30),
    LiveRequest.find({ child: { $in: ids } }).populate('child', 'name').sort('-createdAt').limit(20),
  ]);
  res.json({ children: me.children, pendingChildren: me.pendingChildren, notifications, liveRequests });
}));

// My Children: إضافة ابن بالإيميل والرقم القومي (UC-13)
router.post('/children', wrap(async (req, res) => {
  const email = String(req.body.email || '').toLowerCase().trim();
  const nationalId = String(req.body.nationalId || '');
  if (!email || !parseNationalId(nationalId)) return fail(res, 400, 'INVALID_INPUT');

  const child = await User.findOne({ role: 'user', email, nationalId });
  if (child) {
    if (req.user.children.some((c) => c.equals(child._id))) return fail(res, 409, 'ALREADY_LINKED');
    await linkParentChild(req.user, child);
    return res.json({ status: 'linked' }); // موجود → ربط فوري
  }

  if (req.user.pendingChildren.some((p) => p.email === email && p.nationalId === nationalId)) {
    return fail(res, 409, 'ALREADY_INVITED');
  }
  req.user.pendingChildren.push({ email, nationalId });
  await req.user.save();
  sendMail(childInviteEmail({ to: email, parentName: req.user.name })); // مش موجود → دعوة
  res.json({ status: 'invited' });
}));

// موافقة / رفض الـ Live (REQ-33)
router.post('/live-requests/:id/decision', wrap(async (req, res) => {
  const { decision } = req.body;
  if (!['approved', 'declined'].includes(decision)) return fail(res, 400, 'INVALID_INPUT');
  const lr = await LiveRequest.findById(req.params.id);
  if (!lr || !req.user.children.some((c) => c.equals(lr.child))) return fail(res, 404, 'NOT_FOUND');
  if (lr.status !== 'pending') return fail(res, 409, 'ALREADY_DECIDED');
  lr.status = decision;
  lr.decidedBy = req.user._id;
  await lr.save();
  res.json({ ok: true });
}));

router.post('/notifications/read', wrap(async (req, res) => {
  await Notification.updateMany({ user: req.user._id, read: false }, { read: true });
  res.json({ ok: true });
}));

export default router;