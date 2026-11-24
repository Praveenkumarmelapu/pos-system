import mongoose from 'mongoose';

const saleItemSchema = new mongoose.Schema({
  productId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true
  },
  barcode: {
    type: String,
    required: true
  },
  name: {
    type: String,
    required: true
  },
  quantity: {
    type: Number,
    required: true,
    min: 0.001
  },
  unitPrice: {
    type: Number,
    required: true // In Paise
  },
  mrp: {
    type: Number,
    default: 0
  },
  purchasePrice: {
    type: Number,
    default: 0 // In Paise, for calculating gross profit
  },
  discountAmount: {
    type: Number,
    default: 0
  },
  taxRate: {
    type: Number,
    default: 0
  },
  taxAmount: {
    type: Number,
    default: 0
  },
  lineTotal: {
    type: Number,
    required: true // In Paise
  }
});

const saleSchema = new mongoose.Schema(
  {
    shopId: {
      type: String,
      required: true,
      uppercase: true,
      index: true
    },
    invoiceNumber: {
      type: String,
      required: true,
      index: true
    },
    idempotencyKey: {
      type: String,
      required: true,
      index: true
    },
    cashierId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    cashierName: {
      type: String,
      required: true
    },
    customerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Customer',
      default: null
    },
    customerName: {
      type: String,
      default: 'Walk-in Customer'
    },
    customerPhone: {
      type: String,
      default: null
    },
    items: [saleItemSchema],
    subtotal: {
      type: Number,
      required: true // In Paise
    },
    totalDiscount: {
      type: Number,
      default: 0
    },
    totalTax: {
      type: Number,
      default: 0
    },
    roundingAdjustment: {
      type: Number,
      default: 0
    },
    grandTotal: {
      type: Number,
      required: true // In Paise
    },
    totalCost: {
      type: Number,
      default: 0 // In Paise, for profit estimation
    },
    paymentMethod: {
      type: String,
      enum: ['cash', 'upi', 'card', 'split', 'credit'],
      default: 'cash'
    },
    paidAmount: {
      type: Number,
      default: 0 // In Paise: Cash/digital funds collected today
    },
    creditAmount: {
      type: Number,
      default: 0 // In Paise: Amount assigned to Customer Khata
    },
    isKhata: {
      type: Boolean,
      default: false,
      index: true
    },
    paymentBreakdown: {
      cash: { type: Number, default: 0 },
      upi: { type: Number, default: 0 },
      card: { type: Number, default: 0 },
      credit: { type: Number, default: 0 }
    },
    paymentDetails: {
      receivedAmount: { type: Number, default: 0 },
      changeReturned: { type: Number, default: 0 },
      referenceNote: { type: String, default: '' }
    },
    status: {
      type: String,
      enum: ['completed', 'partially_returned', 'returned', 'cancelled'],
      default: 'completed',
      index: true
    },
    returns: {
      type: [
        {
          productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
          barcode: { type: String, required: true },
          name: { type: String, required: true },
          quantity: { type: Number, required: true, min: 0.001 },
          unitPrice: { type: Number, required: true },
          taxAmount: { type: Number, default: 0 },
          refundAmount: { type: Number, required: true },
          refundMethod: {
            type: String,
            enum: ['cash', 'upi', 'card', 'khata_adjust'],
            default: 'cash'
          },
          reason: { type: String, default: '' },
          returnedAt: { type: Date, default: Date.now },
          returnedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
          returnedByName: { type: String, required: true }
        }
      ],
      default: []
    },
    refundTotal: {
      type: Number,
      default: 0 // In Paise: total refunded across all returns
    },
    saleDate: {
      type: Date,
      default: Date.now,
      index: true
    },
    notes: {
      type: String,
      default: ''
    }
  },
  { timestamps: true }
);

// Compound Indexes for safe multi-tenancy & reporting
saleSchema.index({ shopId: 1, invoiceNumber: 1 }, { unique: true });
saleSchema.index({ shopId: 1, idempotencyKey: 1 }, { unique: true });
saleSchema.index({ shopId: 1, saleDate: -1 });
saleSchema.index({ shopId: 1, cashierId: 1 });

export const Sale = mongoose.model('Sale', saleSchema);
