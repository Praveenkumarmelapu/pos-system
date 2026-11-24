import { z } from 'zod';

export const createSaleSchema = z.object({
  idempotencyKey: z.string().min(8, 'Valid Idempotency Key is required'),
  items: z.array(
    z.object({
      productId: z.string().min(1, 'Product ID is required'),
      quantity: z.number().positive('Quantity must be greater than 0'),
      discountAmount: z.number().nonnegative().optional().default(0) // in rupees or paise
    })
  ).min(1, 'At least one item is required in the bill'),
  totalDiscount: z.number().nonnegative().optional().default(0),
  paymentMethod: z.enum(['cash', 'upi', 'card', 'split', 'credit']).default('cash'),
  paidAmount: z.number().nonnegative().optional(),
  creditAmount: z.number().nonnegative().optional(),
  paymentBreakdown: z.object({
    cash: z.number().nonnegative().optional().default(0),
    upi: z.number().nonnegative().optional().default(0),
    card: z.number().nonnegative().optional().default(0),
    credit: z.number().nonnegative().optional().default(0)
  }).optional(),
  paymentDetails: z.object({
    receivedAmount: z.number().nonnegative().optional().default(0),
    referenceNote: z.string().optional().default('')
  }).optional(),
  customerId: z.string().nullable().optional(),
  customerName: z.string().optional().default('Walk-in Customer'),
  customerPhone: z.string().nullable().optional(),
  notes: z.string().optional().default('')
});

export const createReturnSchema = z.object({
  items: z.array(
    z.object({
      productId: z.string().min(1, 'Product ID is required'),
      quantity: z.number().positive('Return quantity must be greater than 0')
    })
  ).min(1, 'Select at least one item to return'),
  refundMethod: z.enum(['cash', 'upi', 'card', 'khata_adjust']).default('cash'),
  reason: z.string().trim().max(200).optional().default('')
});
