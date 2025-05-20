
'use client';

import { useEffect, useState } from 'react';
import { db } from '@/lib/firebase';
import { collection, query, orderBy, onSnapshot, Timestamp } from 'firebase/firestore';
import type { NumberPack } from '@/types';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { MoreHorizontal, Edit, Trash2, PackageSearch } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { format } from 'date-fns';

export function NumberPacksTab() {
  const [numberPacks, setNumberPacks] = useState<NumberPack[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setIsLoading(true);
    const q = query(collection(db, 'numberPacks'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, 
      (querySnapshot) => {
        const packs: NumberPack[] = [];
        querySnapshot.forEach((doc) => {
          packs.push({ id: doc.id, ...doc.data() } as NumberPack);
        });
        setNumberPacks(packs);
        setIsLoading(false);
      },
      (error) => {
        console.error("Error fetching number packs: ", error);
        setIsLoading(false);
        // Handle error display appropriately
      }
    );
    return () => unsubscribe();
  }, []);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Number Packs</CardTitle>
          <CardDescription>Bundles of multiple mobile numbers.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="flex items-center justify-between p-2 border rounded-md">
                <div className="space-y-1">
                  <Skeleton className="h-5 w-32" />
                  <Skeleton className="h-4 w-24" />
                </div>
                <Skeleton className="h-8 w-8" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (numberPacks.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Number Packs</CardTitle>
          <CardDescription>Bundles of multiple mobile numbers.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center justify-center text-center p-10">
          <PackageSearch className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-xl font-semibold">No Number Packs Found</h3>
          <p className="text-muted-foreground">Create your first number pack to see it listed here.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-lg">
      <CardHeader>
        <CardTitle>Number Packs List</CardTitle>
        <CardDescription>Browse and manage number pack bundles.</CardDescription>
      </CardHeader>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Pack Name</TableHead>
              <TableHead>Items in Pack</TableHead>
              <TableHead>Pack Price (₹)</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Description</TableHead>
              <TableHead>Created At</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {numberPacks.map((pack) => (
              <TableRow key={pack.id}>
                <TableCell className="font-medium">{pack.packName}</TableCell>
                <TableCell>{pack.itemsCount}</TableCell>
                <TableCell>{pack.packPrice.toLocaleString()}</TableCell>
                <TableCell>{pack.status}</TableCell>
                <TableCell>{pack.categoryName || pack.categoryId || 'N/A'}</TableCell>
                <TableCell className="max-w-xs truncate">{pack.description || 'N/A'}</TableCell>
                 <TableCell>
                  {pack.createdAt instanceof Timestamp 
                    ? format(pack.createdAt.toDate(), 'PPp') 
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
