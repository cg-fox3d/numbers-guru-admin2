
'use client';

import { useEffect, useState } from 'react';
import { db } from '@/lib/firebase';
import { collection, query, orderBy, onSnapshot, Timestamp } from 'firebase/firestore';
import type { VipNumber } from '@/types';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { MoreHorizontal, Edit, Trash2, PackageSearch } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';

interface VipNumbersTabProps {
  categoryMap: Record<string, string>;
}

export function VipNumbersTab({ categoryMap }: VipNumbersTabProps) {
  const [vipNumbers, setVipNumbers] = useState<VipNumber[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setIsLoading(true);
    // Ensure 'createdAt' field (Timestamp) exists in your vipNumbers documents for ordering.
    // If not, remove orderBy clause or order by a different field.
    const q = query(collection(db, 'vipNumbers'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, 
      (querySnapshot) => {
        const numbers: VipNumber[] = [];
        querySnapshot.forEach((doc) => {
          numbers.push({ id: doc.id, ...doc.data() } as VipNumber);
        });
        setVipNumbers(numbers);
        setIsLoading(false);
      },
      (error) => {
        console.error("Error fetching VIP numbers: ", error);
        setIsLoading(false);
      }
    );
    return () => unsubscribe();
  }, []);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>VIP Numbers</CardTitle>
          <CardDescription>Individual special mobile numbers.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex items-center justify-between p-2 border rounded-md">
                <div className="flex-1 space-y-1">
                  <Skeleton className="h-5 w-1/3" />
                  <Skeleton className="h-4 w-1/4" />
                </div>
                <Skeleton className="h-8 w-8 ml-4" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (vipNumbers.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>VIP Numbers</CardTitle>
          <CardDescription>Individual special mobile numbers.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center justify-center text-center p-10">
          <PackageSearch className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-xl font-semibold">No VIP Numbers Found</h3>
          <p className="text-muted-foreground">Add your first VIP number to see it listed here.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-lg">
      <CardHeader>
        <CardTitle>VIP Numbers List</CardTitle>
        <CardDescription>Browse and manage individual VIP mobile numbers.</CardDescription>
      </CardHeader>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Number</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Original Price (₹)</TableHead>
              <TableHead>Discount (%)</TableHead>
              <TableHead>Price (₹)</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Created At</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {vipNumbers.map((product) => (
              <TableRow key={product.id}>
                <TableCell className="font-medium">{product.number}</TableCell>
                <TableCell>{categoryMap[product.categorySlug] || product.categorySlug}</TableCell>
                <TableCell>{product.originalPrice?.toLocaleString() || 'N/A'}</TableCell>
                <TableCell>{product.discount ? `${product.discount.toLocaleString()}%` : 'N/A'}</TableCell>
                <TableCell>{product.price.toLocaleString()}</TableCell>
                <TableCell>
                  <Badge 
                    variant={product.status === 'available' ? 'default' : product.status === 'sold' ? 'destructive' : 'secondary'}
                    className="capitalize"
                    >
                    {product.status}
                  </Badge>
                </TableCell>
                <TableCell>
                  {product.createdAt instanceof Timestamp 
                    ? format(product.createdAt.toDate(), 'PPp') 
                    : 'N/A'}
                </TableCell>
                <TableCell className="text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" className="h-8 w-8 p-0" disabled>
                        <span className="sr-only">Open menu</span>
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem disabled>
                        <Edit className="mr-2 h-4 w-4" /> Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem disabled className="text-destructive focus:text-destructive focus:bg-destructive/10">
                        <Trash2 className="mr-2 h-4 w-4" /> Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
