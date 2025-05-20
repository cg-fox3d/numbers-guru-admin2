
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
  sumOfDigits?: string;
  totalDigits?: string;
  createdAt?: Timestamp; 
  updatedAt?: Timestamp;
}
export type VipNumberFormData = z.infer<typeof vipNumberSchema>;


export interface NumberPackItem {
  id?: string; 
  number: string;
  price: number; 
}
export type NumberPackItemFormData = z.infer<typeof numberPackItemSchema>;

export interface NumberPack {
  id: string; 
  name: string; 
  numbers: NumberPackItem[]; 
  packPrice: number; 
  totalOriginalPrice?: number | null; 
  status: 'available' | 'sold'; 
  categorySlug: string;
  description?: string;
  imageHint?: string;
  isVipPack?: boolean;
  createdAt?: Timestamp; 
  updatedAt?: Timestamp;
}
export type NumberPackFormData = z.infer<typeof numberPackSchema>;


export interface Customer { // This type might be for a different context, keeping it for now.
  id: string;
  name: string;
  email: string;
  phone?: string;
  joinedDate: Date | Timestamp | string; 
  lastOrderDate?: Date | Timestamp | string;
}

export interface AdminDisplayCustomer {
  id: string; // Firestore document ID (should be user's UID from Auth)
  email: string;
  name?: string; // or displayName
  createdAt: Timestamp; // Represents registration time or when user doc was created
}

export interface AdminOrder {
  id: string; 
  orderId: string; 
  customerName: string; 
  date: Timestamp;
  totalAmount: number;
  status: string;
  createdAt: Timestamp;
}

export interface DashboardStats {
  totalRevenue: number;
  newCustomers: number; 
  ordersThisMonth: number;
  productsInStock: number;
}

