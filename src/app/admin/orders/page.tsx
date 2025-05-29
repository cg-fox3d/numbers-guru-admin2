
'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { PageHeader } from '@/components/common/PageHeader';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { MoreHorizontal, ShoppingCart, PackageSearch, Search as SearchIcon, RefreshCcw, ChevronLeft, ChevronRight, Eye, Trash2, CheckCircle, Filter as FilterIcon, CalendarIcon } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
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


export default function OrdersPage() {
  const [allOrders, setAllOrders] = useState<AdminOrder[]>([]); // Holds data for the current page, before client-side filtering
  const [ordersOnPage, setOrdersOnPage] = useState<AdminOrder[]>([]); // Holds data after Firestore fetch, before client-side price filter
  const [filteredOrders, setFilteredOrders] = useState<AdminOrder[]>([]); // Final list for display after all filters
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const { toast } = useToast();

  const [currentPageIndex, setCurrentPageIndex] = useState(0);
  const [pageStartCursors, setPageStartCursors] = useState<(QueryDocumentSnapshot<DocumentData> | null)[]>([null]);
  const pageStartCursorsRef = useRef(pageStartCursors);

  const [lastVisibleDoc, setLastVisibleDoc] = useState<QueryDocumentSnapshot<DocumentData> | null>(null);
  const [firstVisibleDoc, setFirstVisibleDoc] = useState<QueryDocumentSnapshot<DocumentData> | null>(null);
  const [hasNextPage, setHasNextPage] = useState(false);

  const [selectedOrderForDetails, setSelectedOrderForDetails] = useState<AdminOrder | null>(null);
  const [isDetailsDialogOpen, setIsDetailsDialogOpen] = useState(false);
  const [orderToModify, setOrderToModify] = useState<AdminOrder | null>(null);
  const [isModifyLoading, setIsModifyLoading] = useState(false);

  // Filter states
  const [filterDateFrom, setFilterDateFrom] = useState<Date | undefined>(undefined);
  const [filterDateTo, setFilterDateTo] = useState<Date | undefined>(undefined);
  const [filterStatus, setFilterStatus] = useState<string>('');
  const [filterMinAmount, setFilterMinAmount] = useState<string>('');
  const [filterMaxAmount, setFilterMaxAmount] = useState<string>('');
  const [isFilterPopoverOpen, setIsFilterPopoverOpen] = useState(false);

  const [activeFilters, setActiveFilters] = useState<{
    dateFrom?: Date;
    dateTo?: Date;
    status?: string;
    minAmount?: number;
    maxAmount?: number;
  }>({});

  useEffect(() => {
    pageStartCursorsRef.current = pageStartCursors;
  }, [pageStartCursors]);

  const buildPageQuery = useCallback((cursor: QueryDocumentSnapshot<DocumentData> | null) => {
    const constraints: QueryConstraint[] = [];

    if (activeFilters.status) {
      constraints.push(where('orderStatus', '==', activeFilters.status));
    }
    if (activeFilters.dateFrom) {
      constraints.push(where('orderDate', '>=', Timestamp.fromDate(activeFilters.dateFrom)));
    }
    if (activeFilters.dateTo) {
      // To include the whole 'to' day, set time to end of day
      const toDateEnd = new Date(activeFilters.dateTo);
      toDateEnd.setHours(23, 59, 59, 999);
      constraints.push(where('orderDate', '<=', Timestamp.fromDate(toDateEnd)));
    }

    // Main ordering
    constraints.push(orderBy('orderDate', 'desc'));
    
    if (cursor) {
      constraints.push(startAfter(cursor));
    }
    constraints.push(limit(PAGE_SIZE + 1));

    return query(collection(db, 'orders'), ...constraints);
  }, [activeFilters]);

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
      
      setOrdersOnPage(fetchedOrders); // Set data before client-side price filtering
      // setAllOrders is for search, setOrdersOnPage is for price filter + display
      
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
        description: (error as Error).message || 'Could not load orders. Ensure Firestore indexes are set up for status/date filters.',
        variant: 'destructive',
      });
      setOrdersOnPage([]);
      setHasNextPage(false);
    } finally {
      setIsLoading(false);
    }
  }, [toast, buildPageQuery, lastVisibleDoc, setPageStartCursors, setIsLoading, setOrdersOnPage, setHasNextPage, setLastVisibleDoc, setSearchTerm, setFirstVisibleDoc]);

  useEffect(() => {
    loadOrders(currentPageIndex, {isRefresh: currentPageIndex === 0 && pageStartCursorsRef.current.length <=1 });
  }, [currentPageIndex, loadOrders, activeFilters]); // Re-fetch if activeFilters change

  // Client-side filtering (search and price range)
  useEffect(() => {
    let tempOrders = ordersOnPage || [];

    // Price Range Filter (Client-side)
    const min = activeFilters.minAmount;
    const max = activeFilters.maxAmount;
    if (typeof min === 'number' || typeof max === 'number') {
      tempOrders = tempOrders.filter(order => {
        const amount = order.amount;
        const meetsMin = typeof min === 'number' ? amount >= min : true;
        const meetsMax = typeof max === 'number' ? amount <= max : true;
        return meetsMin && meetsMax;
      });
    }
    setAllOrders(tempOrders); // Set for search filtering

    // Search Filter
    const lowercasedFilter = searchTerm.toLowerCase();
    if (searchTerm === '') {
      setFilteredOrders(tempOrders);
    } else {
      const filteredData = tempOrders.filter(order =>
        order.orderId.toLowerCase().includes(lowercasedFilter) ||
        order.customerName.toLowerCase().includes(lowercasedFilter) ||
        order.customerEmail.toLowerCase().includes(lowercasedFilter)
      );
      setFilteredOrders(filteredData);
    }
  }, [searchTerm, ordersOnPage, activeFilters]);


  const handleRefresh = useCallback(() => {
    if (currentPageIndex === 0) {
        loadOrders(0, { isRefresh: true });
    } else {
        setCurrentPageIndex(0); // This will trigger useEffect due to currentPageIndex change
    }
  }, [loadOrders, currentPageIndex]);

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

  const openDetailsDialog = (order: AdminOrder) => {
    setSelectedOrderForDetails(order);
    setIsDetailsDialogOpen(true);
  };

  const closeDetailsDialog = useCallback(() => {
    setIsDetailsDialogOpen(false);
    setSelectedOrderForDetails(null);
  }, []);

  const handleUpdateStatus = async (orderId: string) => {
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
      loadOrders(currentPageIndex, { isRefresh: true });
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
  };
  
  const openDeleteConfirmDialog = (order: AdminOrder) => {
    setOrderToModify(order);
  };

  const closeDeleteConfirmDialog = useCallback(() => {
    setOrderToModify(null);
  }, []);

  const handleDeleteOrder = async () => {
    if (!orderToModify || !orderToModify.id) return;
    setIsModifyLoading(true);
    try {
      await deleteDoc(doc(db, 'orders', orderToModify.id));
      toast({
        title: 'Order Deleted',
        description: `Order "${orderToModify.orderId}" has been successfully deleted.`,
      });
      const isLastItemOnPage = (ordersOnPage || []).length === 1;
      if (isLastItemOnPage && currentPageIndex > 0) {
        setCurrentPageIndex(prev => prev -1); 
      } else {
        loadOrders(currentPageIndex, { isRefresh: true });
      }
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
  };


  const formatCurrency = (amount: number, currencyCode: string = "INR") => {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: currencyCode }).format(amount);
  };

  const getStatusVariant = (status: string): "default" | "secondary" | "destructive" | "outline" => {
    const lowerStatus = status.toLowerCase();
    if (['paid', 'delivered', 'completed', 'shipped', 'created'].includes(lowerStatus)) {
      return 'default';
    }
    if (['pending', 'processing', 'confirmed'].includes(lowerStatus)) {
      return 'secondary';
    }
    if (['cancelled', 'failed', 'refunded'].includes(lowerStatus)) {
      return 'destructive';
    }
    return 'outline';
  };

  const handleApplyFilters = () => {
    const newActiveFilters: typeof activeFilters = {};
    if (filterDateFrom) newActiveFilters.dateFrom = filterDateFrom;
    if (filterDateTo) newActiveFilters.dateTo = filterDateTo;
    if (filterStatus) newActiveFilters.status = filterStatus;
    
    const minAmountNum = parseFloat(filterMinAmount);
    if (!isNaN(minAmountNum)) newActiveFilters.minAmount = minAmountNum;
    
    const maxAmountNum = parseFloat(filterMaxAmount);
    if (!isNaN(maxAmountNum)) newActiveFilters.maxAmount = maxAmountNum;

    setActiveFilters(newActiveFilters);
    setCurrentPageIndex(0); // Reset to first page when filters change
    setIsFilterPopoverOpen(false);
    // loadOrders will be called by useEffect due to activeFilters or currentPageIndex change
  };

  const handleClearFilters = () => {
    setFilterDateFrom(undefined);
    setFilterDateTo(undefined);
    setFilterStatus('');
    setFilterMinAmount('');
    setFilterMaxAmount('');
    setActiveFilters({});
    setCurrentPageIndex(0);
    setIsFilterPopoverOpen(false);
    // loadOrders will be called by useEffect
  };

  return (
    <>
      <PageHeader
        title="Orders Management"
        description="View and manage customer orders."
        actions={
          <div className="flex items-center gap-2">
            <Popover open={isFilterPopoverOpen} onOpenChange={setIsFilterPopoverOpen}>
              <PopoverTrigger asChild>
                <Button variant="outline" disabled={isLoading || isModifyLoading}>
                  <FilterIcon className="mr-2 h-4 w-4" />
                  Filters {Object.keys(activeFilters).length > 0 && `(${Object.keys(activeFilters).length})`}
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
                                <Button
                                    id="dateFrom"
                                    variant={"outline"}
                                    className="w-full justify-start text-left font-normal"
                                >
                                    <CalendarIcon className="mr-2 h-4 w-4" />
                                    {filterDateFrom ? format(filterDateFrom, "PPP") : <span>Pick a date</span>}
                                </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0">
                                <Calendar
                                    mode="single"
                                    selected={filterDateFrom}
                                    onSelect={setFilterDateFrom}
                                    initialFocus
                                />
                                </PopoverContent>
                            </Popover>
                        </div>
                        <div>
                            <Label htmlFor="dateTo">To Date</Label>
                             <Popover>
                                <PopoverTrigger asChild>
                                <Button
                                    id="dateTo"
                                    variant={"outline"}
                                    className="w-full justify-start text-left font-normal"
                                >
                                    <CalendarIcon className="mr-2 h-4 w-4" />
                                    {filterDateTo ? format(filterDateTo, "PPP") : <span>Pick a date</span>}
                                </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0">
                                <Calendar
                                    mode="single"
                                    selected={filterDateTo}
                                    onSelect={setFilterDateTo}
                                    disabled={(date) =>
                                        filterDateFrom ? date < filterDateFrom : false
                                      }
                                    initialFocus
                                />
                                </PopoverContent>
                            </Popover>
                        </div>
                    </div>
                    <div>
                      <Label htmlFor="status">Order Status</Label>
                      <Select value={filterStatus} onValueChange={setFilterStatus}>
                        <SelectTrigger id="status">
                          <SelectValue placeholder="Select status" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="">All Statuses</SelectItem>
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
                Browse customer orders. Indexes on 'orderDate' (desc), 'orderStatus', and 'amount' might be required.
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
                {searchTerm || Object.keys(activeFilters).length > 0 ? 'No Orders Match Your Search/Filters' : 
                 (ordersOnPage || []).length === 0 ? 'No Orders Found' : 'No Orders Match Your Search'}
              </h3>
              <p className="text-muted-foreground">
                {searchTerm || Object.keys(activeFilters).length > 0 ? 'Try different criteria or clear search/filters.' : 
                 (ordersOnPage || []).length === 0 ? "The 'orders' collection might be empty or there was an issue fetching data." : 'Adjust your search.'}
              </p>
              {(searchTerm || Object.keys(activeFilters).length > 0) && (
                  <Button onClick={() => { setSearchTerm(''); handleClearFilters(); }} variant="outline" className="mt-4">Clear Search & Filters</Button>
              )}
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
                            <span className="sr-only">Open menu</span>
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => openDetailsDialog(order)}>
                            <Eye className="mr-2 h-4 w-4" /> View Details
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            onClick={() => handleUpdateStatus(order.id)}
                            disabled={order.orderStatus.toLowerCase() === 'delivered'}
                          >
                            <CheckCircle className="mr-2 h-4 w-4" /> Mark as Delivered
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem 
                            onClick={() => openDeleteConfirmDialog(order)} 
                            className="text-destructive focus:text-destructive focus:bg-destructive/10"
                          >
                            <Trash2 className="mr-2 h-4 w-4" /> Delete Order
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
                        disabled={currentPageIndex === 0 || isLoading || isModifyLoading}
                    >
                        <ChevronLeft className="h-4 w-4 mr-1" /> Previous
                    </Button>
                    <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={handleNextPage} 
                        disabled={!hasNextPage || isLoading || isModifyLoading}
                    >
                        Next <ChevronRight className="h-4 w-4 ml-1" />
                    </Button>
                </div>
            </CardFooter>
        )}
      </Card>

      {isDetailsDialogOpen && selectedOrderForDetails && (
        <OrderDetailsDialog
          isOpen={isDetailsDialogOpen}
          onClose={closeDetailsDialog}
          order={selectedOrderForDetails}
        />
      )}

      {orderToModify && (
        <AlertDialog open={!!orderToModify && !selectedOrderForDetails} onOpenChange={(open) => !open && closeDeleteConfirmDialog()}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
              <AlertDialogDescription>
                This action cannot be undone. This will permanently delete the order
                "{orderToModify.orderId}".
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={closeDeleteConfirmDialog} disabled={isModifyLoading}>
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction onClick={handleDeleteOrder} disabled={isModifyLoading} className="bg-destructive hover:bg-destructive/90">
                {isModifyLoading ? "Deleting..." : "Yes, delete order"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </>
  );
}

