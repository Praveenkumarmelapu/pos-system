import mongoose from 'mongoose';

const membershipSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    shopId: {
      type: String,
      required: true,
      uppercase: true,
      index: true
    },
    role: {
      type: String,
      enum: ['owner', 'manager', 'cashier'],
      required: true
    },
    permissions: [
      {
        type: String
      }
    ],
    status: {
      type: String,
      enum: ['active', 'suspended', 'revoked'],
      default: 'active'
    }
  },
  { timestamps: true }
);

// Compound unique index ensuring a user has only one membership per shop
membershipSchema.index({ userId: 1, shopId: 1 }, { unique: true });
membershipSchema.index({ shopId: 1, role: 1 });

export const Membership = mongoose.model('Membership', membershipSchema);
