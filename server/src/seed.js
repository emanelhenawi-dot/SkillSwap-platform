import 'dotenv/config';
import mongoose from 'mongoose';
import User from './models/User.js';
import Video from './models/Video.js';
import Rating from './models/Rating.js';

await mongoose.connect(process.env.MONGO_URI);

const creator = await User.findOneAndUpdate(
  { email: 'creator.demo@example.com' },
  { name: 'Demo Creator', role: 'user', nationalId: '29901011234567', phone: '01000000000' },
  { upsert: true, new: true }
);
const student = await User.findOneAndUpdate(
  { email: 'student.demo@example.com' },
  { name: 'Demo Student', role: 'user', nationalId: '29902021234567', phone: '01000000001' },
  { upsert: true, new: true }
);

const v1 = await Video.create({ title: 'Intro to Calculus', creator: creator._id });
await Video.create({ title: 'Python for Beginners', creator: creator._id, aiNotes: 'Audio OK, language: EN' });
await Rating.create({ video: v1._id, student: student._id, stars: 1, flagged: true, flagReason: '3 consecutive negative ratings' });

console.log('Seed done');
await mongoose.disconnect();