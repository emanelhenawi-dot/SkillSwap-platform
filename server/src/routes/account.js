import { Router } from 'express';
import bcrypt from 'bcryptjs';
import User from '../models/User.js';
import { protect, verified } from '../middleware/auth.js';
import { fail, wrap, signToken, isStrongPassword, maskEmail } from '../utils/helpers.js';

const router = Router();
router.use(protect, verified);

router.get('/', wrap(async (req, res) => {
  const me = await User.findById(req.user._id).populate('parents', 'name email');
  res.json({
    profile: {
      name: me.name, email: me.email, phone: me.phone,
      role: me.role, isMinor: me.isMinor, emailVerified: me.emailVerified,
    },
    // بيانات ولي الأمر دايماً مقنّعة (الإيميل مخفي جزئياً)
    guardians: me.parents.map((p) => ({ name: p.name, email: maskEmail(p.email) })),
    pendingGuardianEmail:
      me.isMinor && !me.parents.length && me.guardian?.email ? maskEmail(me.guardian.email) : null,
  });
}));

router.patch('/', wrap(async (req, res) => {
  const name = String(req.body.name || '').trim();
  const phone = String(req.body.phone || '').trim();
  if (name.length < 2 || name.length > 80 || !/^[0-9+\s-]{7,20}$/.test(phone)) return fail(res, 400, 'INVALID_INPUT');
  req.user.name = name;
  req.user.phone = phone;
  await req.user.save();
  res.json({ user: req.user.toPublic() });
}));

router.post('/change-password', wrap(async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  if (!req.user.passwordHash) return fail(res, 400, 'NO_PASSWORD_SET'); // حساب جوجل بدون باسورد
  if (!(await bcrypt.compare(String(currentPassword || ''), req.user.passwordHash))) return fail(res, 400, 'WRONG_PASSWORD');
  if (!isStrongPassword(newPassword) || newPassword === currentPassword) return fail(res, 400, 'PASSWORD_RULES');

  req.user.passwordHash = await bcrypt.hash(newPassword, 12);
  req.user.passwordChangedAt = new Date(); // باقي الأجهزة تتفصل
  await req.user.save();
  res.json({ token: signToken(req.user) }); // توكن جديد للجهاز الحالي
}));

export default router;