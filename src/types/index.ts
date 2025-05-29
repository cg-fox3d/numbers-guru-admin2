
import type { Timestamp } from 'firebase/firestore';
import type { numberPackItemSchema, numberPackSchema, vipNumberSchema, categorySchema } from '@/lib/schemas';
import type { z } from 'zod';

export interface Category {
  id: string;
  title: string;
  slug: string;
  order: number;
  type: 'individual' | 'pack';
  createdAt?: Timestamp; 
  updatedAt?: Timestamp;
}

export type CategoryFormData = z.infer<typeof categorySchema>;


export interface VipNumber {
  id: string; 
  number: string;
  price: number; 
  originalPrice?: number | null; 
  discount?: number | null; 
  status: 'available' | 'sold' | 'booked'; 
  categorySlug: string; 
  description?: string;
  imageHint?: string;
  isVip?: boolean;
  sumOfDigits?: string; // Numerology sum (single digit)
  totalDigits?: string; // Sum of all digits in the number
  createdAt?: Timestamp; 
  updatedAt?: Timestamp;
}
export type VipNumberFormData = z.infer<typeof vipNumberSchema>;


export interface NumberPackItem {
  id?: string; 
  originalVipNumberId?: string; 
  number: string;
  price: number; 
}
export type NumberPackItemFormData = z.infer<typeof numberPackItemSchema>;

export interface NumberPack {
  id: string; 
  name: string; 
  numbers: NumberPackItem[]; 
  totalOriginalPrice?: number | null; 
  status: 'available' | 'sold' | 'partially-sold'; 
  categorySlug: string;
  description?: string;
  imageHint?: string;
  isVipPack?: boolean;
  createdAt?: Timestamp; 
  updatedAt?: Timestamp;
}
export type NumberPackFormData = z.infer<typeof numberPackSchema>;


export interface Customer { 
  id: string;
  name: string;
  email: string;
  phone?: string;
  joinedDate: Date | Timestamp | string; 
  lastOrderDate?: Date | Timestamp | string;
}

export interface AdminDisplayCustomer {
  id: string; 
  email: string;
  name?: string; 
  createdAt: Timestamp; 
}

export interface AdminOrder {
  id: string; // Firestore document ID
  orderId: string; // Your custom order identifier
  customerName: string;
  customerEmail: string;
  customerId: string;
  orderDate: Timestamp;
  amount: number;
  currency: string;
  orderStatus: string; 
  paymentStatus: string; 
  items: string; // Summary string of items
  itemCount: number;
  createdAt?: Timestamp; 
  updatedAt?: Timestamp;
  notes?: {
    email?: string;
    itemCount?: number;
    itemDetails?: string;
    name?: string;
    selectedOriginalVipNumberIds?: string[];
    [key: string]: any; // Allow other potential fields in notes
  };
  userId?: string;
  paymentId?: string;
  receipt?: string;
}

export interface DashboardStats {
  totalRevenue: number;
  newCustomers: number; 
  ordersThisMonth: number;
  productsInStock: number;
}
