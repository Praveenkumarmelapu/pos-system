import mongoose from 'mongoose';

const categorySchema = new mongoose.Schema(
  {
    shopId: {
      type: String,
      default: 'SYSTEM',
      uppercase: true,
      trim: true,
      index: true
    },
    name: {
      type: String,
      required: true,
      trim: true
    },
    normalizedName: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      index: true
    },
    slug: {
      type: String,
      required: true,
      trim: true,
      lowercase: true
    },
    parentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Category',
      default: null,
      index: true
    },
    parentName: {
      type: String,
      default: ''
    },
    icon: {
      type: String,
      default: 'Layers'
    },
    description: {
      type: String,
      default: ''
    },
    aliases: {
      type: [String],
      default: []
    },
    externalMappings: {
      type: [String],
      default: []
    },
    isSystem: {
      type: Boolean,
      default: false,
      index: true
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true
    },
    displayOrder: {
      type: Number,
      default: 0
    }
  },
  { timestamps: true }
);

// Compound Indexes for safe tenant isolation & uniqueness
categorySchema.index({ shopId: 1, slug: 1 }, { unique: true });
categorySchema.index({ shopId: 1, normalizedName: 1 });
categorySchema.index({ shopId: 1, parentId: 1 });
categorySchema.index({ isSystem: 1, isActive: 1 });

categorySchema.pre('validate', function (next) {
  if (this.name && !this.normalizedName) {
    this.normalizedName = this.name.trim().toLowerCase();
  }
  if (this.name && !this.slug) {
    const prefix = (this.shopId || 'sys').toLowerCase();
    const clean = this.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    this.slug = `${prefix}-${clean}`;
  }
  next();
});

export const Category = mongoose.model('Category', categorySchema);
