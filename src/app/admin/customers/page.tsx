
'use client';

import { useEffect, useState, useCallback } from 'react';
import { PageHeader } from '@/components/common/PageHeader';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Users, MoreHorizontal, Search as SearchIcon, RefreshCcw, ChevronLeft, ChevronRight, PackageSearch } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { db } from '@/lib/firebase';
import { collection, query, orderBy, Timestamp, getDocs, limit, startAfter, QueryDocumentSnapshot } from 'firebase/firestore';
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

const PAGE_SIZE = 10;

export default function CustomersPage() {
  const [customersOnPage, setCustomersOnPage] = useState<AdminDisplayCustomer[]>([]);
  const [filteredCustomers, setFilteredCustomers] = useState<AdminDisplayCustomer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const { toast } = useToast();

  const [currentPageIndex, setCurrentPageIndex] = useState(0);
  const [pageCursors, setPageCursors] = useState<(QueryDocumentSnapshot<AdminDisplayCustomer> | null)[]>([null]);
  const [hasNextPage, setHasNextPage] = useState(false);
  const [lastFetchedDoc, setLastFetchedDoc] = useState<QueryDocumentSnapshot<AdminDisplayCustomer> | null>(null);

  const buildPageQuery = useCallback((cursor?: QueryDocumentSnapshot<AdminDisplayCustomer> | null) => {
    let q = query(collection(db, 'users'), orderBy('createdAt', 'desc'));
    if (cursor) {
      q = query(q, startAfter(cursor));
    }
    return query(q, limit(PAGE_SIZE + 1));
  }, []);

  const loadCustomers = useCallback(async (pageIdxToLoad: number, options?: { isRefresh?: boolean }) => {
    setIsLoading(true);
    const isActualRefresh = options?.isRefresh || (pageIdxToLoad === 0 && pageCursors.length <= 1 && pageCursors[0] === null);
    let queryCursor: QueryDocumentSnapshot<AdminDisplayCustomer> | null = null;
    let effectivePageIdx = pageIdxToLoad;

    if (isActualRefresh) {
      effectivePageIdx = 0;
      setSearchTerm('');
      setPageCursors([null]);
      setLastFetchedDoc(null);
      if (currentPageIndex !== 0) setCurrentPageIndex(0);
    } else {
      queryCursor = pageCursors[effectivePageIdx] || null;
    }
    
    try {
      const customersQuery = buildPageQuery(queryCursor);
      const documentSnapshots = await getDocs(customersQuery);
      const fetchedCustomers: AdminDisplayCustomer[] = [];
      documentSnapshots.docs.slice(0, PAGE_SIZE).forEach((docSn) => {
        fetchedCustomers.push({ id: docSn.id, ...docSn.data() } as AdminDisplayCustomer);
      });
      setCustomersOnPage(fetchedCustomers);
      const newHasNextPage = documentSnapshots.docs.length > PAGE_SIZE;
      setHasNextPage(newHasNextPage);
      if (newHasNextPage) {
        setLastFetchedDoc(documentSnapshots.docs[PAGE_SIZE - 1] as QueryDocumentSnapshot<AdminDisplayCustomer>);
      } else {
        setLastFetchedDoc(null);
      }
    } catch (error) {
      console.error("Error fetching customers: ", error);
      toast({
        title: 'Error Fetching Customers',
        description: (error as Error).message || 'Could not load customer data. An index on \'users\' for \'createdAt\' (desc) might be required.',
        variant: 'destructive',
      });
      setHasNextPage(false);
    } finally {
      setIsLoading(false);
    }
  }, [toast, buildPageQuery, currentPageIndex, pageCursors]);

  useEffect(() => {
    const isRefreshIntent = currentPageIndex === 0 && (pageCursors.length <=1 && pageCursors[0] === null);
    loadCustomers(currentPageIndex, { isRefresh: isRefreshIntent });
  }, [currentPageIndex, loadCustomers]);

  useEffect(() => {
    const lowercasedFilter = searchTerm.toLowerCase();
    if (searchTerm === '') {
      setFilteredCustomers(customersOnPage);
    } else {
      const filteredData = customersOnPage.filter(customer => {
        const nameMatch = customer.name?.toLowerCase().includes(lowercasedFilter);
        const emailMatch = customer.email.toLowerCase().includes(lowercasedFilter);
        return nameMatch || emailMatch;
      });
      setFilteredCustomers(filteredData);
    }
  }, [searchTerm, customersOnPage]);

  const handleRefresh = useCallback(() => {
    if (currentPageIndex === 0) {
      loadCustomers(0, { isRefresh: true });
    } else {
      setCurrentPageIndex(0);
    }
  }, [currentPageIndex, loadCustomers]);

  const handleNextPage = () => {
    if (hasNextPage && lastFetchedDoc) {
      setPageCursors(prev => {
        const newCursors = [...prev];
        newCursors[currentPageIndex + 1] = lastFetchedDoc;
        return newCursors;
      });
      setCurrentPageIndex(prev => prev + 1);
    }
  };

  const handlePrevPage = () => {
    if (currentPageIndex > 0) {
      setCurrentPageIndex(prev => prev - 1);
    }
  };

  return (
    <>
      <PageHeader
        title="Customers Management"
        description="View and search customer information from the 'users' collection."
        actions={
          <Button onClick={handleRefresh} variant="outline" size="icon" aria-label="Refresh customers" disabled={isLoading}>
            <RefreshCcw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
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
              disabled={isLoading && customersOnPage.length === 0}
            />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading && filteredCustomers.length === 0 ? ( 
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
                {[...Array(Math.min(PAGE_SIZE, 5))].map((_, i) => (
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
          ) : !isLoading && filteredCustomers.length === 0 ? ( 
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
         {(customersOnPage.length > 0 || hasNextPage || currentPageIndex > 0) && !isLoading && (
            <CardFooter className="flex items-center justify-between p-4 border-t">
                <span className="text-sm text-muted-foreground">
                    Page {currentPageIndex + 1}
                </span>
                <div className="flex items-center gap-2">
                    <Button
                    variant="outline"
                    size="sm"
                    onClick={handlePrevPage}
                    disabled={currentPageIndex === 0 || isLoading}
                    >
                    <ChevronLeft className="mr-1 h-4 w-4" />
                    Previous
                    </Button>
                    <Button
                    variant="outline"
                    size="sm"
                    onClick={handleNextPage}
                    disabled={!hasNextPage || isLoading}
                    >
                    Next
                    <ChevronRight className="ml-1 h-4 w-4" />
                    </Button>
                </div>
            </CardFooter>
        )}
      </Card>
    </>
  );
}
