
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
  id: string; // Firestore document ID, which should be the Firebase Auth UID
  email: string;
  name?: string | null; // Can be optional or null
  createdAt: Timestamp; // Registration date or when the Firestore record was created
  // Add any other fields you store in your 'users' collection and want to display
  // For example:
  // lastLoginAt?: Timestamp;
  // phone?: string;
  // address?: string;
}

export interface AdminOrder {
  id: string; 
  orderId: string; 
  customerName: string;
  customerEmail: string;
  customerId: string; // UID of the customer
  orderDate: Timestamp;
  amount: number;
  currency: string;
  orderStatus: string; 
  paymentStatus: string; 
  items: string; 
  itemCount: number;
  createdAt?: Timestamp; 
  updatedAt?: Timestamp;
  notes?: {
    email?: string;
    itemCount?: number;
    itemDetails?: string; // This seems to be the same as `items` in the main structure.
    name?: string;
    selectedOriginalVipNumberIds?: string[];
    [key: string]: any; 
  };
  userId?: string; // This is likely the same as customerId
  paymentId?: string;
  receipt?: string;
}

export interface Transaction {
  id: string; // Firestore document ID
  paymentId: string;
  orderId: string;
  amount: number;
  currency: string;
  status: string; 
  method?: string; 
  email?: string; 
  userId?: string; // Firebase Auth UID of the user associated with the transaction
  provider?: string; 
  razorpaySignature?: string;
  verified?: boolean;
  createdAt: Timestamp; 
  updatedAt?: Timestamp;
}

export interface Refund {
  id: string; // Firestore document ID
  refundId: string;
  paymentId: string;
  orderId: string;
  amount: number;
  currency: string;
  status: string; // e.g., "refunded", "processing", "failed"
  receipt?: string;
  createdAt: Timestamp; // Use this as the primary "Refund Date" for sorting/display
  updatedAt?: Timestamp;
  // customerEmail can be fetched via join/lookup if needed, or denormalized
}

export interface DashboardStats {
  totalRevenue: number;
  newCustomersThisMonth: number; 
  ordersThisMonth: number;
  vipNumbersInStock: number;
  numberPacksInStock: number;
  totalCustomers: number;
  totalOrders: number;
  totalRefunds: number;
  monthlyOrdersData: { month: string; orders: number }[];
}

export interface ProductActiveFilters {
  dateFrom?: Date;
  dateTo?: Date;
  status?: string;
  categorySlug?: string;
  minPrice?: number;
  maxPrice?: number;
}
