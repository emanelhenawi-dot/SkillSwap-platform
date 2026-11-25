import mongoose from 'mongoose';

export const DEFAULT_ECONOMY = { videoCost: 1, creatorShare: 0.5, treasuryShare: 0.5 };

export default mongoose.model(
  'Setting',
  new mongoose.Schema({ key: { type: String, unique: true }, value: mongoose.Schema.Types.Mixed })
);