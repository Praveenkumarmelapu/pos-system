import mongoose from 'mongoose';

const barcodeRegistrySchema = new mongoose.Schema(
  {
    shopId: {
      type: String,
      required: true,
      uppercase: true,
      index: true
    },
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      default: null,
      index: true
    },
    barcodeValue: {
      type: String,
      required: true,
      trim: true
    },
    barcodeType: {
      type: String,
      default: 'CODE128',
      enum: ['CODE128', 'EAN13', 'UPCA', 'QR']
    },
    barcodeSource: {
      type: String,
      enum: ['system_generated', 'manual_override', 'imported'],
      default: 'system_generated'
    },
    labelPreset: {
      type: String,
      enum: ['40x25mm', '50x30mm', '60x40mm', 'custom'],
      default: '50x30mm'
    },
    printCount: {
      type: Number,
      default: 0
    },
    isActive: {
      type: Boolean,
      default: true
    }
  },
  { timestamps: true }
);

// Unique index: No duplicate barcode per shop
barcodeRegistrySchema.index({ shopId: 1, barcodeValue: 1 }, { unique: true });

export const BarcodeRegistry = mongoose.model('BarcodeRegistry', barcodeRegistrySchema);
