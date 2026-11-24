import mongoose from 'mongoose';

const customerSchema = new mongoose.Schema(
  {
    shopId: {
      type: String,
      required: true,
      uppercase: true,
      index: true
    },
    name: {
      type: String,
      required: true,
      trim: true
    },
    phone: {
      type: String,
      required: true,
      trim: true
    },
    email: {
      type: String,
      lowercase: true,
      trim: true,
      default: ''
    },
    totalPurchases: {
      type: Number,
      default: 0 // In Paise
    },
    totalBills: {
      type: Number,
      default: 0
    },
    outstandingUdhaar: {
      type: Number,
      default: 0 // In Paise (credit owed to shop)
    },
    creditLimit: {
      type: Number,
      default: 0 // In Paise (0 = no limit specified)
    },
    address: {
      type: String,
      default: ''
    },
    notes: {
      type: String,
      default: ''
    },
    lastReminderSentAt: {
      type: Date,
      default: null
    },
    reminderCount: {
      type: Number,
      default: 0
    }
  },
  { timestamps: true }
);

// Compound index: Unique phone per shop
customerSchema.index({ shopId: 1, phone: 1 }, { unique: true });
customerSchema.index({ shopId: 1, name: 1 });

export const Customer = mongoose.model('Customer', customerSchema);
