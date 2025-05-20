import { z } from 'zod';

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
