
'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { PageHeader } from '@/components/common/PageHeader';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Undo2, PackageSearch, Search as SearchIcon, RefreshCcw } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { db } from '@/lib/firebase';
import { collection, query, orderBy, Timestamp, getDocs, limit, startAfter, QueryDocumentSnapshot, DocumentData, QueryConstraint } from 'firebase/firestore';
import type { Refund } from '@/types';
import { format, isValid } from 'date-fns';
import { useToast } from '@/hooks/use-toast';

const PAGE_SIZE = 10;

export default function RefundsPage() {
  const [allRefunds, setAllRefunds] = useState<Refund[]>([]);
  const [filteredRefunds, setFilteredRefunds] = useState<Refund[]>([]);
  
  const [isLoading, setIsLoading] = useState(false);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  
  const [lastVisibleDoc, setLastVisibleDoc] = useState<QueryDocumentSnapshot<DocumentData> | null>(null);
  const [firstVisibleDoc, setFirstVisibleDoc] = useState<QueryDocumentSnapshot<DocumentData> | null>(null);
  const [hasMore, setHasMore] = useState(true);
  
  const [searchTerm, setSearchTerm] = useState('');
  const { toast } = useToast();

  const observerRef = useRef<IntersectionObserver | null>(null);
  const loadMoreRef = useRef<HTMLDivElement | null>(null);

  const buildPageQuery = useCallback((cursor: QueryDocumentSnapshot<DocumentData> | null): QueryConstraint[] => {
    const constraints: QueryConstraint[] = [orderBy('createdAt', 'desc')]; 
    if (cursor) {
      constraints.push(startAfter(cursor));
    }
    constraints.push(limit(PAGE_SIZE));
    return constraints;
  }, []);

  const fetchRefunds = useCallback(async (
    cursor: QueryDocumentSnapshot<DocumentData> | null = null,
    isRefresh = false
  ) => {
    if (isLoading && !isRefresh) {
        return;
    }
    
    setIsLoading(true);
    if (isRefresh) {
      setIsInitialLoading(true);
      setSearchTerm(''); 
    }

    try {
      const queryConstraints = buildPageQuery(cursor);
      const refundsQuery = query(collection(db, 'refunds'), ...queryConstraints);
      
      const documentSnapshots = await getDocs(refundsQuery);
      const fetchedRefundsBatch: Refund[] = [];
      
      documentSnapshots.docs.forEach((docSn) => {
        fetchedRefundsBatch.push({ id: docSn.id, ...docSn.data() } as Refund);
      });
      
      if (isRefresh || !cursor) {
        setAllRefunds(fetchedRefundsBatch);
        setFirstVisibleDoc(documentSnapshots.docs.length > 0 ? documentSnapshots.docs[0] : null);
      } else {
        setAllRefunds(prev => {
          const newRefunds = [...prev, ...fetchedRefundsBatch];
          return newRefunds;
        });
      }
      
      const newLastVisibleDoc = documentSnapshots.docs.length > 0 ? documentSnapshots.docs[documentSnapshots.docs.length - 1] : null;
      setLastVisibleDoc(newLastVisibleDoc);
      setHasMore(documentSnapshots.docs.length === PAGE_SIZE);

    } catch (error) {
      console.error("Error fetching refunds: ", error);
      toast({
        title: 'Error Fetching Refunds',
        description: (error as Error).message || 'Could not load refunds. Check Firestore indexes for "refunds" collection, ordered by "createdAt" (desc).',
        variant: 'destructive',
      });
      setHasMore(false);
    } finally {
      setIsLoading(false);
      if (isRefresh) {
        setIsInitialLoading(false);
      }
    }
  }, [toast, buildPageQuery]); 

  useEffect(() => {
    fetchRefunds(null, true);
  }, [fetchRefunds]);

  useEffect(() => {
    const lowercasedSearch = searchTerm.toLowerCase();
    const currentRefunds = allRefunds || [];
    if (searchTerm === '') {
      setFilteredRefunds(currentRefunds);
    } else {
      const searchedData = currentRefunds.filter(refund =>
        refund.refundId.toLowerCase().includes(lowercasedSearch) ||
        refund.paymentId.toLowerCase().includes(lowercasedSearch) ||
        refund.orderId.toLowerCase().includes(lowercasedSearch)
      );
      setFilteredRefunds(searchedData);
    }
  }, [searchTerm, allRefunds]);

  useEffect(() => {
    const currentObserver = observerRef.current;
    const currentLoadMoreRef = loadMoreRef.current;

    if (!currentLoadMoreRef) {
      return;
    }
    if (isLoading || !hasMore) {
      if (currentObserver) currentObserver.unobserve(currentLoadMoreRef);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && lastVisibleDoc && !isLoading && hasMore) {
          fetchRefunds(lastVisibleDoc);
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
  }, [isLoading, hasMore, lastVisibleDoc, fetchRefunds]);

  const handleRefresh = useCallback(() => {
    fetchRefunds(null, true);
  }, [fetchRefunds]);

  const formatCurrency = (amount?: number, currencyCode: string = "INR") => {
    if (amount === undefined || amount === null) return 'N/A';
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: currencyCode }).format(amount);
  };

  const getStatusVariant = (status?: string): "default" | "secondary" | "destructive" | "outline" => {
    const lowerStatus = status?.toLowerCase();
    if (['refunded', 'succeeded', 'completed'].includes(lowerStatus || '')) return 'default';
    if (['pending', 'processing'].includes(lowerStatus || '')) return 'secondary';
    if (['failed', 'cancelled'].includes(lowerStatus || '')) return 'destructive';
    return 'outline';
  };

  const displayRefunds = searchTerm ? filteredRefunds : (allRefunds || []);

  return (
    <>
      <PageHeader
        title="Refund Log"
        description="View refund records from the 'refunds' collection. Ordered by 'createdAt' (desc). Check console for index errors."
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
                <Undo2 className="h-6 w-6 text-primary" />
                <span>Refunds</span>
              </CardTitle>
              <CardDescription>
                Browse refund records. Scroll to load more.
                An index on 'refunds' for 'createdAt' (descending) may be required by Firestore.
              </CardDescription>
            </div>
          </div>
          <div className="mt-4 relative">
            <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search by Refund ID, Payment ID, or Order ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 w-full md:w-1/2 lg:w-1/3"
              disabled={isInitialLoading && (allRefunds || []).length === 0}
            />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <ScrollArea className="h-[60vh]">
            {isInitialLoading && displayRefunds.length === 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Refund ID</TableHead>
                    <TableHead>Payment ID</TableHead>
                    <TableHead>Order ID</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Date (Created At)</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {[...Array(Math.floor(PAGE_SIZE / 2))].map((_, i) => ( 
                    <TableRow key={`skeleton-${i}`}>
                      <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                      <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                      <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                      <TableCell><Skeleton className="h-5 w-20" /></TableCell>
                      <TableCell><Skeleton className="h-6 w-24" /></TableCell>
                      <TableCell><Skeleton className="h-5 w-40" /></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : displayRefunds.length === 0 ? (
              <div className="flex flex-col items-center justify-center text-center p-10 min-h-[300px]">
                <PackageSearch className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-xl font-semibold">
                  {searchTerm ? 'No Refunds Match Your Search' : 'No Refunds Found'}
                </h3>
                <p className="text-muted-foreground">
                  {searchTerm ? 'Try a different search term.' : "The 'refunds' collection might be empty or there was an issue fetching data."}
                </p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Refund ID</TableHead>
                    <TableHead>Payment ID</TableHead>
                    <TableHead>Order ID</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Date (Created At)</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {displayRefunds.map((refund) => (
                    <TableRow key={refund.id}>
                      <TableCell className="font-mono text-xs">{refund.refundId}</TableCell>
                      <TableCell className="font-mono text-xs">{refund.paymentId}</TableCell>
                      <TableCell className="font-mono text-xs">{refund.orderId}</TableCell>
                      <TableCell>{formatCurrency(refund.amount, refund.currency)}</TableCell>
                      <TableCell>
                        <Badge variant={getStatusVariant(refund.status)} className="capitalize">
                          {refund.status || 'N/A'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {refund.createdAt instanceof Timestamp && isValid(refund.createdAt.toDate())
                          ? format(refund.createdAt.toDate(), 'PPp')
                          : typeof refund.createdAt === 'string'
                            ? refund.createdAt
                            : 'N/A'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
            <div ref={loadMoreRef} className="h-10 flex items-center justify-center">
              {isLoading && !isInitialLoading && <p className="text-muted-foreground">Loading more refunds...</p>}
              {!isLoading && !isInitialLoading && !hasMore && displayRefunds.length > 0 && <p className="text-muted-foreground">No more refunds to load.</p>}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </>
  );
}
