
'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { PageHeader } from '@/components/common/PageHeader';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { MoreHorizontal, ShoppingCart, PackageSearch, Search as SearchIcon, RefreshCcw, ChevronLeft, ChevronRight } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { db } from '@/lib/firebase';
import { collection, query, orderBy, Timestamp, getDocs, limit, startAfter, QueryDocumentSnapshot, DocumentData } from 'firebase/firestore';
import type { AdminOrder } from '@/types';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';

const PAGE_SIZE = 10;

export default function OrdersPage() {
  const [allOrders, setAllOrders] = useState<AdminOrder[]>([]); // Stores all orders fetched for current view/search
  const [ordersOnPage, setOrdersOnPage] = useState<AdminOrder[]>([]); // Data for the current page
  const [filteredOrders, setFilteredOrders] = useState<AdminOrder[]>([]); // Data after search filter
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const { toast } = useToast();

  const [currentPageIndex, setCurrentPageIndex] = useState(0);
  const [pageStartCursors, setPageStartCursors] = useState<(QueryDocumentSnapshot<DocumentData> | null)[]>([null]);
  const pageStartCursorsRef = useRef(pageStartCursors);

  const [lastVisibleDoc, setLastVisibleDoc] = useState<QueryDocumentSnapshot<DocumentData> | null>(null);
  const [firstVisibleDoc, setFirstVisibleDoc] = useState<QueryDocumentSnapshot<DocumentData> | null>(null);
  const [hasNextPage, setHasNextPage] = useState(false);

  useEffect(() => {
    pageStartCursorsRef.current = pageStartCursors;
  }, [pageStartCursors]);

  const buildPageQuery = useCallback((cursor: QueryDocumentSnapshot<DocumentData> | null) => {
    let q = query(collection(db, 'orders'), orderBy('orderDate', 'desc'));
    if (cursor) {
      q = query(q, startAfter(cursor), limit(PAGE_SIZE + 1));
    } else {
      q = query(q, limit(PAGE_SIZE + 1));
    }
    return q;
  }, []);

  const loadOrders = useCallback(async (pageIdxToLoad: number, options: { isRefresh?: boolean } = {}) => {
    setIsLoading(true);
    const isActualRefresh = options.isRefresh || pageIdxToLoad === 0;
    if (isActualRefresh) {
      setSearchTerm('');
    }

    try {
      let queryCursor: QueryDocumentSnapshot<DocumentData> | null = null;
      const currentCursors = pageStartCursorsRef.current;

      if (isActualRefresh) {
        queryCursor = null;
        if (options.isRefresh) setPageStartCursors([null]);
      } else if (pageIdxToLoad > 0 && pageIdxToLoad < currentCursors.length) {
        queryCursor = currentCursors[pageIdxToLoad];
      } else if (pageIdxToLoad > 0 && lastVisibleDoc && pageIdxToLoad === currentCursors.length) {
        queryCursor = lastVisibleDoc;
      }

      const ordersQuery = buildPageQuery(queryCursor);
      const documentSnapshots = await getDocs(ordersQuery);

      const fetchedOrders: AdminOrder[] = [];
      documentSnapshots.docs.slice(0, PAGE_SIZE).forEach((docSn) => {
        fetchedOrders.push({ id: docSn.id, ...docSn.data() } as AdminOrder);
      });
      setOrdersOnPage(fetchedOrders);

      const newFirstVisibleDoc = documentSnapshots.docs.length > 0 ? documentSnapshots.docs[0] : null;
      setFirstVisibleDoc(newFirstVisibleDoc);
      
      const newLastFetchedDoc = documentSnapshots.docs.length > PAGE_SIZE
        ? documentSnapshots.docs[PAGE_SIZE - 1]
        : (documentSnapshots.docs.length > 0 ? documentSnapshots.docs[documentSnapshots.docs.length - 1] : null);
      setLastVisibleDoc(newLastFetchedDoc);

      const newHasNextPage = documentSnapshots.docs.length > PAGE_SIZE;
      setHasNextPage(newHasNextPage);

      if (isActualRefresh) {
        setPageStartCursors(newFirstVisibleDoc ? [null, newFirstVisibleDoc] : [null]);
      } else if (pageIdxToLoad >= currentCursors.length && newFirstVisibleDoc && queryCursor === lastVisibleDoc) {
        setPageStartCursors(prev => [...prev, newFirstVisibleDoc]);
      }

    } catch (error) {
      console.error("Error fetching orders: ", error);
      toast({
        title: 'Error Fetching Orders',
        description: (error as Error).message || 'Could not load orders. An index on \'orders\' for \'orderDate\' (desc) might be required.',
        variant: 'destructive',
      });
      setOrdersOnPage([]);
      setHasNextPage(false);
    } finally {
      setIsLoading(false);
    }
  }, [toast, buildPageQuery, setIsLoading, setOrdersOnPage, setHasNextPage, setLastVisibleDoc, setSearchTerm, setPageStartCursors, setFirstVisibleDoc]);

  useEffect(() => {
    loadOrders(currentPageIndex, {isRefresh: currentPageIndex === 0 && pageStartCursorsRef.current.length <=1 });
  }, [currentPageIndex, loadOrders]);

  useEffect(() => {
    const lowercasedFilter = searchTerm.toLowerCase();
    const currentOrders = ordersOnPage || [];

    if (searchTerm === '') {
      setFilteredOrders(currentOrders);
    } else {
      const filteredData = currentOrders.filter(order =>
        order.orderId.toLowerCase().includes(lowercasedFilter) ||
        order.customerName.toLowerCase().includes(lowercasedFilter) ||
        order.customerEmail.toLowerCase().includes(lowercasedFilter)
      );
      setFilteredOrders(filteredData);
    }
  }, [searchTerm, ordersOnPage]);

  const handleRefresh = useCallback(() => {
    if (currentPageIndex === 0) {
        loadOrders(0, { isRefresh: true });
    } else {
        setCurrentPageIndex(0); 
    }
  }, [loadOrders, currentPageIndex, setCurrentPageIndex]);


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

  const formatCurrency = (amount: number, currencyCode: string = "INR") => {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: currencyCode }).format(amount);
  };

  const getStatusVariant = (status: string): "default" | "secondary" | "destructive" | "outline" => {
    const lowerStatus = status.toLowerCase();
    if (lowerStatus === 'paid' || lowerStatus === 'delivered' || lowerStatus === 'completed' || lowerStatus === 'shipped' || lowerStatus === 'created') {
      return 'default';
    }
    if (lowerStatus === 'pending' || lowerStatus === 'processing' || lowerStatus === 'confirmed') {
      return 'secondary';
    }
    if (lowerStatus === 'cancelled' || lowerStatus === 'failed' || lowerStatus === 'refunded') {
      return 'destructive';
    }
    return 'outline';
  };

  return (
    <>
      <PageHeader
        title="Orders Management"
        description="View and manage customer orders."
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
            <div>
              <CardTitle className="flex items-center gap-2">
                <ShoppingCart className="h-6 w-6 text-primary" />
                <span>Orders List</span>
              </CardTitle>
              <CardDescription>
                Browse customer orders. An index on 'orders' for 'orderDate' (desc) might be required by Firestore.
              </CardDescription>
            </div>
          </div>
          <div className="mt-4 relative">
            <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search by Order ID, Customer Name or Email on current page..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 w-full md:w-1/2 lg:w-1/3"
              disabled={isLoading && (ordersOnPage || []).length === 0}
            />
          </div>
        </CardHeader>
        <CardContent className="p-0 min-h-[300px]">
          {isLoading ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Order ID</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {[...Array(5)].map((_, i) => (
                  <TableRow key={`skeleton-${i}`}>
                    <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-40" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-20" /></TableCell>
                    <TableCell><Skeleton className="h-6 w-24" /></TableCell>
                    <TableCell className="text-right"><Skeleton className="h-8 w-8 ml-auto" /></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : !isLoading && (filteredOrders || []).length === 0 ? (
            <div className="flex flex-col items-center justify-center text-center p-10 min-h-[300px]">
              <PackageSearch className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-xl font-semibold">
                {searchTerm ? 'No Orders Match Your Search' : 
                 (ordersOnPage || []).length === 0 ? 'No Orders Found' : 'No Orders Match Your Search'}
              </h3>
              <p className="text-muted-foreground">
                {searchTerm ? 'Try a different search term or clear search.' : 
                 (ordersOnPage || []).length === 0 ? "The 'orders' collection might be empty or there was an issue fetching data." : 'Adjust your search.'}
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Order ID</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(filteredOrders || []).map((order) => (
                  <TableRow key={order.id}>
                    <TableCell className="font-mono text-xs">{order.orderId}</TableCell>
                    <TableCell>
                        <div>{order.customerName}</div>
                        <div className="text-xs text-muted-foreground">{order.customerEmail}</div>
                    </TableCell>
                    <TableCell>
                      {order.orderDate instanceof Timestamp
                        ? format(order.orderDate.toDate(), 'PPp')
                        : typeof order.orderDate === 'string'
                          ? order.orderDate
                          : 'N/A'}
                    </TableCell>
                    <TableCell>{formatCurrency(order.amount, order.currency)}</TableCell>
                    <TableCell>
                      <Badge variant={getStatusVariant(order.orderStatus)} className="capitalize">
                        {order.orderStatus}
                      </Badge>
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
                          <DropdownMenuItem disabled>Update Status</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
        {(ordersOnPage || []).length > 0 && !isLoading && (
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
