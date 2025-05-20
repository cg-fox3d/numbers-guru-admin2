'use client';

import { useState } from 'react';
import { Input } from '@/components/ui/input';
import type { Customer } from '@/types';
import { Search } from 'lucide-react';
import { CustomerTable } from './CustomerTable';
import { PageHeader } from '@/components/common/PageHeader';


const initialCustomers: Customer[] = [
  { id: '1', name: 'Aarav Sharma', email: 'aarav.sharma@example.com', phone: '9876543210', joinedDate: new Date('2023-01-15'), lastOrderDate: new Date('2023-10-05') },
  { id: '2', name: 'Priya Patel', email: 'priya.patel@example.com', phone: '8765432109', joinedDate: new Date('2023-03-22'), lastOrderDate: new Date('2023-11-01') },
  { id: '3', name: 'Rohan Singh', email: 'rohan.singh@example.com', joinedDate: new Date('2023-05-10') },
  { id: '4', name: 'Sneha Reddy', email: 'sneha.reddy@example.com', phone: '7654321098', joinedDate: new Date('2023-07-01'), lastOrderDate: new Date('2023-09-15') },
];

export function CustomerClientPage() {
  const [customers] = useState<Customer[]>(initialCustomers);
  const [searchTerm, setSearchTerm] = useState('');
  
  const filteredCustomers = customers.filter(customer => 
    customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    customer.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (customer.phone && customer.phone.includes(searchTerm))
  );

  return (
    <>
      <PageHeader
        title="Customer List"
        description="View and search your customer database."
      />

      <div className="mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
          <Input 
            placeholder="Search customers by name, email, or phone..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 w-full md:w-1/2 lg:w-1/3"
          />
        </div>
      </div>
      
      <CustomerTable customers={filteredCustomers} />
    </>
  );
}
