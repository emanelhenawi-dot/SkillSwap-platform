import jwt from 'jsonwebtoken';
import User from '../models/User.js';

export const protect = async (req, res, next) => {
  const h = req.headers.authorization || '';
  const token = h.startsWith('Bearer ') ? h.slice(7) : null;
  if (!token) return res.status(401).json({ code: 'UNAUTHORIZED' });
  try {
    const { id } = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(id);
    if (!user) throw new Error('no user');
    if (user.frozen) return res.status(403).json({ code: 'ACCOUNT_FROZEN' });
    req.user = user;
    next();
  } catch {
    res.status(401).json({ code: 'UNAUTHORIZED' });
  }
};

export const allow = (...roles) => (req, res, next) =>
  roles.includes(req.user.role) ? next() : res.status(403).json({ code: 'FORBIDDEN' });