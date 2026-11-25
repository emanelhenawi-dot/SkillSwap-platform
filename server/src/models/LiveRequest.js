import mongoose from 'mongoose';
const { Schema } = mongoose;

export default mongoose.model(
  'LiveRequest',
  new Schema(
    {
      child: { type: Schema.Types.ObjectId, ref: 'User', required: true },
      status: { type: String, enum: ['pending', 'approved', 'declined'], default: 'pending' },
      decidedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    },
    { timestamps: true }
  )
);