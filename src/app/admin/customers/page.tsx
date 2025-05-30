
'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { PageHeader } from '@/components/common/PageHeader';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Users, MoreHorizontal, Search as SearchIcon, PackageSearch, RefreshCcw, Eye, Trash2 } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { db } from '@/lib/firebase';
import { collection, query, orderBy, Timestamp, getDocs, limit, startAfter, QueryDocumentSnapshot, DocumentData, QueryConstraint, doc, deleteDoc } from 'firebase/firestore';
import type { AdminDisplayCustomer } from '@/types';
import { format, isValid } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { CustomerDetailsDialog } from '@/components/customers/CustomerDetailsDialog';


const PAGE_SIZE = 10;

export default function CustomersPage() {
  const [allCustomers, setAllCustomers] = useState<AdminDisplayCustomer[]>([]);
  const [filteredCustomers, setFilteredCustomers] = useState<AdminDisplayCustomer[]>([]);
  
  const [isLoading, setIsLoading] = useState(false);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  
  const [lastVisibleDoc, setLastVisibleDoc] = useState<QueryDocumentSnapshot<DocumentData> | null>(null);
  const [firstVisibleDoc, setFirstVisibleDoc] = useState<QueryDocumentSnapshot<DocumentData> | null>(null);
  const [hasMore, setHasMore] = useState(true);
  
  const [searchTerm, setSearchTerm] = useState('');
  const { toast } = useToast();

  const observerRef = useRef<IntersectionObserver | null>(null);
  const loadMoreRef = useRef<HTMLDivElement | null>(null);

  const [selectedCustomerForDetails, setSelectedCustomerForDetails] = useState<AdminDisplayCustomer | null>(null);
  const [isDetailsDialogOpen, setIsDetailsDialogOpen] = useState(false);
  const [customerToDelete, setCustomerToDelete] = useState<AdminDisplayCustomer | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);


  const buildPageQuery = useCallback((cursor: QueryDocumentSnapshot<DocumentData> | null): QueryConstraint[] => {
    const constraints: QueryConstraint[] = [orderBy('createdAt', 'desc')];
    if (cursor) {
      constraints.push(startAfter(cursor));
    }
    constraints.push(limit(PAGE_SIZE));
    return constraints;
  }, []);

  const loadCustomers = useCallback(async (
    cursor: QueryDocumentSnapshot<DocumentData> | null = null,
    isRefresh = false
  ) => {
    console.log(`[CustomersPage] loadCustomers called. Cursor: ${cursor ? 'exists' : 'null'}, isRefresh: ${isRefresh}`);
    if (isLoading && !isRefresh) {
      console.log("[CustomersPage] loadCustomers: Already loading and not a refresh, returning.");
      return;
    }

    setIsLoading(true);
    if (isRefresh) {
      console.log("[CustomersPage] loadCustomers: Refresh triggered.");
      setIsInitialLoading(true);
      setSearchTerm(''); 
    }

    try {
      if (isRefresh) {
        setAllCustomers([]);
        setLastVisibleDoc(null);
        setFirstVisibleDoc(null);
        setHasMore(true);
      }

      const queryConstraints = buildPageQuery(cursor);
      const customersQuery = query(collection(db, 'users'), ...queryConstraints);
      console.log("[CustomersPage] loadCustomers: Executing Firestore query with constraints:", queryConstraints);
      
      const documentSnapshots = await getDocs(customersQuery);
      const fetchedCustomersBatch: AdminDisplayCustomer[] = [];
      console.log(`[CustomersPage] loadCustomers: Firestore query returned ${documentSnapshots.docs.length} documents.`);
      
      documentSnapshots.docs.forEach((docSn) => {
        fetchedCustomersBatch.push({ id: docSn.id, ...docSn.data() } as AdminDisplayCustomer);
      });
      
      if (isRefresh || !cursor) {
        setAllCustomers(fetchedCustomersBatch);
        setFirstVisibleDoc(documentSnapshots.docs.length > 0 ? documentSnapshots.docs[0] : null);
        console.log("[CustomersPage] loadCustomers: Initial load/refresh. All customers set:", fetchedCustomersBatch.length);
      } else {
        setAllCustomers(prevCustomers => {
          const newCustomers = [...prevCustomers, ...fetchedCustomersBatch];
          console.log(`[CustomersPage] loadCustomers: Appending customers. Prev count: ${prevCustomers.length}, New batch count: ${fetchedCustomersBatch.length}, Total: ${newCustomers.length}`);
          return newCustomers;
        });
      }
      
      const newLastVisibleDoc = documentSnapshots.docs.length > 0 ? documentSnapshots.docs[documentSnapshots.docs.length - 1] : null;
      setLastVisibleDoc(newLastVisibleDoc);
      setHasMore(documentSnapshots.docs.length === PAGE_SIZE);
      console.log(`[CustomersPage] loadCustomers: Updated lastVisibleDoc: ${newLastVisibleDoc ? 'exists' : 'null'}, hasMore: ${documentSnapshots.docs.length === PAGE_SIZE}`);

    } catch (error) {
      console.error("[CustomersPage] loadCustomers: Error fetching customers: ", error);
      toast({
        title: 'Error Fetching Customers',
        description: (error as Error).message || 'Could not load customer data. An index on \'users\' for \'createdAt\' (desc) might be required.',
        variant: 'destructive',
      });
      setHasMore(false); 
    } finally {
      setIsLoading(false);
      if (isRefresh) {
        setIsInitialLoading(false);
        console.log("[CustomersPage] loadCustomers: Refresh finished. isInitialLoading=false, isLoading=false.");
      } else {
         console.log("[CustomersPage] loadCustomers: Load more finished. isLoading=false.");
      }
    }
  }, [toast, buildPageQuery]); 


  useEffect(() => {
    console.log("[CustomersPage] Initial useEffect: Triggering loadCustomers for initial load/refresh.");
    loadCustomers(null, true); 
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

  useEffect(() => {
    const currentObserver = observerRef.current; 
    const currentLoadMoreRef = loadMoreRef.current;

    if (!currentLoadMoreRef) {
      console.log("[CustomersPage] IntersectionObserver useEffect: loadMoreRef.current is null, returning.");
      return;
    }
    if (isLoading || !hasMore) {
      console.log(`[CustomersPage] IntersectionObserver useEffect: Not observing. isLoading: ${isLoading}, hasMore: ${hasMore}`);
      if (currentObserver) currentObserver.unobserve(currentLoadMoreRef);
      return;
    }
    console.log("[CustomersPage] IntersectionObserver useEffect: Setting up observer.");

    const observerInstance = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && lastVisibleDoc && !isLoading && hasMore) { 
          console.log("[CustomersPage] IntersectionObserver: Sentinel intersected! Loading more customers.");
          loadCustomers(lastVisibleDoc, false);
        }
      },
      { threshold: 1.0 }
    );

    observerInstance.observe(currentLoadMoreRef);
    observerRef.current = observerInstance; 

    return () => {
      console.log("[CustomersPage] IntersectionObserver useEffect: Cleaning up observer.");
      if (observerInstance && currentLoadMoreRef) {
        observerInstance.unobserve(currentLoadMoreRef);
      }
    };
  }, [isLoading, hasMore, lastVisibleDoc, loadCustomers]);


  const handleRefresh = useCallback(() => {
    console.log("[CustomersPage] handleRefresh: Called.");
    loadCustomers(null, true);
  }, [loadCustomers]);

  const openDetailsDialog = useCallback((customer: AdminDisplayCustomer) => {
    setSelectedCustomerForDetails(customer);
    setIsDetailsDialogOpen(true);
  }, []);

  const closeDetailsDialog = useCallback(() => {
    setIsDetailsDialogOpen(false);
    setSelectedCustomerForDetails(null);
  }, []);

  const openDeleteConfirmDialog = useCallback((customer: AdminDisplayCustomer) => {
    setCustomerToDelete(customer);
  }, []);

  const closeDeleteConfirmDialog = useCallback(() => {
    setCustomerToDelete(null);
  }, []);

  const handleDeleteCustomer = async () => {
    if (!customerToDelete || !customerToDelete.id) return;
    setIsDeleting(true);
    try {
      await deleteDoc(doc(db, 'users', customerToDelete.id));
      toast({
        title: 'Customer Firestore Record Deleted',
        description: `Customer "${customerToDelete.name || customerToDelete.email}" record deleted from Firestore. Firebase Auth user must be deleted separately via backend.`,
      });
      // Optimistic update of the local list
      setAllCustomers(prev => prev.filter(c => c.id !== customerToDelete!.id));
      if (allCustomers.length -1 < PAGE_SIZE && !hasMore && (allCustomers.length -1 > 0) ) {
         // If page might become empty or no more items, try to fetch to ensure UI is consistent
      } else if (allCustomers.length -1 === 0 && !hasMore) {
        // If it was the last item overall
      }
      // Consider a more robust refresh if the list is now empty for the current "page"
      // For now, simple optimistic removal. A full refresh might be too disruptive.
    } catch (error) {
      console.error("Error deleting customer Firestore record: ", error);
      toast({
        title: 'Deletion Failed',
        description: (error as Error).message || 'Could not delete the customer Firestore record.',
        variant: 'destructive',
      });
    } finally {
      setIsDeleting(false);
      closeDeleteConfirmDialog();
    }
  };

  const displayCustomers = filteredCustomers || [];

  return (
    <>
      <PageHeader
        title="Customers Management"
        description="View and search customer information from the 'users' collection. Check console for Firestore index errors or logs."
        actions={
          <Button onClick={handleRefresh} variant="outline" size="icon" disabled={isLoading || isDeleting}>
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
                An index on 'users' for 'createdAt' (descending) may be required by Firestore. Check console.
                Deleting a customer here only removes their Firestore record; Firebase Auth deletion requires a backend function.
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
            <ScrollArea className="h-[60vh]">
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
                    {searchTerm ? 'Try a different search term or clear search.' : "The 'users' collection might be empty or there was an issue fetching data (check console for index errors or logs)."}
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
                          {customer.createdAt instanceof Timestamp && isValid(customer.createdAt.toDate())
                            ? format(customer.createdAt.toDate(), 'PPp')
                            : typeof customer.createdAt === 'string'
                              ? customer.createdAt
                              : 'N/A'}
                        </TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" className="h-8 w-8 p-0" disabled={isDeleting}>
                                <span className="sr-only">Open menu</span>
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => openDetailsDialog(customer)}><Eye className="mr-2 h-4 w-4" /> View Details</DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem 
                                onClick={() => openDeleteConfirmDialog(customer)} 
                                className="text-destructive focus:text-destructive focus:bg-destructive/10"
                                disabled={isDeleting}
                              >
                                <Trash2 className="mr-2 h-4 w-4" /> Delete Firestore Record
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
                {!isLoading && !isInitialLoading && !hasMore && displayCustomers.length > 0 && <p className="text-muted-foreground">No more customers to load.</p>}
              </div>
            </ScrollArea>
        </CardContent>
      </Card>

      {isDetailsDialogOpen && selectedCustomerForDetails && (
        <CustomerDetailsDialog 
            isOpen={isDetailsDialogOpen} 
            onClose={closeDetailsDialog} 
            customer={selectedCustomerForDetails} 
        />
      )}

      {customerToDelete && (
        <AlertDialog open={!!customerToDelete} onOpenChange={(open) => !open && closeDeleteConfirmDialog()}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
              <AlertDialogDescription>
                This action will delete the customer record for "{customerToDelete.name || customerToDelete.email}" from Firestore. 
                This does NOT delete the user from Firebase Authentication, which must be done separately via a backend function.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={closeDeleteConfirmDialog} disabled={isDeleting}>Cancel</AlertDialogCancel>
              <AlertDialogAction 
                onClick={handleDeleteCustomer} 
                disabled={isDeleting} 
                className="bg-destructive hover:bg-destructive/90"
              >
                {isDeleting ? "Deleting..." : "Yes, delete Firestore record"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </>
  );
}
