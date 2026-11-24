import { z } from 'zod';

export const stockAdjustmentSchema = z.object({
  productId: z.string().min(1, 'Product ID is required'),
  type: z.enum(['manual_adjustment', 'damage', 'loss', 'return']),
  quantityDelta: z.number().refine(val => val !== 0, 'Quantity delta cannot be zero'),
  reason: z.string().min(3, 'Audit reason is required for manual stock adjustment')
});

export const createPurchaseSchema = z.object({
  supplierName: z.string().min(1, 'Supplier name is required'),
  purchaseInvoiceNumber: z.string().optional().default(''),
  items: z.array(
    z.object({
      productId: z.string().min(1, 'Product ID is required'),
      quantityReceived: z.number().positive('Quantity received must be greater than 0'),
      purchaseRate: z.number().nonnegative('Purchase rate must be non-negative')
    })
  ).min(1, 'At least one product item is required')
});
