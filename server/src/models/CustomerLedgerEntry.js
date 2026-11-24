import mongoose from 'mongoose';

const customerLedgerEntrySchema = new mongoose.Schema(
  {
    shopId: {
      type: String,
      required: true,
      uppercase: true,
      index: true
    },
    customerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Customer',
      required: true,
      index: true
    },
    entryType: {
      type: String,
      enum: [
        'opening_balance',
        'credit_sale',
        'payment_received',
        'sale_return',
        'debit_adjustment',
        'credit_adjustment',
        'reversal'
      ],
      required: true
    },
    // Amounts stored in integer Paise
    amount: {
      type: Number,
      required: true
    },
    debit: {
      type: Number,
      default: 0 // Increase in debt (e.g., credit sale)
    },
    credit: {
      type: Number,
      default: 0 // Decrease in debt (e.g., payment received)
    },
    runningBalance: {
      type: Number,
      required: true // Outstanding balance after this entry in Paise
    },
    referenceId: {
      type: String,
      required: true,
      index: true // e.g. Invoice # (INV-...) or Payment Receipt # (REC-...)
    },
    saleId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Sale',
      default: null
    },
    paymentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'CustomerPayment',
      default: null
    },
    paymentMethod: {
      type: String,
      default: '' // cash, upi, card, etc.
    },
    notes: {
      type: String,
      default: ''
    },
    performedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },
    performedByName: {
      type: String,
      default: 'System'
    }
  },
  { timestamps: true }
);

customerLedgerEntrySchema.index({ shopId: 1, customerId: 1, createdAt: -1 });
customerLedgerEntrySchema.index({ shopId: 1, referenceId: 1 });

export const CustomerLedgerEntry = mongoose.model('CustomerLedgerEntry', customerLedgerEntrySchema);
