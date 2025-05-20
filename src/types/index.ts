export interface Product {
  id: string;
  name: string;
  type: 'VIP Number' | 'Number Pack';
  price: number;
  description?: string;
  number?: string; // For VIP Number
  packDetails?: string; // For Number Pack
  createdAt: Date;
}

export interface Customer {
  id: string;
  name: string;
  email: string;
  phone?: string;
  joinedDate: Date;
  lastOrderDate?: Date;
}
