import mongoose from 'mongoose';
const { Schema } = mongoose;

export default mongoose.model(
  'Notification',
  new Schema(
    {
      user: { type: Schema.Types.ObjectId, ref: 'User', index: true },
      type: String,
      data: Schema.Types.Mixed,
      read: { type: Boolean, default: false },
    },
    { timestamps: true }
  )
);