import mongoose from 'mongoose';
const { Schema } = mongoose;

export default mongoose.model(
  'Video',
  new Schema(
    {
      title: String,
      creator: { type: Schema.Types.ObjectId, ref: 'User' },
      status: { type: String, enum: ['pending', 'accepted', 'rejected', 'under_review'], default: 'pending' },
      aiNotes: String,
    },
    { timestamps: true }
  )
);