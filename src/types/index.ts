
import type { Timestamp } from 'firebase/firestore';

export interface Category {
  id: string;
  title: string;
  slug: string;
  order: number; // Ensure this is a number in Firestore for correct sorting
  type: 'individual' | 'pack';
  createdAt: Timestamp;
}

export interface VipNumber {
  id: string; // Firestore document ID
  number: string;
  price: number; // Selling price
  originalPrice?: number; // Optional: original price before discount
  discount?: number; // Optional: discount percentage or amount
  status: 'available' | 'sold' | 'booked'; // Example statuses
  categorySlug: string; 
  // Optional fields from your structure:
  imageHint?: string;
  isVip?: boolean;
  sumOfDigits?: string;
  totalDigits?: string;
  // Recommended for ordering:
  createdAt: Timestamp; 
}

export interface NumberPackItem {
  id: string; // Corresponds to a vipNumber document ID or a unique identifier for the number in the pack
  number: string;
  price: number; // Original price of this individual number if it were sold alone
}

export interface NumberPack {
  id: string; // Firestore document ID
  name: string; // Pack name, e.g., "Value Family Pack"
  numbers: NumberPackItem[]; // Array of numbers in the pack
  packPrice: number; // Selling price of the pack
  totalOriginalPrice?: number; // Optional: Sum of original prices of numbers in the pack
  status: 'available' | 'sold'; // Example statuses
  categorySlug: string;
  description?: string;
  // Optional fields from your structure:
  imageHint?: string;
  isVipPack?: boolean;
  // Recommended for ordering:
  createdAt: Timestamp;
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
