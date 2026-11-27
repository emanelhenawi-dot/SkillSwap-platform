import mongoose from 'mongoose';
const { Schema } = mongoose;

const checkpointSchema = new Schema({
  at: { type: Number, required: true },        // الثانية اللي الفيديو هيقف فيها
  from: { type: Number, required: true },      // بداية الجزء (لإعادة المشاهدة لو الإجابة غلط)
  question: { type: String, required: true },
  options: { type: [String], validate: (v) => v.length === 4 },
  correctIndex: { type: Number, min: 0, max: 3, required: true },
  explanation: String,
});

export default mongoose.model(
  'Video',
  new Schema(
    {
      title: String,
      description: { type: String, default: '' },
      creator: { type: Schema.Types.ObjectId, ref: 'User' },
      status: { type: String, enum: ['pending', 'accepted', 'rejected', 'under_review'], default: 'pending' },
      aiNotes: String,
      provider: { type: String, enum: ['youtube', 'file'] },
      youtubeId: String,
      url: String,
      durationSec: Number,
      language: { type: String, enum: ['ar', 'en'], default: 'ar' },
      transcript: { type: String, select: false },   // ما بيتعرضش للطلاب
      checkpoints: { type: [checkpointSchema], default: [] },
    },
    { timestamps: true }
  )
);