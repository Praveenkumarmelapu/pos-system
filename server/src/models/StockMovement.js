import mongoose from 'mongoose';

const stockMovementSchema = new mongoose.Schema(
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
      required: true,
      index: true
    },
    barcode: {
      type: String,
      required: true
    },
    type: {
      type: String,
      enum: ['sale', 'purchase', 'manual_adjustment', 'return', 'damage', 'opening_stock'],
      required: true,
      index: true
    },
    quantityDelta: {
      type: Number,
      required: true // Negative for reduction, positive for addition
    },
    previousStock: {
      type: Number,
      required: true
    },
    newStock: {
      type: Number,
      required: true
    },
    referenceId: {
      type: String,
      default: null // Invoice number, Purchase ID, or tally reference
    },
    reason: {
      type: String,
      default: ''
    },
    performedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    }
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

stockMovementSchema.index({ shopId: 1, productId: 1, createdAt: -1 });
stockMovementSchema.index({ shopId: 1, type: 1, createdAt: -1 });

export const StockMovement = mongoose.model('StockMovement', stockMovementSchema);
