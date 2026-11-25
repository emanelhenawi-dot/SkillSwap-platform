import { Router } from 'express';
import LiveRequest from '../models/LiveRequest.js';
import { protect, allow } from '../middleware/auth.js';
import { fail, wrap } from '../utils/helpers.js';
import { notifyParents } from '../utils/family.js';

const router = Router();
// كل routes الطلاب/المبدعين محمية بـ allow('user') → ولي الأمر ممنوع تلقائياً (REQ-34)
router.use(protect, allow('user'));

// طلب Live: القاصر لازم موافقة ولي الأمر
router.post('/live/request', wrap(async (req, res) => {
  const u = req.user;
  if (!u.isMinor) return res.json({ status: 'approved' });
  if (!u.parents.length) return fail(res, 403, 'NO_LINKED_PARENT');
  const lr = await LiveRequest.create({ child: u._id });
  await notifyParents(u, 'live_request', { requestId: lr._id });
  res.status(201).json({ id: lr._id, status: 'pending' });
}));

router.get('/live/request/:id', wrap(async (req, res) => {
  const lr = await LiveRequest.findOne({ _id: req.params.id, child: req.user._id });
  if (!lr) return fail(res, 404, 'NOT_FOUND');
  res.json({ status: lr.status });
}));

// إشعار نشاط للأب (watched / posted). هتتربط بالفيديوهات الحقيقية بعدين.
router.post('/activity', wrap(async (req, res) => {
  const { type, title } = req.body;
  if (!['watched', 'posted'].includes(type)) return fail(res, 400, 'INVALID_INPUT');
  if (req.user.isMinor) await notifyParents(req.user, `child_${type}`, { title: String(title || '').slice(0, 100) });
  res.json({ ok: true });
}));

export default router;