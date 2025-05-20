
import type { Timestamp } from 'firebase/firestore';

export interface Category {
  id: string;
  title: string;
  slug: string;
  order: number;
  type: 'individual' | 'pack';
  createdAt: Timestamp;
}

// This is for form data, matches the schema
export interface CategoryFormData {
  title: string;
  slug?: string; // Optional in form, will be auto-generated if empty
  order: number;
  type: 'individual' | 'pack';
}


export interface VipNumber {
  id: string; // Firestore document ID
  number: string;
  price: number; // Selling price
  originalPrice?: number; // Optional: original price before discount
  discount?: number; // Optional: discount percentage or amount
  status: 'available' | 'sold' | 'booked'; // Example statuses
  categorySlug: string; 
  imageHint?: string;
  isVip?: boolean;
  sumOfDigits?: string;
  totalDigits?: string;
  createdAt?: Timestamp; // Should be Timestamp for ordering
}

export interface NumberPackItem {
  id: string; 
  number: string;
  price: number; 
}

export interface NumberPack {
  id: string; 
  name: string; 
  numbers: NumberPackItem[]; 
  packPrice: number; 
  totalOriginalPrice?: number; 
  status: 'available' | 'sold'; 
  categorySlug: string;
  description?: string;
  imageHint?: string;
  isVipPack?: boolean;
  createdAt?: Timestamp; // Should be Timestamp for ordering
}

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
  registeredOn: Timestamp;
  createdAt?: Timestamp; 
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
