import mongoose from 'mongoose';
const { Schema } = mongoose;

const userSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    phone: String,
    nationalId: { type: String, unique: true, sparse: true },
    passwordHash: String,
    googleId: String,
    // user = Student/Creator (حساب واحد بدورين) | parent | admin
    role: { type: String, enum: ['user', 'parent', 'admin'], default: 'user' },
    birthDate: Date,
    isMinor: { type: Boolean, default: false },
    guardian: { email: String, phone: String, nationalId: String },
    parents: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    children: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    pendingChildren: [{ email: String, nationalId: String }],
    points: { type: Number, default: 0 }, // ولي الأمر دايماً 0
    frozen: { type: Boolean, default: false },
  },
  { timestamps: true }
);

userSchema.methods.toPublic = function () {
  return {
    id: this._id,
    name: this.name,
    email: this.email,
    phone: this.phone,
    role: this.role,
    isMinor: this.isMinor,
    points: this.points,
  };
};

export default mongoose.model('User', userSchema);