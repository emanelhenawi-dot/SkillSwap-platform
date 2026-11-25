import mongoose from 'mongoose';
const { Schema } = mongoose;

export default mongoose.model(
  'Rating',
  new Schema(
    {
      video: { type: Schema.Types.ObjectId, ref: 'Video' },
      student: { type: Schema.Types.ObjectId, ref: 'User' },
      stars: Number,
      flagged: { type: Boolean, default: false },
      flagReason: String,
    },
    { timestamps: true }
  )
);