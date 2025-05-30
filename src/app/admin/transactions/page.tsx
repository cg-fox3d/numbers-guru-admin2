
'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { PageHeader } from '@/components/common/PageHeader';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { MoreHorizontal, Eye, Trash2, ListChecks, PackageSearch, Search as SearchIcon, RefreshCcw, Filter as FilterIcon, CalendarIcon } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { db } from '@/lib/firebase';
import { collection, query, orderBy, Timestamp, getDocs, limit, startAfter, QueryDocumentSnapshot, DocumentData, QueryConstraint, doc, deleteDoc, where } from 'firebase/firestore';
import type { Transaction } from '@/types';
import { format, isValid } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { TransactionDetailsDialog } from '@/components/transactions/TransactionDetailsDialog';
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
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';

const PAGE_SIZE = 10;
const TRANSACTION_STATUSES = ["captured", "pending", "failed", "authorized", "created", "refunded"]; // Added refunded for completeness
const TRANSACTION_METHODS = ["card", "wallet", "upi", "netbanking", "emi", "bank_transfer"]; // Added bank_transfer

interface ActiveFilters {
  status?: string;
  dateFrom?: Date;
  dateTo?: Date;
  method?: string;
}

export default function TransactionsPage() {
  const [allTransactions, setAllTransactions] = useState<Transaction[]>([]);
  const [filteredTransactions, setFilteredTransactions] = useState<Transaction[]>([]);
  
  const [isLoading, setIsLoading] = useState(false);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  
  const [lastVisibleDoc, setLastVisibleDoc] = useState<QueryDocumentSnapshot<DocumentData> | null>(null);
  const [firstVisibleDoc, setFirstVisibleDoc] = useState<QueryDocumentSnapshot<DocumentData> | null>(null);
  const [hasMore, setHasMore] = useState(true);
  
  const [searchTerm, setSearchTerm] = useState('');
  const { toast } = useToast();

  const observerRef = useRef<IntersectionObserver | null>(null);
  const loadMoreRef = useRef<HTMLDivElement | null>(null);

  const [selectedTransactionForDetails, setSelectedTransactionForDetails] = useState<Transaction | null>(null);
  const [isDetailsDialogOpen, setIsDetailsDialogOpen] = useState(false);
  const [transactionToDelete, setTransactionToDelete] = useState<Transaction | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Filter input states
  const [filterStatus, setFilterStatus] = useState<string>('');
  const [filterDateFrom, setFilterDateFrom] = useState<Date | undefined>(undefined);
  const [filterDateTo, setFilterDateTo] = useState<Date | undefined>(undefined);
  const [filterMethod, setFilterMethod] = useState<string>('');
  const [isFilterPopoverOpen, setIsFilterPopoverOpen] = useState(false);
  
  // Applied filters
  const [activeFilters, setActiveFilters] = useState<ActiveFilters>({});

  const buildPageQuery = useCallback((cursor: QueryDocumentSnapshot<DocumentData> | null, currentActiveFilters: ActiveFilters): QueryConstraint[] => {
    const constraints: QueryConstraint[] = [];

    if (currentActiveFilters.status) {
      constraints.push(where('status', '==', currentActiveFilters.status));
    }
    if (currentActiveFilters.method) {
      constraints.push(where('method', '==', currentActiveFilters.method));
    }
    if (currentActiveFilters.dateFrom) {
      const fromDateStart = new Date(currentActiveFilters.dateFrom);
      fromDateStart.setHours(0,0,0,0);
      constraints.push(where('createdAt', '>=', Timestamp.fromDate(fromDateStart)));
    }
    if (currentActiveFilters.dateTo) {
      const toDateEnd = new Date(currentActiveFilters.dateTo);
      toDateEnd.setHours(23, 59, 59, 999);
      constraints.push(where('createdAt', '<=', Timestamp.fromDate(toDateEnd)));
    }
    
    constraints.push(orderBy('createdAt', 'desc'));
    if (cursor) {
      constraints.push(startAfter(cursor));
    }
    constraints.push(limit(PAGE_SIZE));
    return constraints;
  }, []);

  const fetchTransactions = useCallback(async (
    cursor: QueryDocumentSnapshot<DocumentData> | null = null,
    isRefreshOrFilterChange = false,
    currentFilters: ActiveFilters
  ) => {
    if (isLoading && !isRefreshOrFilterChange) return;
    
    setIsLoading(true);
    if (isRefreshOrFilterChange) {
      setIsInitialLoading(true);
      setSearchTerm(''); 
    }

    try {
      const queryConstraints = buildPageQuery(cursor, currentFilters);
      const transactionsQuery = query(collection(db, 'payments'), ...queryConstraints);
      
      const documentSnapshots = await getDocs(transactionsQuery);
      const fetchedTransactionsBatch: Transaction[] = [];
      documentSnapshots.docs.forEach((docSn) => {
        fetchedTransactionsBatch.push({ id: docSn.id, ...docSn.data() } as Transaction);
      });
      
      if (isRefreshOrFilterChange || !cursor) {
        setAllTransactions(fetchedTransactionsBatch);
        setFirstVisibleDoc(documentSnapshots.docs.length > 0 ? documentSnapshots.docs[0] : null);
      } else {
        setAllTransactions(prev => [...prev, ...fetchedTransactionsBatch]);
      }
      
      const newLastVisibleDoc = documentSnapshots.docs.length > 0 ? documentSnapshots.docs[documentSnapshots.docs.length - 1] : null;
      setLastVisibleDoc(newLastVisibleDoc);
      setHasMore(documentSnapshots.docs.length === PAGE_SIZE);

    } catch (error) {
      console.error("Error fetching transactions: ", error);
      toast({
        title: 'Error Fetching Transactions',
        description: (error as Error).message || 'Could not load transactions. Check Firestore indexes for "payments" collection (createdAt desc, status, method, date combinations).',
        variant: 'destructive',
      });
      setHasMore(false);
    } finally {
      setIsLoading(false);
      if (isRefreshOrFilterChange) setIsInitialLoading(false);
    }
  }, [toast, buildPageQuery, setIsLoading, setIsInitialLoading, setAllTransactions, setLastVisibleDoc, setFirstVisibleDoc, setHasMore, setSearchTerm ]);

  // Effect for initial load AND when activeFilters change
  useEffect(() => {
    fetchTransactions(null, true, activeFilters); // isRefreshOrFilterChange = true
  }, [activeFilters, fetchTransactions]);

  // Client-side search filtering
  useEffect(() => {
    const lowercasedSearch = searchTerm.toLowerCase();
    if (searchTerm === '') {
      setFilteredTransactions(allTransactions || []);
    } else {
      const currentTransactions = allTransactions || [];
      const searchedData = currentTransactions.filter(tx =>
        tx.paymentId.toLowerCase().includes(lowercasedSearch) ||
        tx.orderId.toLowerCase().includes(lowercasedSearch) ||
        tx.email?.toLowerCase().includes(lowercasedSearch)
      );
      setFilteredTransactions(searchedData);
    }
  }, [searchTerm, allTransactions]);

  // Intersection Observer for infinite scroll
  useEffect(() => {
    const currentObserver = observerRef.current;
    const currentLoadMoreRef = loadMoreRef.current;

    if (isLoading || !hasMore || !currentLoadMoreRef) {
      if (currentObserver && currentLoadMoreRef) currentObserver.unobserve(currentLoadMoreRef);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && lastVisibleDoc && !isLoading && hasMore) {
          fetchTransactions(lastVisibleDoc, false, activeFilters);
        }
      },
      { threshold: 1.0 }
    );

    observer.observe(currentLoadMoreRef);
    observerRef.current = observer;

    return () => {
      if (observer && currentLoadMoreRef) {
        observer.unobserve(currentLoadMoreRef);
      }
    };
  }, [isLoading, hasMore, lastVisibleDoc, fetchTransactions, activeFilters]);

  const handleRefresh = useCallback(() => {
    fetchTransactions(null, true, activeFilters);
  }, [fetchTransactions, activeFilters]);

  const openDetailsDialog = useCallback((transaction: Transaction) => {
    setSelectedTransactionForDetails(transaction);
    setIsDetailsDialogOpen(true);
  }, []);

  const closeDetailsDialog = useCallback(() => {
    setIsDetailsDialogOpen(false);
    setSelectedTransactionForDetails(null);
  }, []);
  
  const openDeleteConfirmDialog = useCallback((transaction: Transaction) => {
    setTransactionToDelete(transaction);
  }, []);

  const closeDeleteConfirmDialog = useCallback(() => {
    setTransactionToDelete(null);
  }, []);

  const handleDeleteTransaction = useCallback(async () => {
    if (!transactionToDelete || !transactionToDelete.id) return;
    setIsDeleting(true);
    try {
      await deleteDoc(doc(db, 'payments', transactionToDelete.id));
      toast({
        title: 'Transaction Deleted',
        description: `Transaction "${transactionToDelete.paymentId}" has been successfully deleted.`,
      });
      // Optimistic update and refetch if needed
      setAllTransactions(prev => prev.filter(tx => tx.id !== transactionToDelete.id));
      if (allTransactions.length -1 < PAGE_SIZE && !hasMore && (allTransactions.length -1 > 0) ) {
        // Potentially refetch if current view might become sparse or user expects it.
        // For now, rely on optimistic update.
      }
    } catch (error) {
      console.error("Error deleting transaction: ", error);
      toast({
        title: 'Deletion Failed',
        description: (error as Error).message || 'Could not delete the transaction.',
        variant: 'destructive',
      });
    } finally {
      setIsDeleting(false);
      closeDeleteConfirmDialog();
    }
  }, [transactionToDelete, toast, closeDeleteConfirmDialog, allTransactions.length, hasMore]);


  const formatCurrency = (amount?: number, currencyCode: string = "INR") => {
    if (amount === undefined || amount === null) return 'N/A';
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: currencyCode }).format(amount);
  };

  const getStatusVariant = (status?: string): "default" | "secondary" | "destructive" | "outline" => {
    const lowerStatus = status?.toLowerCase();
    if (['succeeded', 'paid', 'completed', 'captured', 'refunded'].includes(lowerStatus || '')) return 'default';
    if (['pending', 'processing', 'authorized'].includes(lowerStatus || '')) return 'secondary';
    if (['failed', 'cancelled', 'disputed'].includes(lowerStatus || '')) return 'destructive';
    return 'outline';
  };
  
  const handleApplyFilters = () => {
    const newActiveFilters: ActiveFilters = {};
    if (filterStatus) newActiveFilters.status = filterStatus;
    if (filterMethod) newActiveFilters.method = filterMethod;
    if (filterDateFrom) newActiveFilters.dateFrom = filterDateFrom;
    if (filterDateTo) newActiveFilters.dateTo = filterDateTo;
    
    setActiveFilters(newActiveFilters); // This will trigger the useEffect for fetchTransactions
    setIsFilterPopoverOpen(false);
  };

  const handleClearFilters = () => {
    setFilterStatus('');
    setFilterMethod('');
    setFilterDateFrom(undefined);
    setFilterDateTo(undefined);
    setActiveFilters({}); 
    setIsFilterPopoverOpen(false);
  };
  
  const getActiveFilterCount = () => {
    return Object.values(activeFilters).filter(v => v !== undefined && v !== '').length;
  }

  const displayTransactions = searchTerm ? filteredTransactions : (allTransactions || []);

  return (
    <>
      <PageHeader
        title="Transaction Log"
        description="View and filter payment transactions from the 'payments' collection. Check console for Firestore index errors."
        actions={
           <div className="flex items-center gap-2">
             <Popover open={isFilterPopoverOpen} onOpenChange={setIsFilterPopoverOpen}>
              <PopoverTrigger asChild>
                <Button variant="outline" disabled={isInitialLoading || isLoading || isDeleting}>
                  <FilterIcon className="mr-2 h-4 w-4" />
                  Filters {getActiveFilterCount() > 0 && `(${getActiveFilterCount()})`}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-80" align="end">
                <div className="grid gap-4">
                  <div className="space-y-2">
                    <h4 className="font-medium leading-none">Transaction Filters</h4>
                    <p className="text-sm text-muted-foreground">
                      Apply filters to narrow down transactions.
                    </p>
                  </div>
                  <div className="grid gap-3">
                    <div>
                      <Label htmlFor="txFilterStatus">Status</Label>
                      <Select value={filterStatus} onValueChange={setFilterStatus}>
                        <SelectTrigger id="txFilterStatus">
                            <SelectValue placeholder="All Statuses" />
                        </SelectTrigger>
                        <SelectContent>
                          {TRANSACTION_STATUSES.map(status => (
                            <SelectItem key={status} value={status} className="capitalize">{status}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="txFilterMethod">Payment Method</Label>
                      <Select value={filterMethod} onValueChange={setFilterMethod}>
                        <SelectTrigger id="txFilterMethod">
                            <SelectValue placeholder="All Methods" />
                        </SelectTrigger>
                        <SelectContent>
                          {TRANSACTION_METHODS.map(method => (
                            <SelectItem key={method} value={method} className="capitalize">{method.replace('_', ' ')}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                     <div className="grid grid-cols-2 gap-2">
                        <div>
                            <Label htmlFor="txDateFrom">Created From</Label>
                            <Popover>
                                <PopoverTrigger asChild>
                                <Button id="txDateFrom" variant={"outline"} className="w-full justify-start text-left font-normal" >
                                    <CalendarIcon className="mr-2 h-4 w-4" />
                                    {filterDateFrom ? format(filterDateFrom, "PPP") : <span>Pick a date</span>}
                                </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0">
                                <Calendar mode="single" selected={filterDateFrom} onSelect={setFilterDateFrom} initialFocus />
                                </PopoverContent>
                            </Popover>
                        </div>
                        <div>
                            <Label htmlFor="txDateTo">Created To</Label>
                             <Popover>
                                <PopoverTrigger asChild>
                                <Button id="txDateTo" variant={"outline"} className="w-full justify-start text-left font-normal" >
                                    <CalendarIcon className="mr-2 h-4 w-4" />
                                    {filterDateTo ? format(filterDateTo, "PPP") : <span>Pick a date</span>}
                                </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0">
                                <Calendar mode="single" selected={filterDateTo} onSelect={setFilterDateTo} disabled={(date) => filterDateFrom ? date < filterDateFrom : false } initialFocus />
                                </PopoverContent>
                            </Popover>
                        </div>
                    </div>
                  </div>
                  <div className="flex justify-end gap-2 pt-2 border-t mt-2">
                    <Button variant="ghost" onClick={handleClearFilters}>Clear</Button>
                    <Button onClick={handleApplyFilters} className="bg-primary hover:bg-primary/90">Apply Filters</Button>
                  </div>
                </div>
              </PopoverContent>
            </Popover>
            <Button onClick={handleRefresh} variant="outline" size="icon" disabled={isLoading || isInitialLoading || isDeleting}>
              <RefreshCcw className="h-4 w-4" />
              <span className="sr-only">Refresh</span>
            </Button>
          </div>
        }
      />
      <Card className="shadow-lg">
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <CardTitle className="flex items-center gap-2">
                <ListChecks className="h-6 w-6 text-primary" />
                <span>Transactions</span>
              </CardTitle>
              <CardDescription>
                Browse payment transactions. Scroll to load more.
                An index on 'payments' for 'createdAt' (desc) and potentially other filters (status, method, date) may be required. Check console for errors.
              </CardDescription>
            </div>
          </div>
          <div className="mt-4 relative">
            <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search by Payment ID, Order ID, or Customer Email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 w-full md:w-1/2 lg:w-1/3"
              disabled={isInitialLoading && (allTransactions || []).length === 0 && !Object.values(activeFilters).some(Boolean)}
            />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <ScrollArea className="h-[60vh]">
            {isInitialLoading && displayTransactions.length === 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Payment ID</TableHead><TableHead>Order ID</TableHead><TableHead>Amount</TableHead><TableHead>Status</TableHead><TableHead>Method</TableHead><TableHead>Customer Email</TableHead><TableHead>Date</TableHead><TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {[...Array(Math.floor(PAGE_SIZE / 2))].map((_, i) => ( 
                    <TableRow key={`skeleton-${i}`}>
                      <TableCell><Skeleton className="h-5 w-32" /></TableCell><TableCell><Skeleton className="h-5 w-24" /></TableCell><TableCell><Skeleton className="h-5 w-20" /></TableCell><TableCell><Skeleton className="h-6 w-24" /></TableCell><TableCell><Skeleton className="h-5 w-16" /></TableCell><TableCell><Skeleton className="h-5 w-40" /></TableCell><TableCell><Skeleton className="h-5 w-40" /></TableCell><TableCell className="text-right"><Skeleton className="h-8 w-8 ml-auto" /></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : displayTransactions.length === 0 ? (
              <div className="flex flex-col items-center justify-center text-center p-10 min-h-[300px]">
                <PackageSearch className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-xl font-semibold">
                  {searchTerm || getActiveFilterCount() > 0 ? 'No Transactions Match Your Search/Filters' : 'No Transactions Found'}
                </h3>
                <p className="text-muted-foreground">
                  {searchTerm || getActiveFilterCount() > 0 ? 'Try different criteria or clear search/filters.' : "The 'payments' collection might be empty or there was an issue fetching data (check console for index errors)."}
                </p>
                 {(searchTerm || getActiveFilterCount() > 0) && (
                    <Button onClick={() => { setSearchTerm(''); handleClearFilters(); }} variant="outline" className="mt-4">Clear Search & Filters</Button>
                )}
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Payment ID</TableHead><TableHead>Order ID</TableHead><TableHead>Amount</TableHead><TableHead>Status</TableHead><TableHead>Method</TableHead><TableHead>Customer Email</TableHead><TableHead>Date</TableHead><TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {displayTransactions.map((tx) => (
                    <TableRow key={tx.id}>
                      <TableCell className="font-mono text-xs">{tx.paymentId}</TableCell>
                      <TableCell className="font-mono text-xs">{tx.orderId}</TableCell>
                      <TableCell>{formatCurrency(tx.amount, tx.currency)}</TableCell>
                      <TableCell>
                        <Badge variant={getStatusVariant(tx.status)} className="capitalize text-xs">
                          {tx.status || 'N/A'}
                        </Badge>
                      </TableCell>
                      <TableCell className="capitalize">{tx.method || 'N/A'}</TableCell>
                      <TableCell>{tx.email || 'N/A'}</TableCell>
                      <TableCell>
                        {tx.createdAt instanceof Timestamp && isValid(tx.createdAt.toDate())
                          ? format(tx.createdAt.toDate(), 'PPp')
                          : typeof tx.createdAt === 'string'
                            ? tx.createdAt
                            : 'N/A'}
                      </TableCell>
                       <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0" disabled={isDeleting}>
                              <span className="sr-only">Open menu</span><MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => openDetailsDialog(tx)}><Eye className="mr-2 h-4 w-4" /> View Details</DropdownMenuItem>
                            <DropdownMenuItem onClick={() => openDeleteConfirmDialog(tx)} className="text-destructive focus:text-destructive focus:bg-destructive/10" disabled={isDeleting}><Trash2 className="mr-2 h-4 w-4" /> Delete Transaction</DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
            <div ref={loadMoreRef} className="h-10 flex items-center justify-center">
              {isLoading && !isInitialLoading && <p className="text-muted-foreground">Loading more transactions...</p>}
              {!isLoading && !isInitialLoading && !hasMore && displayTransactions.length > 0 && <p className="text-muted-foreground">No more transactions to load.</p>}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      {isDetailsDialogOpen && selectedTransactionForDetails && (
        <TransactionDetailsDialog isOpen={isDetailsDialogOpen} onClose={closeDetailsDialog} transaction={selectedTransactionForDetails} />
      )}

      {transactionToDelete && !isDetailsDialogOpen && ( 
        <AlertDialog open={!!transactionToDelete} onOpenChange={(open) => !open && closeDeleteConfirmDialog()}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
              <AlertDialogDescription>This action cannot be undone. This will permanently delete the transaction "{transactionToDelete.paymentId}".</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={closeDeleteConfirmDialog} disabled={isDeleting}>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleDeleteTransaction} disabled={isDeleting} className="bg-destructive hover:bg-destructive/90">{isDeleting ? "Deleting..." : "Yes, delete transaction"}</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </>
  );
}

