
'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { PageHeader } from '@/components/common/PageHeader';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { MoreHorizontal, ShoppingCart, PackageSearch, Search as SearchIcon, RefreshCcw, Eye, Trash2, CheckCircle, Filter as FilterIcon, CalendarIcon } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { db } from '@/lib/firebase';
import { collection, query, orderBy, Timestamp, getDocs, limit, startAfter, QueryDocumentSnapshot, DocumentData, doc, updateDoc, serverTimestamp, deleteDoc, where, QueryConstraint } from 'firebase/firestore';
import type { AdminOrder } from '@/types';
import { format, isValid } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { OrderDetailsDialog } from '@/components/orders/OrderDetailsDialog';
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
const ORDER_STATUSES = ["created", "paid", "pending", "processing", "shipped", "delivered", "cancelled", "failed", "refunded", "confirmed"];

interface ActiveFilters {
  dateFrom?: Date;
  dateTo?: Date;
  status?: string;
  minAmount?: number;
  maxAmount?: number;
}

export default function OrdersPage() {
  const [allOrders, setAllOrders] = useState<AdminOrder[]>([]);
  const [filteredOrders, setFilteredOrders] = useState<AdminOrder[]>([]);
  
  const [isLoading, setIsLoading] = useState(false);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  
  const [lastVisibleDoc, setLastVisibleDoc] = useState<QueryDocumentSnapshot<DocumentData> | null>(null);
  const [firstVisibleDoc, setFirstVisibleDoc] = useState<QueryDocumentSnapshot<DocumentData> | null>(null); 
  const [hasMore, setHasMore] = useState(true);
  
  const [searchTerm, setSearchTerm] = useState('');
  const { toast } = useToast();

  const observerRef = useRef<IntersectionObserver | null>(null);
  const loadMoreRef = useRef<HTMLDivElement | null>(null);

  const [selectedOrderForDetails, setSelectedOrderForDetails] = useState<AdminOrder | null>(null);
  const [isDetailsDialogOpen, setIsDetailsDialogOpen] = useState(false);
  const [orderToModify, setOrderToModify] = useState<AdminOrder | null>(null);
  const [isModifyLoading, setIsModifyLoading] = useState(false);

  const [filterDateFrom, setFilterDateFrom] = useState<Date | undefined>(undefined);
  const [filterDateTo, setFilterDateTo] = useState<Date | undefined>(undefined);
  const [filterStatus, setFilterStatus] = useState<string>('');
  const [filterMinAmount, setFilterMinAmount] = useState<string>('');
  const [filterMaxAmount, setFilterMaxAmount] = useState<string>('');
  const [isFilterPopoverOpen, setIsFilterPopoverOpen] = useState(false);
  
  const [activeFilters, setActiveFilters] = useState<ActiveFilters>({});

  const buildBaseQuery = useCallback((currentActiveFilters: ActiveFilters, currentCursor: QueryDocumentSnapshot<DocumentData> | null = null) => {
    const constraints: QueryConstraint[] = [];

    if (currentActiveFilters.status) {
      constraints.push(where('orderStatus', '==', currentActiveFilters.status));
    }
    if (currentActiveFilters.dateFrom) {
      const fromDateStart = new Date(currentActiveFilters.dateFrom);
      fromDateStart.setHours(0,0,0,0);
      constraints.push(where('orderDate', '>=', Timestamp.fromDate(fromDateStart)));
    }
    if (currentActiveFilters.dateTo) {
      const toDateEnd = new Date(currentActiveFilters.dateTo);
      toDateEnd.setHours(23, 59, 59, 999);
      constraints.push(where('orderDate', '<=', Timestamp.fromDate(toDateEnd)));
    }
    
    constraints.push(orderBy('orderDate', 'desc'));

    if (currentCursor) {
      constraints.push(startAfter(currentCursor));
    }
    constraints.push(limit(PAGE_SIZE));
    
    return query(collection(db, 'orders'), ...constraints);
  }, []); 

  const fetchOrders = useCallback(async (
    cursor: QueryDocumentSnapshot<DocumentData> | null = null,
    isRefreshOrFilterChange = false,
    filtersForThisFetch: ActiveFilters 
  ) => {
    if (isLoading && !isRefreshOrFilterChange) { 
        return;
    }
    
    setIsLoading(true);
    if (isRefreshOrFilterChange) {
      setIsInitialLoading(true);
    }

    try {
      if (isRefreshOrFilterChange) { 
        setAllOrders([]); 
        setLastVisibleDoc(null);
        setFirstVisibleDoc(null); 
        setHasMore(true); 
      }

      const ordersQuery = buildBaseQuery(filtersForThisFetch, cursor);
      const documentSnapshots = await getDocs(ordersQuery);
      
      let fetchedOrdersBatch: AdminOrder[] = [];
      documentSnapshots.docs.forEach((docSn) => {
        fetchedOrdersBatch.push({ id: docSn.id, ...docSn.data() } as AdminOrder);
      });

      if (typeof filtersForThisFetch.minAmount === 'number' || typeof filtersForThisFetch.maxAmount === 'number') {
        fetchedOrdersBatch = fetchedOrdersBatch.filter(order => {
          const amount = order.amount;
          const meetsMin = typeof filtersForThisFetch.minAmount === 'number' ? amount >= filtersForThisFetch.minAmount : true;
          const meetsMax = typeof filtersForThisFetch.maxAmount === 'number' ? amount <= filtersForThisFetch.maxAmount : true;
          return meetsMin && meetsMax;
        });
      }
      
      if (isRefreshOrFilterChange || !cursor) { 
        setAllOrders(fetchedOrdersBatch);
      } else { 
        setAllOrders(prevOrders => [...prevOrders, ...fetchedOrdersBatch]);
      }
      
      const newLastVisibleDoc = documentSnapshots.docs.length > 0 ? documentSnapshots.docs[documentSnapshots.docs.length - 1] : null;
      setLastVisibleDoc(newLastVisibleDoc);
      
      const newFirstVisibleDoc = documentSnapshots.docs.length > 0 ? documentSnapshots.docs[0] : null;
      if (isRefreshOrFilterChange || !cursor) {
        setFirstVisibleDoc(newFirstVisibleDoc);
      }

      setHasMore(documentSnapshots.docs.length === PAGE_SIZE);

    } catch (error) {
      console.error("Error fetching orders: ", error);
      toast({
        title: 'Error Fetching Orders',
        description: (error as Error).message || 'Could not load orders. Check console for details & ensure Firestore indexes are set up for current filters.',
        variant: 'destructive',
      });
      setHasMore(false);
    } finally {
      setIsLoading(false);
      if (isRefreshOrFilterChange) {
        setIsInitialLoading(false);
      }
    }
  },
  [ 
    toast,
    buildBaseQuery, 
    setIsLoading,
    setIsInitialLoading,
    setAllOrders,
    setLastVisibleDoc,
    setFirstVisibleDoc,
    setHasMore,
  ]
);

useEffect(() => {
  fetchOrders(null, true, activeFilters); 
}, [activeFilters, fetchOrders]); 

useEffect(() => {
  const currentObserver = observerRef.current; 

  if (isLoading || !hasMore) {
    if (currentObserver) currentObserver.disconnect();
    return;
  }

  const observerInstance = new IntersectionObserver(
    (entries) => {
      if (entries[0].isIntersecting && lastVisibleDoc) { 
        fetchOrders(lastVisibleDoc, false, activeFilters); 
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
    if (observerInstance) {
      observerInstance.disconnect();
    }
  };
}, [isLoading, hasMore, lastVisibleDoc, fetchOrders, activeFilters]);


  useEffect(() => {
    const lowercasedSearch = searchTerm.toLowerCase();
    if (searchTerm === '') {
      setFilteredOrders(allOrders || []);
    } else {
      const currentOrders = allOrders || [];
      const searchedData = currentOrders.filter(order =>
        order.orderId.toLowerCase().includes(lowercasedSearch) ||
        order.customerName.toLowerCase().includes(lowercasedSearch) ||
        order.customerEmail.toLowerCase().includes(lowercasedSearch)
      );
      setFilteredOrders(searchedData);
    }
  }, [searchTerm, allOrders]);

  const handleRefresh = useCallback(() => {
    setSearchTerm(''); 
    fetchOrders(null, true, activeFilters); 
  }, [fetchOrders, activeFilters]);

  const openDetailsDialog = useCallback((order: AdminOrder) => {
    setSelectedOrderForDetails(order);
    setIsDetailsDialogOpen(true);
  }, []);

  const closeDetailsDialog = useCallback(() => {
    setIsDetailsDialogOpen(false);
    setSelectedOrderForDetails(null);
  }, []);

  const handleUpdateStatus = useCallback(async (orderId: string) => {
    setIsModifyLoading(true);
    try {
      const orderRef = doc(db, 'orders', orderId);
      await updateDoc(orderRef, {
        orderStatus: 'delivered',
        updatedAt: serverTimestamp()
      });
      toast({
        title: 'Status Updated',
        description: `Order ${orderId} marked as delivered.`,
      });
      setAllOrders(prevOrders => prevOrders.map(o => 
        o.id === orderId ? {...o, orderStatus: 'delivered', updatedAt: Timestamp.now()} : o
      ));
    } catch (error) {
      console.error("Error updating order status: ", error);
      toast({
        title: 'Update Failed',
        description: (error as Error).message || 'Could not update order status.',
        variant: 'destructive',
      });
    } finally {
      setIsModifyLoading(false);
    }
  }, [toast]);
  
  const openDeleteConfirmDialog = useCallback((order: AdminOrder) => {
    setOrderToModify(order);
  }, []);

  const closeDeleteConfirmDialog = useCallback(() => {
    setOrderToModify(null);
  }, []);

  const handleDeleteOrder = useCallback(async () => {
    if (!orderToModify || !orderToModify.id) return;
    setIsModifyLoading(true);
    try {
      await deleteDoc(doc(db, 'orders', orderToModify.id));
      toast({
        title: 'Order Deleted',
        description: `Order "${orderToModify.orderId}" has been successfully deleted.`,
      });
      setAllOrders(prevOrders => prevOrders.filter(o => o.id !== orderToModify.id));
    } catch (error) {
      console.error("Error deleting order: ", error);
      toast({
        title: 'Deletion Failed',
        description: (error as Error).message || 'Could not delete the order.',
        variant: 'destructive',
      });
    } finally {
      setIsModifyLoading(false);
      closeDeleteConfirmDialog();
    }
  }, [orderToModify, toast, closeDeleteConfirmDialog]);

  const formatCurrency = (amount?: number, currencyCode: string = "INR") => {
    if (amount === undefined || amount === null) return 'N/A';
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: currencyCode }).format(amount);
  };

  const getStatusVariant = (status: string): "default" | "secondary" | "destructive" | "outline" => {
    const lowerStatus = status.toLowerCase();
    if (['paid', 'delivered', 'completed', 'shipped', 'created'].includes(lowerStatus)) return 'default';
    if (['pending', 'processing', 'confirmed'].includes(lowerStatus)) return 'secondary';
    if (['cancelled', 'failed', 'refunded'].includes(lowerStatus)) return 'destructive';
    return 'outline';
  };

  const handleApplyFilters = () => {
    const newActiveFilters: ActiveFilters = {};
    if (filterDateFrom) newActiveFilters.dateFrom = filterDateFrom;
    if (filterDateTo) newActiveFilters.dateTo = filterDateTo;
    if (filterStatus) newActiveFilters.status = filterStatus;
    
    const minAmountNum = parseFloat(filterMinAmount);
    if (!isNaN(minAmountNum) && filterMinAmount.trim() !== '') newActiveFilters.minAmount = minAmountNum;
    
    const maxAmountNum = parseFloat(filterMaxAmount);
    if (!isNaN(maxAmountNum) && filterMaxAmount.trim() !== '') newActiveFilters.maxAmount = maxAmountNum;

    setActiveFilters(newActiveFilters); 
    setIsFilterPopoverOpen(false);
  };

  const handleClearFilters = () => {
    setFilterDateFrom(undefined);
    setFilterDateTo(undefined);
    setFilterStatus('');
    setFilterMinAmount('');
    setFilterMaxAmount('');
    setActiveFilters({}); 
    setIsFilterPopoverOpen(false);
  };

  const displayOrders = searchTerm ? filteredOrders : (allOrders || []); 

  const getActiveFilterCount = () => {
    return Object.values(activeFilters).filter(v => {
      if (v === undefined || v === '') return false;
      if (typeof v === 'number' && isNaN(v)) return false; 
      return true;
    }).length;
  }

  return (
    <>
      <PageHeader
        title="Orders Management"
        description="View, filter, and manage customer orders. CHECK BROWSER CONSOLE FOR FIRESTORE INDEX ERRORS."
        actions={
          <div className="flex items-center gap-2">
            <Popover open={isFilterPopoverOpen} onOpenChange={setIsFilterPopoverOpen}>
              <PopoverTrigger asChild>
                <Button variant="outline" disabled={isInitialLoading || isLoading || isModifyLoading}>
                  <FilterIcon className="mr-2 h-4 w-4" />
                  Filters {getActiveFilterCount() > 0 && `(${getActiveFilterCount()})`}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-80" align="end">
                <div className="grid gap-4">
                  <div className="space-y-2">
                    <h4 className="font-medium leading-none">Filters</h4>
                    <p className="text-sm text-muted-foreground">
                      Apply filters to narrow down orders.
                    </p>
                  </div>
                  <div className="grid gap-3">
                     <div className="grid grid-cols-2 gap-2">
                        <div>
                            <Label htmlFor="dateFrom">From Date</Label>
                            <Popover>
                                <PopoverTrigger asChild>
                                <Button id="dateFrom" variant={"outline"} className="w-full justify-start text-left font-normal" >
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
                            <Label htmlFor="dateTo">To Date</Label>
                             <Popover>
                                <PopoverTrigger asChild>
                                <Button id="dateTo" variant={"outline"} className="w-full justify-start text-left font-normal" >
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
                    <div>
                      <Label htmlFor="status">Order Status</Label>
                      <Select value={filterStatus} onValueChange={setFilterStatus}>
                        <SelectTrigger id="status">
                            <SelectValue placeholder="All Statuses" />
                        </SelectTrigger>
                        <SelectContent>
                          {ORDER_STATUSES.map(status => (
                            <SelectItem key={status} value={status} className="capitalize">{status}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                        <div>
                            <Label htmlFor="minAmount">Min Amount (₹)</Label>
                            <Input id="minAmount" type="number" placeholder="e.g., 100" value={filterMinAmount} onChange={e => setFilterMinAmount(e.target.value)} />
                        </div>
                        <div>
                            <Label htmlFor="maxAmount">Max Amount (₹)</Label>
                            <Input id="maxAmount" type="number" placeholder="e.g., 5000" value={filterMaxAmount} onChange={e => setFilterMaxAmount(e.target.value)} />
                        </div>
                    </div>
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button variant="ghost" onClick={handleClearFilters}>Clear</Button>
                    <Button onClick={handleApplyFilters} className="bg-primary hover:bg-primary/90">Apply Filters</Button>
                  </div>
                </div>
              </PopoverContent>
            </Popover>
            <Button onClick={handleRefresh} variant="outline" size="icon" disabled={isLoading || isModifyLoading}>
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
                <ShoppingCart className="h-6 w-6 text-primary" />
                <span>Orders List</span>
              </CardTitle>
              <CardDescription>
                Browse customer orders. Scroll to load more. Indexes on 'orderDate' (desc), 'orderStatus', and combinations might be required by Firestore.
                PLEASE CHECK BROWSER CONSOLE FOR FIRESTORE INDEX ERRORS.
              </CardDescription>
            </div>
          </div>
          <div className="mt-4 relative">
            <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search by Order ID, Customer Name or Email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 w-full md:w-1/2 lg:w-1/3"
              disabled={isInitialLoading && (allOrders || []).length === 0 && !Object.values(activeFilters).some(Boolean)}
            />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <ScrollArea className="h-[60vh]"> 
            {isInitialLoading ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Order ID</TableHead><TableHead>Customer</TableHead><TableHead>Date</TableHead><TableHead>Total</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {[...Array(Math.floor(PAGE_SIZE / 2))].map((_, i) => ( 
                    <TableRow key={`skeleton-${i}`}>
                      <TableCell><Skeleton className="h-5 w-24" /></TableCell><TableCell><Skeleton className="h-5 w-32" /></TableCell><TableCell><Skeleton className="h-5 w-40" /></TableCell><TableCell><Skeleton className="h-5 w-20" /></TableCell><TableCell><Skeleton className="h-6 w-24" /></TableCell><TableCell className="text-right"><Skeleton className="h-8 w-8 ml-auto" /></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : displayOrders.length === 0 ? (
              <div className="flex flex-col items-center justify-center text-center p-10 min-h-[300px]">
                <PackageSearch className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-xl font-semibold">
                  {searchTerm || getActiveFilterCount() > 0 ? 'No Orders Match Your Search/Filters' : 'No Orders Found'}
                </h3>
                <p className="text-muted-foreground">
                  {searchTerm || getActiveFilterCount() > 0 ? 'Try different criteria or clear search/filters.' : "The 'orders' collection might be empty or there was an issue fetching data (check console for index errors)."}
                </p>
                {(searchTerm || getActiveFilterCount() > 0) && (
                    <Button onClick={() => { setSearchTerm(''); handleClearFilters(); }} variant="outline" className="mt-4">Clear Search & Filters</Button>
                )}
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Order ID</TableHead><TableHead>Customer</TableHead><TableHead>Date</TableHead><TableHead>Total</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {displayOrders.map((order) => (
                    <TableRow key={order.id}>
                      <TableCell className="font-mono text-xs">{order.orderId}</TableCell>
                      <TableCell>
                          <div>{order.customerName}</div>
                          <div className="text-xs text-muted-foreground">{order.customerEmail}</div>
                      </TableCell>
                      <TableCell>
                        {order.orderDate instanceof Timestamp && isValid(order.orderDate.toDate())
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
                            <Button variant="ghost" className="h-8 w-8 p-0" disabled={isModifyLoading}>
                              <span className="sr-only">Open menu</span><MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => openDetailsDialog(order)}><Eye className="mr-2 h-4 w-4" /> View Details</DropdownMenuItem>
                            <DropdownMenuItem 
                                onClick={() => handleUpdateStatus(order.id)} 
                                disabled={order.orderStatus.toLowerCase() === 'delivered' || isModifyLoading}>
                                    <CheckCircle className="mr-2 h-4 w-4" /> Mark as Delivered
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => openDeleteConfirmDialog(order)} className="text-destructive focus:text-destructive focus:bg-destructive/10" disabled={isModifyLoading}><Trash2 className="mr-2 h-4 w-4" /> Delete Order</DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
            <div ref={loadMoreRef} className="h-10 flex items-center justify-center">
              {isLoading && !isInitialLoading && <p className="text-muted-foreground">Loading more orders...</p>}
              {!isLoading && !isInitialLoading && !hasMore && displayOrders.length > 0 && <p className="text-muted-foreground">No more orders to load.</p>}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      {isDetailsDialogOpen && selectedOrderForDetails && (
        <OrderDetailsDialog isOpen={isDetailsDialogOpen} onClose={closeDetailsDialog} order={selectedOrderForDetails} />
      )}

      {orderToModify && !isDetailsDialogOpen && ( 
        <AlertDialog open={!!orderToModify} onOpenChange={(open) => !open && closeDeleteConfirmDialog()}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
              <AlertDialogDescription>This action cannot be undone. This will permanently delete the order "{orderToModify.orderId}".</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={closeDeleteConfirmDialog} disabled={isModifyLoading}>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleDeleteOrder} disabled={isModifyLoading} className="bg-destructive hover:bg-destructive/90">{isModifyLoading ? "Deleting..." : "Yes, delete order"}</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </>
  );
}
