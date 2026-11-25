import jwt from 'jsonwebtoken';

export const fail = (res, status, code) => res.status(status).json({ code });
export const wrap = (fn) => (req, res, next) => fn(req, res, next).catch(next);
export const signToken = (user) => jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '7d' });