import mongoose from 'mongoose';

const shopSchema = new mongoose.Schema(
  {
    shopId: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
      index: true
    },
    name: {
      type: String,
      required: true,
      trim: true
    },
    ownerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    contactEmail: {
      type: String,
      required: true,
      lowercase: true,
      trim: true
    },
    contactPhone: {
      type: String,
      required: true,
      trim: true
    },
    businessCategory: {
      type: String,
      required: true,
      default: 'Kirana & Grocery'
    },
    gstin: {
      type: String,
      trim: true,
      uppercase: true,
      default: null
    },
    address: {
      street: { type: String, default: '' },
      city: { type: String, default: '' },
      state: { type: String, default: '' },
      pincode: { type: String, default: '' },
      country: { type: String, default: 'India' }
    },
    status: {
      type: String,
      enum: ['active', 'suspended', 'pending'],
      default: 'active',
      index: true
    },
    subscription: {
      planId: {
        type: String,
        enum: ['free', 'basic', 'pro', 'enterprise'],
        default: 'pro'
      },
      status: {
        type: String,
        enum: ['trial', 'active', 'past_due', 'canceled'],
        default: 'active'
      },
      expiresAt: {
        type: Date,
        default: () => new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
      }
    },
    settings: {
      currency: { type: String, default: 'INR' },
      currencySymbol: { type: String, default: '₹' },
      timezone: { type: String, default: 'Asia/Kolkata' },
      enableGst: { type: Boolean, default: true },
      defaultGstRate: { type: Number, default: 5 },
      receiptHeader: { type: String, default: '' },
      receiptFooter: { type: String, default: 'Thank you! Visit Again.' },
      lowStockThresholdDefault: { type: Number, default: 5 },
      allowNegativeStock: { type: Boolean, default: false }
    }
  },
  { timestamps: true }
);

export const Shop = mongoose.model('Shop', shopSchema);
