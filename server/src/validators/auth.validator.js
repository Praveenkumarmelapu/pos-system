import { z } from 'zod';

export const registerShopSchema = z.object({
  shopName: z.string().min(2, 'Shop name must be at least 2 characters').trim(),
  ownerName: z.string().min(2, 'Owner name must be at least 2 characters').trim(),
  email: z.string().email('Invalid email address').toLowerCase().trim(),
  phone: z.string().min(10, 'Phone must be at least 10 digits').trim(),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  businessCategory: z.string().optional().default('Kirana & Grocery'),
  gstin: z.string().optional().nullable(),
  address: z.object({
    street: z.string().optional().default(''),
    city: z.string().optional().default(''),
    state: z.string().optional().default(''),
    pincode: z.string().optional().default(''),
    country: z.string().optional().default('India')
  }).optional()
});

export const loginSchema = z.object({
  email: z.string().email('Invalid email address').toLowerCase().trim(),
  password: z.string().min(1, 'Password is required')
});
