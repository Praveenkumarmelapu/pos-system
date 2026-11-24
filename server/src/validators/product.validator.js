import { z } from 'zod';

export const createProductSchema = z.object({
  barcode: z.string().min(1, 'Barcode is required').trim(),
  name: z.string().min(1, 'Product name is required').trim(),
  brand: z.string().optional().default(''),
  category: z.string().optional().default('Others'),
  subCategory: z.string().optional().default('General Others'),
  categoryId: z.string().nullable().optional(),
  subCategoryId: z.string().nullable().optional(),
  classificationStatus: z.enum(['auto_assigned', 'manual', 'pending_classification']).optional().default('auto_assigned'),
  description: z.string().optional().default(''),
  imageUrl: z.string().optional().default(''),
  purchasePrice: z.number().nonnegative('Purchase price must be positive or 0'), // in rupees or paise
  sellingPrice: z.number().positive('Selling price must be greater than 0'),
  mrp: z.number().nonnegative().optional().default(0),
  taxRate: z.number().min(0).max(100).optional().default(0),
  stockQuantity: z.number().nonnegative().default(0),
  minStockThreshold: z.number().nonnegative().optional().default(5),
  unit: z.string().optional().default('pcs'),
  packSize: z.string().optional().default('')
});

export const updateProductSchema = createProductSchema.partial();
