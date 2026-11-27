import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import videoRoutes from './src/routes/videos.js';
import aiRoutes from './src/routes/ai.js';
import skillRequestRoutes from './src/routes/skillRequests.js';
import User from './src/models/User.js';
import authRoutes from './src/routes/auth.js';
import parentRoutes from './src/routes/parent.js';
import studentRoutes from './src/routes/student.js';
import adminRoutes from './src/routes/admin.js';
import walletRoutes from './src/routes/wallet.js';

const app = express();
app.use(helmet());
app.use(cors({ origin: process.env.CLIENT_URL }));
app.use(express.json({ limit: '300kb' }));

app.get('/api/health', (_req, res) => res.json({ ok: true }));
app.use('/api/auth', rateLimit({ windowMs: 15 * 60 * 1000, max: 100 }), authRoutes);
app.use('/api/parent', parentRoutes);
app.use('/api/student', studentRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/wallet', walletRoutes);
app.use('/api/skill-requests', skillRequestRoutes);
app.use('/api/videos', rateLimit({ windowMs: 60 * 1000, max: 120, message: { code: 'TOO_MANY_REQUESTS' } }), videoRoutes);
app.use('/api/ai', aiRoutes);

app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ code: 'SERVER_ERROR' });
});

async function seedAdmin() {
  if (!process.env.ADMIN_EMAIL || !process.env.ADMIN_PASSWORD) {
    console.warn('ADMIN_EMAIL / ADMIN_PASSWORD not set; skipping admin seed.');
    return;
  }
  const email = process.env.ADMIN_EMAIL.toLowerCase();
  if (await User.findOne({ email })) return;
  await User.create({
    name: 'System Administrator',
    email,
    role: 'admin',
    passwordHash: await bcrypt.hash(process.env.ADMIN_PASSWORD, 12),
  });
  console.log('Admin account created:', email);
}

await mongoose.connect(process.env.MONGO_URI);
await seedAdmin();
app.listen(process.env.PORT || 5000, () => console.log('API running on port', process.env.PORT || 5000));