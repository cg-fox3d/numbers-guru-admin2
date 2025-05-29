
'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { PageHeader } from '@/components/common/PageHeader';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ListChecks, PackageSearch, Search as SearchIcon, RefreshCcw } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { db } from '@/lib/firebase';
import { collection, query, orderBy, Timestamp, getDocs, limit, startAfter, QueryDocumentSnapshot, DocumentData, QueryConstraint } from 'firebase/firestore';
import type { Transaction } from '@/types';
import { format, isValid } from 'date-fns';
import { useToast } from '@/hooks/use-toast';

const PAGE_SIZE = 10;

export default function TransactionsPage() {
  const [allTransactions, setAllTransactions] = useState<Transaction[]>([]);
  const [filteredTransactions, setFilteredTransactions] = useState<Transaction[]>([]);
  
  const [isLoading, setIsLoading] = useState(false);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  
  const [lastVisibleDoc, setLastVisibleDoc] = useState<QueryDocumentSnapshot<DocumentData> | null>(null);
  const [firstVisibleDoc, setFirstVisibleDoc] = useState<QueryDocumentSnapshot<DocumentData> | null>(null); // For potential 'prev' logic if needed
  const [hasMore, setHasMore] = useState(true);
  
  const [searchTerm, setSearchTerm] = useState('');
  const { toast } = useToast();

  const observerRef = useRef<IntersectionObserver | null>(null);
  const loadMoreRef = useRef<HTMLDivElement | null>(null);

  const buildPageQuery = useCallback((cursor: QueryDocumentSnapshot<DocumentData> | null): QueryConstraint[] => {
    const constraints: QueryConstraint[] = [orderBy('createdAt', 'desc')]; // Order by 'createdAt' as transaction date
    if (cursor) {
      constraints.push(startAfter(cursor));
    }
    constraints.push(limit(PAGE_SIZE));
    return constraints;
  }, []);

  const fetchTransactions = useCallback(async (
    cursor: QueryDocumentSnapshot<DocumentData> | null = null,
    isRefresh = false
  ) => {
    if (isLoading && !isRefresh) return; // Prevent concurrent non-refresh fetches
    
    setIsLoading(true);
    if (isRefresh) {
      setIsInitialLoading(true);
      setSearchTerm(''); 
    }

    try {
      const queryConstraints = buildPageQuery(cursor);
      const transactionsQuery = query(collection(db, 'payments'), ...queryConstraints); // Query 'payments' collection
      
      const documentSnapshots = await getDocs(transactionsQuery);
      const fetchedTransactionsBatch: Transaction[] = [];
      documentSnapshots.docs.forEach((docSn) => {
        fetchedTransactionsBatch.push({ id: docSn.id, ...docSn.data() } as Transaction);
      });
      
      if (isRefresh || !cursor) { // Initial load or refresh
        setAllTransactions(fetchedTransactionsBatch);
        setFirstVisibleDoc(documentSnapshots.docs.length > 0 ? documentSnapshots.docs[0] : null);
      } else { // Loading more
        setAllTransactions(prev => [...prev, ...fetchedTransactionsBatch]);
      }
      
      const newLastVisibleDoc = documentSnapshots.docs.length > 0 ? documentSnapshots.docs[documentSnapshots.docs.length - 1] : null;
      setLastVisibleDoc(newLastVisibleDoc);
      setHasMore(documentSnapshots.docs.length === PAGE_SIZE);

    } catch (error) {
      console.error("Error fetching transactions: ", error);
      toast({
        title: 'Error Fetching Transactions',
        description: (error as Error).message || 'Could not load transactions. Check Firestore indexes for "payments" collection, ordered by "createdAt" (desc).',
        variant: 'destructive',
      });
      setHasMore(false);
    } finally {
      setIsLoading(false);
      if (isRefresh) setIsInitialLoading(false);
    }
  }, [toast, buildPageQuery, isLoading]); // Dependencies for fetchTransactions

  // Initial load
  useEffect(() => {
    fetchTransactions(null, true);
  }, [fetchTransactions]);

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
        if (entries[0].isIntersecting && lastVisibleDoc && !isLoading && hasMore) { // Ensure not already loading and hasMore is true
          fetchTransactions(lastVisibleDoc);
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
  }, [isLoading, hasMore, lastVisibleDoc, fetchTransactions]);

  const handleRefresh = useCallback(() => {
    fetchTransactions(null, true);
  }, [fetchTransactions]);

  const formatCurrency = (amount?: number, currencyCode: string = "INR") => {
    if (amount === undefined || amount === null) return 'N/A';
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: currencyCode }).format(amount);
  };

  const getStatusVariant = (status?: string): "default" | "secondary" | "destructive" | "outline" => {
    const lowerStatus = status?.toLowerCase();
    if (['succeeded', 'paid', 'completed', 'captured'].includes(lowerStatus || '')) return 'default';
    if (['pending', 'processing'].includes(lowerStatus || '')) return 'secondary';
    if (['failed', 'cancelled', 'disputed'].includes(lowerStatus || '')) return 'destructive';
    return 'outline';
  };

  const displayTransactions = searchTerm ? filteredTransactions : (allTransactions || []);

  return (
    <>
      <PageHeader
        title="Transaction Log"
        description="View payment transactions from the 'payments' collection. Ordered by 'createdAt' (desc)."
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
            <div>
              <CardTitle className="flex items-center gap-2">
                <ListChecks className="h-6 w-6 text-primary" />
                <span>Transactions</span>
              </CardTitle>
              <CardDescription>
                Browse payment transactions. Scroll to load more.
                An index on 'payments' for 'createdAt' (descending) may be required by Firestore. Check console.
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
              disabled={isInitialLoading && (allTransactions || []).length === 0}
            />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <ScrollArea className="h-[60vh]"> {/* Ensure ScrollArea has a defined height */}
            {isInitialLoading && displayTransactions.length === 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Payment ID</TableHead>
                    <TableHead>Order ID</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Method</TableHead>
                    <TableHead>Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {[...Array(Math.floor(PAGE_SIZE / 2))].map((_, i) => ( 
                    <TableRow key={`skeleton-${i}`}>
                      <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                      <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                      <TableCell><Skeleton className="h-5 w-20" /></TableCell>
                      <TableCell><Skeleton className="h-6 w-24" /></TableCell>
                      <TableCell><Skeleton className="h-5 w-16" /></TableCell>
                      <TableCell><Skeleton className="h-5 w-40" /></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : displayTransactions.length === 0 ? (
              <div className="flex flex-col items-center justify-center text-center p-10 min-h-[300px]">
                <PackageSearch className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-xl font-semibold">
                  {searchTerm ? 'No Transactions Match Your Search' : 'No Transactions Found'}
                </h3>
                <p className="text-muted-foreground">
                  {searchTerm ? 'Try a different search term.' : "The 'payments' collection might be empty or there was an issue fetching data."}
                </p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Payment ID</TableHead>
                    <TableHead>Order ID</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Method</TableHead>
                    <TableHead>Customer Email</TableHead>
                    <TableHead>Date (Created At)</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {displayTransactions.map((tx) => (
                    <TableRow key={tx.id}>
                      <TableCell className="font-mono text-xs">{tx.paymentId}</TableCell>
                      <TableCell className="font-mono text-xs">{tx.orderId}</TableCell>
                      <TableCell>{formatCurrency(tx.amount, tx.currency)}</TableCell>
                      <TableCell>
                        <Badge variant={getStatusVariant(tx.status)} className="capitalize">
                          {tx.status || 'N/A'}
                        </Badge>
                      </TableCell>
                      <TableCell className="capitalize">{tx.method || 'N/A'}</TableCell>
                      <TableCell>{tx.email || 'N/A'}</TableCell>
                      <TableCell>
                        {tx.createdAt instanceof Timestamp && isValid(tx.createdAt.toDate())
                          ? format(tx.createdAt.toDate(), 'PPp')
                          : typeof tx.createdAt === 'string' // Fallback if somehow it's a string
                            ? tx.createdAt
                            : 'N/A'}
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
    </>
  );
}
