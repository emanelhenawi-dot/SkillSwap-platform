import { Router } from 'express';
import bcrypt from 'bcryptjs';
import User from '../models/User.js';
import { parseNationalId } from '../utils/nationalId.js';
import { fail, wrap, signToken } from '../utils/helpers.js';
import { verifyGoogle } from '../utils/google.js';
import { linkParentChild } from '../utils/family.js';
import { sendMail, guardianEmail } from '../utils/mailer.js';
import { protect } from '../middleware/auth.js';

const router = Router();

// ---------- Register (UC-14) ----------
router.post('/register', wrap(async (req, res) => {
  const { name, email, phone, nationalId, password, accountType, guardian, googleCredential } = req.body;
  if (!name || !email || !phone || !nationalId) return fail(res, 400, 'MISSING_FIELDS');

  // الـ System يحسب العمر من الرقم القومي (REQ-29)
  const info = parseNationalId(nationalId);
  if (!info) return fail(res, 400, 'INVALID_NID');

  let googleId;
  if (googleCredential) {
    const g = await verifyGoogle(googleCredential).catch(() => null);
    if (!g || g.email.toLowerCase() !== email.toLowerCase()) return fail(res, 400, 'GOOGLE_INVALID');
    googleId = g.sub;
  } else if (!password || password.length < 8) {
    return fail(res, 400, 'WEAK_PASSWORD');
  }

  const exists = await User.findOne({ $or: [{ email: email.toLowerCase() }, { nationalId }] });
  if (exists) return fail(res, 409, 'USER_EXISTS');

  const isMinor = info.age < 18;
  let role = 'user';
  let guardianData;

  if (isMinor) {
    // أقل من 18: بيانات ولي الأمر إجبارية (REQ-30)
    const g = guardian || {};
    const gi = parseNationalId(g.nationalId);
    if (!g.email || !g.phone || !gi || gi.age < 18 || g.nationalId === nationalId) {
      return fail(res, 400, 'GUARDIAN_REQUIRED');
    }
    guardianData = { email: g.email.toLowerCase(), phone: g.phone, nationalId: g.nationalId };
  } else {
    // 18 فأكتر: لازم يختار Account Type (REQ-31)
    if (!['student_creator', 'parent'].includes(accountType)) return fail(res, 400, 'ACCOUNT_TYPE_REQUIRED');
    if (accountType === 'parent') role = 'parent';
  }

  const user = await User.create({
    name, email, phone, nationalId, googleId, role, isMinor,
    birthDate: info.birthDate,
    guardian: guardianData,
    passwordHash: password ? await bcrypt.hash(password, 12) : undefined,
  });

  if (isMinor) {
    // لو ولي الأمر عنده حساب بنفس الإيميل والرقم القومي → ربط فوري
    const parent = await User.findOne({ role: 'parent', email: guardianData.email, nationalId: guardianData.nationalId });
    if (parent) await linkParentChild(parent, user);
    sendMail(guardianEmail({ to: guardianData.email, childName: name, registered: !!parent }));
  }

  if (role === 'parent') {
    // أي أبناء سجلوا قبل كده وكتبوا بيانات الأب ده → ربط
    const kids = await User.find({ role: 'user', 'guardian.email': user.email, 'guardian.nationalId': nationalId });
    for (const k of kids) await linkParentChild(user, k);
  }

  if (role === 'user') {
    // أي ولي أمر كان دعا الشخص ده قبل كده → ربط
    const parents = await User.find({ role: 'parent', pendingChildren: { $elemMatch: { email: user.email, nationalId } } });
    for (const p of parents) {
      await linkParentChild(p, user);
      await User.updateOne({ _id: p._id }, { $pull: { pendingChildren: { email: user.email, nationalId } } });
    }
  }

  res.status(201).json({ token: signToken(user), user: user.toPublic() });
}));

// ---------- Login (UC-1) ----------
// الأدمن: بيدخل بإيميل وباسورد بس. أي حد غيره لازم الرقم القومي كمان.
router.post('/login', wrap(async (req, res) => {
  const { email, password, nationalId } = req.body;
  const user = await User.findOne({ email: String(email || '').toLowerCase() });
  if (!user || !user.passwordHash) return fail(res, 401, 'INVALID_CREDENTIALS');
  if (user.role !== 'admin' && user.nationalId !== nationalId) return fail(res, 401, 'INVALID_CREDENTIALS');
  if (!(await bcrypt.compare(String(password || ''), user.passwordHash))) return fail(res, 401, 'INVALID_CREDENTIALS');
  if (user.frozen) return fail(res, 403, 'ACCOUNT_FROZEN');
  res.json({ token: signToken(user), user: user.toPublic() });
}));

// ---------- Google Sign-in ----------
router.post('/google', wrap(async (req, res) => {
  const g = await verifyGoogle(req.body.credential).catch(() => null);
  if (!g) return fail(res, 400, 'GOOGLE_INVALID');
  const user = await User.findOne({ email: g.email.toLowerCase() });
  if (!user) return res.json({ needsRegistration: true, profile: { name: g.name, email: g.email } });
  if (user.role === 'admin') return fail(res, 403, 'FORBIDDEN');
  if (user.frozen) return fail(res, 403, 'ACCOUNT_FROZEN');
  res.json({ token: signToken(user), user: user.toPublic() });
}));

router.get('/me', protect, (req, res) => res.json({ user: req.user.toPublic() }));

export default router;