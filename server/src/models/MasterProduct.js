import mongoose from 'mongoose';

const masterProductSchema = new mongoose.Schema(
  {
    barcode: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true
    },
    name: {
      type: String,
      required: true,
      trim: true
    },
    brand: {
      type: String,
      trim: true,
      default: ''
    },
    category: {
      type: String,
      trim: true,
      default: 'General'
    },
    subCategory: {
      type: String,
      default: ''
    },
    packSize: {
      type: String,
      default: ''
    },
    unit: {
      type: String,
      default: 'pcs'
    },
    imageUrl: {
      type: String,
      default: ''
    },
    mrp: {
      type: Number,
      default: 0 // In Paise
    },
    verified: {
      type: Boolean,
      default: true
    },
    source: {
      type: String,
      enum: ['system_seed', 'open_food_facts', 'verified_contribution'],
      default: 'system_seed'
    }
  },
  { timestamps: true }
);

masterProductSchema.index({ name: 'text', brand: 'text' });

export const MasterProduct = mongoose.model('MasterProduct', masterProductSchema);
