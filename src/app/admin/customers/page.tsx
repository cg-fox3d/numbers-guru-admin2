
'use client';

import { useEffect, useState, useCallback } from 'react';
import { PageHeader } from '@/components/common/PageHeader';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Users, MoreHorizontal, Search as SearchIcon, PackageSearch, RefreshCcw, ChevronLeft, ChevronRight } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
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

const PAGE_SIZE = 10;

export default function CustomersPage() {
  const [customersOnPage, setCustomersOnPage] = useState<AdminDisplayCustomer[]>([]);
  const [filteredCustomers, setFilteredCustomers] = useState<AdminDisplayCustomer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const { toast } = useToast();

  const [currentPageIndex, setCurrentPageIndex] = useState(0);
  // pageStartCursors[i] stores the first document of page i. pageStartCursors[0] is null.
  const [pageStartCursors, setPageStartCursors] = useState<(QueryDocumentSnapshot<DocumentData> | null)[]>([null]);
  const [lastVisibleDoc, setLastVisibleDoc] = useState<QueryDocumentSnapshot<DocumentData> | null>(null);
  const [firstVisibleDoc, setFirstVisibleDoc] = useState<QueryDocumentSnapshot<DocumentData> | null>(null);
  const [hasNextPage, setHasNextPage] = useState(false);

  const buildPageQuery = useCallback((cursor: QueryDocumentSnapshot<DocumentData> | null) => {
    let q = query(collection(db, 'users'), orderBy('createdAt', 'desc'));
    if (cursor) {
      q = query(q, startAfter(cursor), limit(PAGE_SIZE + 1));
    } else {
      q = query(q, limit(PAGE_SIZE + 1));
    }
    return q;
  }, []);

  const loadCustomers = useCallback(async (pageIdxToLoad: number, options: { isRefresh?: boolean } = {}) => {
    setIsLoading(true);
    if (options.isRefresh) {
      setSearchTerm('');
    }

    try {
      let queryCursor: QueryDocumentSnapshot<DocumentData> | null = null;

      if (options.isRefresh || pageIdxToLoad === 0) {
        queryCursor = null;
        if (options.isRefresh) { // Full reset for refresh
             setPageStartCursors([null]);
        }
      } else if (pageIdxToLoad > 0 && pageIdxToLoad < pageStartCursors.length) {
        queryCursor = pageStartCursors[pageIdxToLoad];
      } else if (pageIdxToLoad > 0 && lastVisibleDoc && pageIdxToLoad === pageStartCursors.length) {
        // Trying to go to a new next page, so current lastVisibleDoc is the cursor
        queryCursor = lastVisibleDoc;
      }


      const customersQuery = buildPageQuery(queryCursor);
      const documentSnapshots = await getDocs(customersQuery);

      const fetchedCustomers: AdminDisplayCustomer[] = [];
      documentSnapshots.docs.slice(0, PAGE_SIZE).forEach((docSn) => {
        fetchedCustomers.push({ id: docSn.id, ...docSn.data() } as AdminDisplayCustomer);
      });

      setCustomersOnPage(fetchedCustomers);

      const newFirstVisibleDoc = documentSnapshots.docs.length > 0 ? documentSnapshots.docs[0] : null;
      setFirstVisibleDoc(newFirstVisibleDoc);

      const newLastVisibleDoc = documentSnapshots.docs.length > PAGE_SIZE
        ? documentSnapshots.docs[PAGE_SIZE - 1]
        : (documentSnapshots.docs.length > 0 ? documentSnapshots.docs[documentSnapshots.docs.length -1] : null);
      setLastVisibleDoc(newLastVisibleDoc);

      const newHasNextPage = documentSnapshots.docs.length > PAGE_SIZE;
      setHasNextPage(newHasNextPage);
      
      if (options.isRefresh || pageIdxToLoad === 0) {
        // Reset cursors, keeping null for page 0 and adding start of page 0 if docs exist
        setPageStartCursors(newFirstVisibleDoc ? [null, newFirstVisibleDoc] : [null]);
      } else if (pageIdxToLoad >= pageStartCursors.length && newFirstVisibleDoc && queryCursor === lastVisibleDoc) {
        // This means we successfully navigated to a new "next" page
        setPageStartCursors(prev => [...prev, newFirstVisibleDoc]);
      }


    } catch (error) {
      console.error("Error fetching customers: ", error);
      toast({
        title: 'Error Fetching Customers',
        description: (error as Error).message || 'Could not load customer data. An index on \'users\' for \'createdAt\' (desc) might be required.',
        variant: 'destructive',
      });
      setCustomersOnPage([]);
      setHasNextPage(false);
    } finally {
      setIsLoading(false);
    }
  }, [toast, buildPageQuery]); // Removed pageStartCursors, lastVisibleDoc

  useEffect(() => {
    loadCustomers(currentPageIndex, {isRefresh: currentPageIndex === 0 && pageStartCursors.length <=1 });
  }, [currentPageIndex, loadCustomers]); // loadCustomers is memoized

  useEffect(() => {
    if (searchTerm === '') {
      setFilteredCustomers(customersOnPage);
    } else {
      const lowercasedFilter = searchTerm.toLowerCase();
      // Client-side search on the current page's data
      const currentCustomers = customersOnPage || [];
      const filteredData = currentCustomers.filter(customer => {
        const nameMatch = customer.name?.toLowerCase().includes(lowercasedFilter);
        const emailMatch = customer.email?.toLowerCase().includes(lowercasedFilter);
        return nameMatch || emailMatch;
      });
      setFilteredCustomers(filteredData);
    }
  }, [searchTerm, customersOnPage]);

  const handleRefresh = useCallback(() => {
    if (currentPageIndex === 0) {
        loadCustomers(0, { isRefresh: true });
    } else {
        setCurrentPageIndex(0); // This will trigger useEffect to load page 0 with refresh logic
    }
  }, [loadCustomers, currentPageIndex]);

  const handleNextPage = () => {
    if (hasNextPage) {
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
          <Button onClick={handleRefresh} variant="outline" size="icon" disabled={isLoading}>
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
                Displaying users from the Firestore 'users' collection.
                An index on 'users' for 'createdAt' (descending) may be required by Firestore.
              </CardDescription>
            </div>
          </div>
          <div className="mt-4 relative">
            <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search by email or name on current page..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 w-full md:w-1/2 lg:w-1/3"
              disabled={isLoading && (customersOnPage || []).length === 0}
            />
          </div>
        </CardHeader>
        <CardContent className="p-0 min-h-[300px]">
          {isLoading ? (
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
            <div className="flex flex-col items-center justify-center text-center p-10 min-h-[300px]">
              <PackageSearch className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-xl font-semibold">
                 {searchTerm ? 'No Customers Match Your Search' :
                  (customersOnPage || []).length === 0 ? 'No Customers Found' : 'No Customers Match Your Search'}
              </h3>
              <p className="text-muted-foreground">
                {searchTerm ? 'Try a different search term or clear search.' :
                 (customersOnPage || []).length === 0 ? "The 'users' collection might be empty or there was an issue fetching data." : 'Adjust your search.'}
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
        {(customersOnPage || []).length > 0 && (
            <CardFooter className="flex items-center justify-between p-4 border-t">
                <span className="text-sm text-muted-foreground">
                    Page {currentPageIndex + 1}
                </span>
                <div className="flex gap-2">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={handlePrevPage}
                        disabled={currentPageIndex === 0 || isLoading}
                    >
                        <ChevronLeft className="h-4 w-4 mr-1" /> Previous
                    </Button>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={handleNextPage}
                        disabled={!hasNextPage || isLoading}
                    >
                        Next <ChevronRight className="h-4 w-4 ml-1" />
                    </Button>
                </div>
            </CardFooter>
        )}
      </Card>
    </>
  );
}
