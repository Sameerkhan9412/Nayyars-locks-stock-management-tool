import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().email({ message: 'Invalid email address' }),
  password: z.string().min(6, { message: 'Password must be at least 6 characters' }),
});

export const signupSchema = z.object({
  name: z.string().min(2, { message: 'Name must be at least 2 characters' }),
  email: z.string().email({ message: 'Invalid email address' }),
  password: z.string().min(6, { message: 'Password must be at least 6 characters' }),
});

export const categorySchema = z.object({
  name: z.string().min(2, { message: 'Category name must be at least 2 characters' }),
});

export const subcategorySchema = z.object({
  name: z.string().min(2, { message: 'Subcategory name must be at least 2 characters' }),
  categoryId: z.string().min(1, { message: 'Please select a category' }),
});

export const productSchema = z.object({
  name: z.string().min(1, { message: 'Product name is required' }),
  categoryId: z.string().min(1, { message: 'Please select a category' }),
  subcategoryId: z.string().optional().nullable().or(z.literal('')),
  stock: z.coerce.number().min(0, { message: 'Initial stock must be 0 or greater' }),
  lowStockLimit: z.coerce.number().min(0, { message: 'Low stock limit must be 0 or greater' }),
});

export const stockAdjustmentSchema = z.object({
  quantity: z.coerce.number().min(1, { message: 'Quantity must be greater than 0' }),
  type: z.enum(['IN', 'OUT']).optional(),
  note: z.string().optional().nullable(),
});
