import mongoose from 'mongoose';

/**
 * A staff member's "forgot password" request.
 * Free recovery flow with no email service: the staff member submits their
 * email on the login page, and the shop owner issues a temporary password
 * from the Staff page. One pending request per user per shop.
 */
const passwordResetRequestSchema = new mongoose.Schema(
  {
    shopId: {
      type: String,
      required: true,
      uppercase: true,
      index: true
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    name: {
      type: String,
      required: true
    },
    email: {
      type: String,
      required: true,
      lowercase: true
    },
    status: {
      type: String,
      enum: ['pending', 'resolved'],
      default: 'pending',
      index: true
    },
    resolvedAt: {
      type: Date,
      default: null
    }
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

passwordResetRequestSchema.index({ shopId: 1, userId: 1, status: 1 });

export const PasswordResetRequest = mongoose.model('PasswordResetRequest', passwordResetRequestSchema);
