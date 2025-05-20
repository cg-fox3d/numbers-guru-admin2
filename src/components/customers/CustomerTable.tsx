'use client';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import type { Customer } from '@/types';
import { format, parseISO } from 'date-fns';
import Image from 'next/image';
import { UserCircle } from 'lucide-react';


interface CustomerTableProps {
  customers: Customer[];
}

export function CustomerTable({ customers }: CustomerTableProps) {

  const getInitials = (name: string) => {
    const nameParts = name.split(' ');
    if (nameParts.length > 1) {
      return (nameParts[0][0] + nameParts[nameParts.length - 1][0]).toUpperCase();
    }
    return name.substring(0,2).toUpperCase();
  };
  
  if (customers.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-md border border-dashed p-12 text-center">
        <Image src="https://placehold.co/300x200.png" alt="No customers" width={300} height={200} className="mb-4 rounded-md opacity-70" data-ai-hint="empty list people"/>
        <h3 className="text-xl font-semibold">No Customers Found</h3>
        <p className="text-muted-foreground">Your customer list is currently empty. New customers will appear here.</p>
      </div>
    );
  }

  return (
    <Card className="shadow-lg">
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Customer</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead>Joined Date</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {customers.map((customer) => (
              <TableRow key={customer.id}>
                <TableCell>
                  <div className="flex items-center gap-3">
                    <Avatar className="h-9 w-9">
                      {/* Assuming no avatar URLs for customers, use fallback */}
                      <AvatarFallback>{getInitials(customer.name) || <UserCircle />}</AvatarFallback>
                    </Avatar>
                    <div className="font-medium">{customer.name}</div>
                  </div>
                </TableCell>
                <TableCell>{customer.email}</TableCell>
                <TableCell>{customer.phone || 'N/A'}</TableCell>
                <TableCell>{format(customer.joinedDate instanceof Date ? customer.joinedDate : parseISO(customer.joinedDate as unknown as string), 'PPP')}</TableCell>
                <TableCell>
                  <Badge variant={customer.lastOrderDate ? 'default' : 'secondary'}>
                    {customer.lastOrderDate ? 'Active' : 'New'}
                  </Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
