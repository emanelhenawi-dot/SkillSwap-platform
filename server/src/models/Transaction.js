import mongoose from 'mongoose';
const { Schema } = mongoose;

// user = null يعني الـ Treasury
export default mongoose.model(
  'Transaction',
  new Schema(
    {
      user: { type: Schema.Types.ObjectId, ref: 'User', default: null },
      type: String, // treasury_in | creator_earn | penalty | ...
      amount: Number,
      note: String,
    },
    { timestamps: true }
  )
);