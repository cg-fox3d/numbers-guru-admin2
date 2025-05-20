
import { z } from 'zod';
import { slugify } from './utils';

export const loginSchema = z.object({
  email: z.string().email({ message: 'Invalid email address.' }),
  password: z.string().min(6, { message: 'Password must be at least 6 characters.' }),
});

export const productSchema = z.object({
  name: z.string().min(3, { message: 'Product name must be at least 3 characters.' }),
  type: z.enum(['VIP Number', 'Number Pack'], { required_error: 'Product type is required.' }),
  price: z.number().min(0, { message: 'Price must be a positive number.' }).or(z.string().regex(/^\d+(\.\d{1,2})?$/).transform(Number)),
  number: z.string().optional(),
  packDetails: z.string().optional(),
  description: z.string().optional(),
}).superRefine((data, ctx) => {
  if (data.type === 'VIP Number' && (!data.number || data.number.trim() === '')) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'VIP Number is required for this product type.',
      path: ['number'],
    });
  }
  if (data.type === 'Number Pack' && (!data.packDetails || data.packDetails.trim() === '')) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Pack Details are required for this product type.',
      path: ['packDetails'],
    });
  }
});

export type ProductFormValues = z.infer<typeof productSchema>;

export const categorySchema = z.object({
  title: z.string().min(3, { message: 'Category title must be at least 3 characters.' }),
  slug: z.string().optional().transform((val, ctx) => {
    if (val && val.trim() !== '') {
      return slugify(val);
    }
    // If slug is empty, it will be generated from title in the dialog logic
    return val;
  }),
  order: z.preprocess(
    (val) => (typeof val === 'string' ? parseInt(val, 10) : val),
    z.number().min(0, { message: 'Order must be a non-negative number.' })
  ),
  type: z.enum(['individual', 'pack'], { required_error: 'Category type is required.' }),
});

export type CategoryFormValues = z.infer<typeof categorySchema>;
