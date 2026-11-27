import mongoose from 'mongoose';
const { Schema } = mongoose;

const schema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    video: { type: Schema.Types.ObjectId, ref: 'Video', required: true },
    charged: { type: Boolean, default: false },
    maxPosition: { type: Number, default: 0 },     // أبعد نقطة وصلها فعلاً (السيرفر هو اللي يحسبها)
    lastBeat: Date,
    answers: [{ cp: Schema.Types.ObjectId, tries: { type: Number, default: 0 }, correct: { type: Boolean, default: false }, _id: false }],
    completedAt: Date,
    score: Number,                                  // نسبة الأسئلة اللي جاوبها صح من أول محاولة
  },
  { timestamps: true }
);
schema.index({ user: 1, video: 1 }, { unique: true });

export default mongoose.model('WatchSession', schema);