import mongoose from 'mongoose';

const productSchema = new mongoose.Schema(
  {
    shopId: {
      type: String,
      required: true,
      uppercase: true,
      index: true
    },
    barcode: {
      type: String,
      required: true,
      trim: true,
      index: true
    },
    isSystemBarcode: {
      type: Boolean,
      default: false
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
      default: 'Others'
    },
    subCategory: {
      type: String,
      trim: true,
      default: 'General Others'
    },
    categoryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Category',
      default: null,
      index: true
    },
    subCategoryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Category',
      default: null
    },
    classificationStatus: {
      type: String,
      enum: ['auto_assigned', 'manual', 'pending_classification'],
      default: 'auto_assigned',
      index: true
    },
    description: {
      type: String,
      default: ''
    },
    imageUrl: {
      type: String,
      default: ''
    },
    purchasePrice: {
      type: Number,
      required: true,
      default: 0 // In Paise
    },
    sellingPrice: {
      type: Number,
      required: true // In Paise
    },
    mrp: {
      type: Number,
      default: 0 // In Paise
    },
    taxRate: {
      type: Number,
      default: 0 // Percentage (0, 5, 12, 18, 28)
    },
    stockQuantity: {
      type: Number,
      required: true,
      default: 0
    },
    minStockThreshold: {
      type: Number,
      default: 5
    },
    unit: {
      type: String,
      default: 'pcs' // pcs, kg, g, l, ml, pack, box
    },
    packSize: {
      type: String,
      default: ''
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true
    }
  },
  { timestamps: true }
);

// Compound unique index: Unique barcode per shop tenant
productSchema.index({ shopId: 1, barcode: 1 }, { unique: true });
productSchema.index({ shopId: 1, name: 'text', brand: 'text', category: 'text' });
productSchema.index({ shopId: 1, stockQuantity: 1, isActive: 1 });

export const Product = mongoose.model('Product', productSchema);
