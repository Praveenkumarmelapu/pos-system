import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true
    },
    phone: {
      type: String,
      trim: true,
      sparse: true
    },
    passwordHash: {
      type: String,
      required: true
    },
    isSuperAdmin: {
      type: Boolean,
      default: false,
      index: true
    },
    status: {
      type: String,
      enum: ['active', 'suspended', 'deactivated'],
      default: 'active'
    },
    lastLoginAt: {
      type: Date,
      default: null
    }
  },
  { timestamps: true }
);

// Method to verify password
userSchema.methods.comparePassword = async function (password) {
  return bcrypt.compare(password, this.passwordHash);
};

// Static helper to hash password
userSchema.statics.hashPassword = async function (password) {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
};

export const User = mongoose.model('User', userSchema);
