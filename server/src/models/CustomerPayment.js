import mongoose from 'mongoose';

const customerPaymentSchema = new mongoose.Schema(
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
    receiptNumber: {
      type: String,
      required: true,
      index: true
    },
    idempotencyKey: {
      type: String,
      required: true,
      index: true
    },
    amountPaid: {
      type: Number,
      required: true,
      min: 1 // In Paise
    },
    paymentMethod: {
      type: String,
      enum: ['cash', 'upi', 'card', 'bank_transfer', 'cheque'],
      required: true
    },
    previousBalance: {
      type: Number,
      required: true // In Paise
    },
    newBalance: {
      type: Number,
      required: true // In Paise
    },
    referenceNote: {
      type: String,
      default: ''
    },
    receivedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    receivedByName: {
      type: String,
      required: true
    },
    paymentDate: {
      type: Date,
      default: Date.now
    }
  },
  { timestamps: true }
);

customerPaymentSchema.index({ shopId: 1, receiptNumber: 1 }, { unique: true });
customerPaymentSchema.index({ shopId: 1, idempotencyKey: 1 }, { unique: true });
customerPaymentSchema.index({ shopId: 1, customerId: 1, paymentDate: -1 });

export const CustomerPayment = mongoose.model('CustomerPayment', customerPaymentSchema);
