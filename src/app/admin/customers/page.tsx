
'use client';

import { useEffect, useState, useCallback } from 'react';
import { PageHeader } from '@/components/common/PageHeader';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Users, MoreHorizontal, Search as SearchIcon } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { db } from '@/lib/firebase';
import { collection, query, orderBy, onSnapshot, Timestamp } from 'firebase/firestore';
import type { AdminDisplayCustomer } from '@/types';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export default function CustomersPage() {
  const [allCustomers, setAllCustomers] = useState<AdminDisplayCustomer[]>([]);
  const [filteredCustomers, setFilteredCustomers] = useState<AdminDisplayCustomer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const { toast } = useToast();

  const fetchCustomers = useCallback(() => {
    setIsLoading(true);
    const q = query(collection(db, 'users'), orderBy('createdAt', 'desc'));
    
    const unsubscribe = onSnapshot(q, 
      (querySnapshot) => {
        const fetchedCustomers: AdminDisplayCustomer[] = [];
        querySnapshot.forEach((doc) => {
          fetchedCustomers.push({ id: doc.id, ...doc.data() } as AdminDisplayCustomer);
        });
        setAllCustomers(fetchedCustomers);
        setFilteredCustomers(fetchedCustomers); // Initialize filtered list
        setIsLoading(false);
      },
      (error) => {
        console.error("Error fetching customers: ", error);
        toast({
          title: 'Error Fetching Customers',
          description: (error as Error).message || 'Could not load customer data.',
          variant: 'destructive',
        });
        setIsLoading(false);
      }
    );
    return unsubscribe;
  }, [toast]);

  useEffect(() => {
    const unsubscribe = fetchCustomers();
    return () => unsubscribe();
  }, [fetchCustomers]);

  useEffect(() => {
    const lowercasedFilter = searchTerm.toLowerCase();
    const filteredData = allCustomers.filter(customer => {
      const nameMatch = customer.name?.toLowerCase().includes(lowercasedFilter);
      const emailMatch = customer.email.toLowerCase().includes(lowercasedFilter);
      return nameMatch || emailMatch;
    });
    setFilteredCustomers(filteredData);
  }, [searchTerm, allCustomers]);

  return (
    <>
      <PageHeader
        title="Customers Management"
        description="View and search customer information from the 'users' collection."
      />
      <Card className="shadow-lg">
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex-1">
              <CardTitle className="flex items-center gap-2">
                <Users className="h-6 w-6 text-primary" />
                <span>Customer List</span>
              </CardTitle>
              <CardDescription>
                Displaying users from the Firestore 'users' collection. Ensure this collection exists and has a 'createdAt' (Timestamp) field.
                An index on 'users' for 'createdAt' (descending) may be required by Firestore.
              </CardDescription>
            </div>
          </div>
          <div className="mt-4 relative">
            <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search by email or name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 w-full md:w-1/2 lg:w-1/3"
            />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading && allCustomers.length === 0 ? ( // Initial loading skeleton
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Customer ID/UID</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Registered On</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {[...Array(5)].map((_, i) => (
                  <TableRow key={`skeleton-${i}`}>
                    <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-48" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-40" /></TableCell>
                    <TableCell className="text-right"><Skeleton className="h-8 w-8 ml-auto" /></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : !isLoading && allCustomers.length === 0 ? ( // No customers at all
            <div className="flex flex-col items-center justify-center text-center p-10">
              <Users className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-xl font-semibold">No Customers Found</h3>
              <p className="text-muted-foreground">
                The 'users' collection might be empty or there was an issue fetching data.
                Ensure your Firestore 'users' collection has documents with a 'createdAt' field.
              </p>
            </div>
          ) : !isLoading && filteredCustomers.length === 0 && searchTerm ? ( // No search results
            <div className="flex flex-col items-center justify-center text-center p-10">
              <SearchIcon className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-xl font-semibold">No Customers Match Your Search</h3>
              <p className="text-muted-foreground">Try a different search term.</p>
            </div>
          ) : ( // Display filtered customers
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Customer ID/UID</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Registered On</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCustomers.map((customer) => (
                  <TableRow key={customer.id}>
                    <TableCell className="font-mono text-xs">{customer.id}</TableCell>
                    <TableCell>{customer.email}</TableCell>
                    <TableCell>{customer.name || 'N/A'}</TableCell>
                    <TableCell>
                      {customer.createdAt instanceof Timestamp
                        ? format(customer.createdAt.toDate(), 'PPp')
                        : typeof customer.createdAt === 'string' 
                          ? customer.createdAt 
                          : 'N/A'}
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0">
                            <span className="sr-only">Open menu</span>
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem disabled>View Details</DropdownMenuItem>
                          <DropdownMenuItem disabled>Edit Customer</DropdownMenuItem>
                           <DropdownMenuItem disabled className="text-destructive focus:text-destructive focus:bg-destructive/10">
                            Delete Customer
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </>
  );
}

