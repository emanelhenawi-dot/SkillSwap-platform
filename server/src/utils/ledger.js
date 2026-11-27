import User from '../models/User.js';
import Transaction from '../models/Transaction.js';

const r2 = (n) => Math.round(Number(n) * 100) / 100;

// كل تغيير في الرصيد بيعدّي من هنا: تحديث ذرّي + سجل في Transaction
export async function credit(userId, amount, type, note) {
  const a = r2(amount);
  if (!(a > 0)) return null;
  const u = await User.findByIdAndUpdate(userId, { $inc: { points: a } }, { new: true });
  if (u) await Transaction.create({ user: userId, type, amount: a, note });
  return u;
}

// يرجّع null لو الرصيد مش كفاية (من غير ما يخصم)
export async function debit(userId, amount, type, note) {
  const a = r2(amount);
  if (!(a > 0)) return null;
  const u = await User.findOneAndUpdate({ _id: userId, points: { $gte: a } }, { $inc: { points: -a } }, { new: true });
  if (u) await Transaction.create({ user: userId, type, amount: -a, note });
  return u;
}