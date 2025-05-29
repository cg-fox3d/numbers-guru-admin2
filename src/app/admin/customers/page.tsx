
'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { PageHeader } from '@/components/common/PageHeader';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Users, MoreHorizontal, Search as SearchIcon, PackageSearch, RefreshCcw } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { db } from '@/lib/firebase';
import { collection, query, orderBy, Timestamp, getDocs, limit, startAfter, QueryDocumentSnapshot, DocumentData } from 'firebase/firestore';
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

const PAGE_SIZE = 10; // Number of items to fetch per batch

export default function CustomersPage() {
  const [allCustomers, setAllCustomers] = useState<AdminDisplayCustomer[]>([]);
  const [filteredCustomers, setFilteredCustomers] = useState<AdminDisplayCustomer[]>([]);
  
  const [isLoading, setIsLoading] = useState(false);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  
  const [lastVisibleDoc, setLastVisibleDoc] = useState<QueryDocumentSnapshot<DocumentData> | null>(null);
  const [hasMore, setHasMore] = useState(true);
  
  const [searchTerm, setSearchTerm] = useState('');
  const { toast } = useToast();

  const observerRef = useRef<IntersectionObserver | null>(null);
  const loadMoreRef = useRef<HTMLDivElement | null>(null);

  const buildBaseQuery = useCallback(() => {
    return query(collection(db, 'users'), orderBy('createdAt', 'desc'));
  }, []);

  const loadCustomers = useCallback(async (
    cursor: QueryDocumentSnapshot<DocumentData> | null = null,
    isRefresh = false
  ) => {
    if (isLoading && !isRefresh) return;

    setIsLoading(true);
    if (isRefresh) {
      setIsInitialLoading(true);
      setSearchTerm(''); // Clear search on refresh
    }

    try {
      let customersQuery = buildBaseQuery();
      if (cursor) {
        customersQuery = query(customersQuery, startAfter(cursor), limit(PAGE_SIZE));
      } else {
        customersQuery = query(customersQuery, limit(PAGE_SIZE));
      }
      
      const documentSnapshots = await getDocs(customersQuery);
      const fetchedCustomersBatch: AdminDisplayCustomer[] = [];
      documentSnapshots.docs.forEach((docSn) => {
        fetchedCustomersBatch.push({ id: docSn.id, ...docSn.data() } as AdminDisplayCustomer);
      });

      if (isRefresh || !cursor) {
        setAllCustomers(fetchedCustomersBatch);
      } else {
        setAllCustomers(prevCustomers => [...prevCustomers, ...fetchedCustomersBatch]);
      }
      
      const newLastVisibleDoc = documentSnapshots.docs.length > 0 ? documentSnapshots.docs[documentSnapshots.docs.length - 1] : null;
      setLastVisibleDoc(newLastVisibleDoc);
      setHasMore(documentSnapshots.docs.length === PAGE_SIZE);

    } catch (error) {
      console.error("Error fetching customers: ", error);
      toast({
        title: 'Error Fetching Customers',
        description: (error as Error).message || 'Could not load customer data. An index on \'users\' for \'createdAt\' (desc) might be required.',
        variant: 'destructive',
      });
      setHasMore(false); // Stop trying to load more if an error occurs
    } finally {
      setIsLoading(false);
      if (isRefresh) {
        setIsInitialLoading(false);
      }
    }
  }, [toast, buildBaseQuery, isLoading]); // Dependencies for loadCustomers


  // Effect for initial load
  useEffect(() => {
    loadCustomers(null, true);
  }, [loadCustomers]); // loadCustomers is memoized


  // Effect for client-side search filtering
  useEffect(() => {
    const lowercasedFilter = searchTerm.toLowerCase();
    if (searchTerm === '') {
      setFilteredCustomers(allCustomers);
    } else {
      const currentCustomers = allCustomers || [];
      const filteredData = currentCustomers.filter(customer => {
        const nameMatch = customer.name?.toLowerCase().includes(lowercasedFilter);
        const emailMatch = customer.email?.toLowerCase().includes(lowercasedFilter);
        return nameMatch || emailMatch;
      });
      setFilteredCustomers(filteredData);
    }
  }, [searchTerm, allCustomers]);

  // Effect for Intersection Observer - infinite scrolling
  useEffect(() => {
    const currentObserver = observerRef.current; 

    if (isLoading || !hasMore) {
      if (currentObserver && loadMoreRef.current) currentObserver.unobserve(loadMoreRef.current);
      return;
    }

    const observerInstance = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && lastVisibleDoc) { 
          loadCustomers(lastVisibleDoc, false);
        }
      },
      { threshold: 1.0 }
    );

    const currentLoadMoreRef = loadMoreRef.current;
    if (currentLoadMoreRef) {
      observerInstance.observe(currentLoadMoreRef);
    }
    observerRef.current = observerInstance; 

    return () => {
      if (observerInstance && currentLoadMoreRef) {
        observerInstance.unobserve(currentLoadMoreRef);
      }
    };
  }, [isLoading, hasMore, lastVisibleDoc, loadCustomers]);


  const handleRefresh = useCallback(() => {
    loadCustomers(null, true);
  }, [loadCustomers]);

  const displayCustomers = filteredCustomers;

  return (
    <>
      <PageHeader
        title="Customers Management"
        description="View and search customer information from the 'users' collection."
        actions={
          <Button onClick={handleRefresh} variant="outline" size="icon" disabled={isLoading || isInitialLoading}>
            <RefreshCcw className="h-4 w-4" />
            <span className="sr-only">Refresh</span>
          </Button>
        }
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
                Displaying users from the Firestore 'users' collection. Scroll to load more.
                An index on 'users' for 'createdAt' (descending) may be required by Firestore.
              </CardDescription>
            </div>
          </div>
          <div className="mt-4 relative">
            <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search by email or name (on loaded data)..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 w-full md:w-1/2 lg:w-1/3"
              disabled={isInitialLoading && allCustomers.length === 0}
            />
          </div>
        </CardHeader>
        <CardContent className="p-0">
            <ScrollArea className="h-[60vh]"> {/* Ensure height is set for ScrollArea */}
              {isInitialLoading ? (
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
                    {[...Array(Math.floor(PAGE_SIZE / 2))].map((_, i) => (
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
              ) : displayCustomers.length === 0 ? (
                <div className="flex flex-col items-center justify-center text-center p-10 min-h-[300px]">
                  <PackageSearch className="h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-xl font-semibold">
                    {searchTerm ? 'No Customers Match Your Search' : 'No Customers Found'}
                  </h3>
                  <p className="text-muted-foreground">
                    {searchTerm ? 'Try a different search term or clear search.' : "The 'users' collection might be empty or there was an issue fetching data."}
                  </p>
                   {searchTerm && (
                    <Button onClick={() => setSearchTerm('')} variant="outline" className="mt-4">Clear Search</Button>
                  )}
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
                    {displayCustomers.map((customer) => (
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
              <div ref={loadMoreRef} className="h-10 flex items-center justify-center">
                {isLoading && !isInitialLoading && <p className="text-muted-foreground">Loading more customers...</p>}
                {!isLoading && !hasMore && displayCustomers.length > 0 && <p className="text-muted-foreground">No more customers to load.</p>}
              </div>
            </ScrollArea>
        </CardContent>
      </Card>
    </>
  );
}
