
'use client';

import { useEffect, useState, useCallback } from 'react';
import { PageHeader } from '@/components/common/PageHeader';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Users, MoreHorizontal, Search as SearchIcon, PackageSearch } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { db } from '@/lib/firebase';
import { collection, query, orderBy, Timestamp, getDocs } from 'firebase/firestore';
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

  const loadCustomers = useCallback(async () => {
    setIsLoading(true);
    setSearchTerm(''); // Reset search on full load
    try {
      const customersQuery = query(collection(db, 'users'), orderBy('createdAt', 'desc'));
      const documentSnapshots = await getDocs(customersQuery);
      const fetchedCustomers: AdminDisplayCustomer[] = [];
      documentSnapshots.docs.forEach((docSn) => {
        fetchedCustomers.push({ id: docSn.id, ...docSn.data() } as AdminDisplayCustomer);
      });
      setAllCustomers(fetchedCustomers);
      setFilteredCustomers(fetchedCustomers);
    } catch (error) {
      console.error("Error fetching customers: ", error);
      setAllCustomers([]);
      setFilteredCustomers([]);
      toast({
        title: 'Error Fetching Customers',
        description: (error as Error).message || 'Could not load customer data. An index on \'users\' for \'createdAt\' (desc) might be required.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    loadCustomers();
  }, [loadCustomers]);

  useEffect(() => {
    const lowercasedFilter = searchTerm.toLowerCase();
    const currentCustomers = allCustomers || [];

    if (searchTerm === '') {
      setFilteredCustomers(currentCustomers);
    } else {
      const filteredData = currentCustomers.filter(customer => {
        const nameMatch = customer.name?.toLowerCase().includes(lowercasedFilter);
        const emailMatch = customer.email?.toLowerCase().includes(lowercasedFilter);
        return nameMatch || emailMatch;
      });
      setFilteredCustomers(filteredData);
    }
  }, [searchTerm, allCustomers]);

  return (
    <>
      <PageHeader
        title="Customers Management"
        description="View and search customer information from the 'users' collection."
        // No refresh button action needed here anymore
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
              disabled={isLoading && (allCustomers || []).length === 0}
            />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading && (filteredCustomers || []).length === 0 ? ( 
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
          ) : !isLoading && (filteredCustomers || []).length === 0 ? ( 
            <div className="flex flex-col items-center justify-center text-center p-10">
              <PackageSearch className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-xl font-semibold">
                 {searchTerm ? 'No Customers Match Your Search' : 'No Customers Found'}
              </h3>
              <p className="text-muted-foreground">
                {searchTerm ? 'Try a different search term.' : "The 'users' collection might be empty or there was an issue fetching data."}
              </p>
            </div>
          ) : ( 
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
                {(filteredCustomers || []).map((customer) => (
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
                          <Button variant="ghost" className="h-8 w-8 p-0" disabled>
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
