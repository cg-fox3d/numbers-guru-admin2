
import { z } from 'zod';
import { slugify } from './utils';

export const loginSchema = z.object({
  email: z.string().email({ message: 'Invalid email address.' }),
  password: z.string().min(6, { message: 'Password must be at least 6 characters.' }),
});

export const categorySchema = z.object({
  title: z.string().min(3, { message: 'Category title must be at least 3 characters.' }),
  slug: z.string().optional().transform((val, ctx) => {
    if (val && val.trim() !== '') {
      return slugify(val);
    }
    return val;
  }),
  order: z.preprocess(
    (val) => (typeof val === 'string' && val.trim() !== '' ? parseInt(val, 10) : (typeof val === 'number' ? val : 0)),
    z.number().min(0, { message: 'Order must be a non-negative number.' })
  ),
  type: z.enum(['individual', 'pack'], { required_error: 'Category type is required.' }),
});

export type CategoryFormData = z.infer<typeof categorySchema>;


export const vipNumberSchema = z.object({
  number: z.string().min(1, { message: 'VIP Number is required.' }).regex(/^\d+([-\s]?\d+)*$/, { message: 'Number must contain only digits and optional hyphens/spaces.' }),
  price: z.preprocess(
    (val) => {
      if (typeof val === 'string' && val.trim() !== '') return parseFloat(val.replace(/,/g, ''));
      if (typeof val === 'number') return val;
      return undefined; 
    },
    z.number({ required_error: "Price is required.", invalid_type_error: "Price must be a number." }).min(0, { message: 'Price must be a positive number.' })
  ),
  originalPrice: z.preprocess(
    (val) => {
      if (typeof val === 'string' && val.trim() !== '') return parseFloat(val.replace(/,/g, ''));
      if (typeof val === 'number') return val;
      return null; 
    },
    z.number({ invalid_type_error: "Original price must be a number." }).min(0, { message: 'Original price must be positive.' }).optional().nullable()
  ),
  discount: z.preprocess(
    (val) => {
      if (typeof val === 'string' && val.trim() !== '') return parseFloat(val.replace(/%/g, ''));
      if (typeof val === 'number') return val;
      return null; 
    },
    z.number({ invalid_type_error: "Discount must be a number." }).min(0).max(100, { message: 'Discount must be between 0 and 100.' }).optional().nullable()
  ),
  status: z.enum(['available', 'sold', 'booked'], { required_error: 'Status is required.' }),
  categorySlug: z.string().min(1, { message: 'Category Slug is required.' }),
  description: z.string().optional(),
  imageHint: z.string().max(50, { message: "Image hint cannot exceed 50 characters." }).optional(),
  isVip: z.boolean().optional().default(false),
  sumOfDigits: z.string().optional(),
  totalDigits: z.string().optional(),
});

export type VipNumberFormData = z.infer<typeof vipNumberSchema>;

export const numberPackItemSchema = z.object({
  id: z.string().optional(), 
  originalVipNumberId: z.string().optional(), // ID of the VIP number if selected
  number: z.string().min(1, { message: 'Number is required.' }).regex(/^\d+([-\s]?\d+)*$/, { message: 'Number must contain only digits and optional hyphens/spaces.' }),
  price: z.preprocess(
    (val) => {
      if (typeof val === 'string' && val.trim() !== '') return parseFloat(val.replace(/,/g, ''));
      if (typeof val === 'number') return val;
      return undefined;
    },
    z.number({ required_error: "Price for item is required.", invalid_type_error: "Item price must be a number." }).min(0, { message: 'Item price must be positive.' })
  ),
});

export type NumberPackItemFormData = z.infer<typeof numberPackItemSchema>;

export const numberPackSchema = z.object({
  name: z.string().min(3, { message: 'Pack name must be at least 3 characters.' }),
  numbers: z.array(numberPackItemSchema).min(1, { message: 'At least one number must be added to the pack.' }),
  packPrice: z.preprocess(
    (val) => {
      if (typeof val === 'string' && val.trim() !== '') return parseFloat(val.replace(/,/g, ''));
      if (typeof val === 'number') return val;
      return undefined;
    },
    z.number({ required_error: "Pack price is required.", invalid_type_error: "Pack price must be a number." }).min(0, { message: 'Pack price must be positive.' })
  ),
  totalOriginalPrice: z.preprocess(
    (val) => {
      if (typeof val === 'string' && val.trim() !== '') return parseFloat(val.replace(/,/g, ''));
      if (typeof val === 'number') return val;
      return null;
    },
    z.number({ invalid_type_error: "Total original price must be a number." }).min(0).optional().nullable()
  ),
  status: z.enum(['available', 'sold'], { required_error: 'Status is required.' }),
  categorySlug: z.string().min(1, { message: 'Category Slug is required.' }),
  description: z.string().optional(),
  imageHint: z.string().max(50, { message: "Image hint cannot exceed 50 characters." }).optional(),
  isVipPack: z.boolean().optional().default(false),
});

export type NumberPackFormData = z.infer<typeof numberPackSchema>;

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
