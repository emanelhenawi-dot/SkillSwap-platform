import mongoose from 'mongoose';

const { Schema } = mongoose;

const skillRequestSchema = new Schema({

  student: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },

  creator: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },

  title: {
    type: String,
    required: true,
    trim: true,
    maxlength: 150
  },

  description: {
    type: String,
    required: true,
    maxlength: 1500
  },

  subject: {
    type: String,
    required: true
  },

  language: {
    type: String,
    enum: ['ar', 'en'],
    default: 'ar'
  },

  level: {
    type: String,
    enum: [
      'beginner',
      'intermediate',
      'advanced'
    ],
    default: 'beginner'
  },

  urgency: {
    type: String,
    enum: ['regular', 'urgent'],
    default: 'regular'
  },

  bounty: {
    type: Number,
    enum: [3, 5],
    required: true
  },

  responseText: {
    type: String,
    default: ''
  },

  responseUrl: {
    type: String,
    default: ''
  },

  status: {
    type: String,
    enum: [
      'open',
      'claimed',
      'submitted',
      'accepted'
    ],
    default: 'open'
  }

}, { timestamps: true });

skillRequestSchema.index({
  status: 1,
  subject: 1,
  language: 1
});

export default mongoose.model(
  'SkillRequest',
  skillRequestSchema
);