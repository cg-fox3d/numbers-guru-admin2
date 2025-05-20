
import type { Timestamp } from 'firebase/firestore';

// Old Product type, can be removed or refactored if not used elsewhere.
// For now, commenting out to avoid conflict with new product types.
/*
export interface Product {
  id: string;
  name: string;
  type: 'VIP Number' | 'Number Pack';
  price: number;
  description?: string;
  number?: string; // For VIP Number
  packDetails?: string; // For Number Pack
  createdAt: Date | Timestamp; // Allow both for flexibility during transition
}
*/

export interface Category {
  id: string;
  title: string;
  slug: string;
  order: number;
  type: 'individual' | 'pack';
  createdAt: Timestamp;
}

export interface VipNumber {
  id: string;
  number: string;
  price: number;
  status: string;
  categoryId?: string; // Optional for now, can be made required
  categoryName?: string; // Denormalized for display
  description?: string;
  createdAt: Timestamp;
}

export interface NumberPack {
  id: string;
  packName: string;
  itemsCount: number;
  packPrice: number;
  status: string;
  categoryId?: string; // Optional for now
  categoryName?: string; // Denormalized for display
  description?: string;
  createdAt: Timestamp;
}

// Keeping this for the customer list page in src/components/customers
export interface Customer {
  id: string;
  name: string;
  email: string;
  phone?: string;
  joinedDate: Date | Timestamp | string; // Allow various types from mock/Firestore
  lastOrderDate?: Date | Timestamp | string;
}

// For the admin/customers placeholder page
export interface AdminDisplayCustomer {
  id: string; // UID from Auth
  email: string;
  name?: string; // Display name
  registeredOn: Timestamp;
  createdAt?: Timestamp; // If synced to a 'users' collection
}

export interface AdminOrder {
  id: string; // Firestore document ID
  orderId: string; // Custom order ID
  customerName: string; // Or customerId
  date: Timestamp;
  totalAmount: number;
  status: string;
  createdAt: Timestamp;
}

export interface DashboardStats {
  totalRevenue: number;
  newCustomers: number; // Placeholder, as direct Auth user count is tricky client-side
  ordersThisMonth: number;
  productsInStock: number;
}
