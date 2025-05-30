
'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { db } from '@/lib/firebase';
import { collection, query, orderBy, Timestamp, doc, deleteDoc, getDocs, limit, startAfter, QueryDocumentSnapshot, DocumentData, where, QueryConstraint } from 'firebase/firestore';
import type { VipNumber } from '@/types';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { MoreHorizontal, Edit, Trash2, PackageSearch, PlusCircle, Search as SearchIcon, RefreshCcw } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { VipNumberDialog } from '@/components/products/dialogs/VipNumberDialog';
import { useToast } from '@/hooks/use-toast';
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
import type { ProductActiveFilters } from '@/app/admin/products/page';

interface VipNumbersTabProps {
  categoryMap: Record<string, string>;
  activeFilters: ProductActiveFilters;
}

const PAGE_SIZE = 10;

export function VipNumbersTab({ categoryMap, activeFilters }: VipNumbersTabProps) {
  const [allVipNumbers, setAllVipNumbers] = useState<VipNumber[]>([]);
  const [filteredVipNumbers, setFilteredVipNumbers] = useState<VipNumber[]>([]);
  
  const [isLoading, setIsLoading] = useState(false);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  
  const [lastVisibleDoc, setLastVisibleDoc] = useState<QueryDocumentSnapshot<DocumentData> | null>(null);
  const [firstVisibleDoc, setFirstVisibleDoc] = useState<QueryDocumentSnapshot<DocumentData> | null>(null); 
  const [hasMore, setHasMore] = useState(true);

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingVipNumber, setEditingVipNumber] = useState<VipNumber | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [vipNumberToDelete, setVipNumberToDelete] = useState<VipNumber | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const { toast } = useToast();

  const observerRef = useRef<IntersectionObserver | null>(null);
  const loadMoreRef = useRef<HTMLDivElement | null>(null);
  
  const buildPageQuery = useCallback((cursor: QueryDocumentSnapshot<DocumentData> | null, currentFilters: ProductActiveFilters) => {
    const constraints: QueryConstraint[] = [];

    if (currentFilters.status) {
      constraints.push(where('status', '==', currentFilters.status));
    }
    if (currentFilters.categorySlug) {
      constraints.push(where('categorySlug', '==', currentFilters.categorySlug));
    }
    if (currentFilters.dateFrom) {
      const fromDateStart = new Date(currentFilters.dateFrom);
      fromDateStart.setHours(0,0,0,0);
      constraints.push(where('createdAt', '>=', Timestamp.fromDate(fromDateStart)));
    }
    if (currentFilters.dateTo) {
      const toDateEnd = new Date(currentFilters.dateTo);
      toDateEnd.setHours(23, 59, 59, 999);
      constraints.push(where('createdAt', '<=', Timestamp.fromDate(toDateEnd)));
    }

    constraints.push(orderBy('createdAt', 'desc'));
    if (cursor) {
      constraints.push(startAfter(cursor));
    }
    constraints.push(limit(PAGE_SIZE));
    
    return query(collection(db, 'vipNumbers'), ...constraints);
  }, []); 

  const loadVipNumbers = useCallback(async (
    cursor: QueryDocumentSnapshot<DocumentData> | null = null, 
    isRefreshOrFilterChange = false,
    currentFilters: ProductActiveFilters
  ) => {
    if (isLoading && !isRefreshOrFilterChange) return;

    setIsLoading(true);
    if (isRefreshOrFilterChange) {
      setIsInitialLoading(true);
      setSearchTerm(''); 
    }

    try {
      if (isRefreshOrFilterChange) {
        setAllVipNumbers([]);
        setLastVisibleDoc(null);
        setFirstVisibleDoc(null);
        setHasMore(true); 
      }

      const vipNumbersQuery = buildPageQuery(cursor, currentFilters);
      const documentSnapshots = await getDocs(vipNumbersQuery);
      
      let fetchedVipNumbersBatch: VipNumber[] = [];
      documentSnapshots.docs.forEach((docSn) => {
        fetchedVipNumbersBatch.push({ id: docSn.id, ...docSn.data() } as VipNumber);
      });

      if (typeof currentFilters.minPrice === 'number' || typeof currentFilters.maxPrice === 'number') {
        fetchedVipNumbersBatch = fetchedVipNumbersBatch.filter(vip => {
          const price = vip.price;
          const meetsMin = typeof currentFilters.minPrice === 'number' ? price >= currentFilters.minPrice : true;
          const meetsMax = typeof currentFilters.maxPrice === 'number' ? price <= currentFilters.maxPrice : true;
          return meetsMin && meetsMax;
        });
      }
      
      if (isRefreshOrFilterChange || !cursor) { 
        setAllVipNumbers(fetchedVipNumbersBatch);
      } else { 
        setAllVipNumbers(prevNumbers => [...prevNumbers, ...fetchedVipNumbersBatch]);
      }
      
      const newLastVisibleDoc = documentSnapshots.docs.length > 0 ? documentSnapshots.docs[documentSnapshots.docs.length - 1] : null;
      setLastVisibleDoc(newLastVisibleDoc);
      
      const newFirstVisibleDoc = documentSnapshots.docs.length > 0 ? documentSnapshots.docs[0] : null;
      if (isRefreshOrFilterChange || !cursor) {
         setFirstVisibleDoc(newFirstVisibleDoc);
      }
      
      setHasMore(documentSnapshots.docs.length === PAGE_SIZE); 
      
    } catch (error) {
      console.error("Error fetching VIP numbers: ", error);
      toast({
        title: 'Error Fetching VIP Numbers',
        description: (error as Error).message || 'Could not load VIP numbers.',
        variant: 'destructive',
      });
      setHasMore(false); 
    } finally {
      setIsLoading(false);
      if (isRefreshOrFilterChange) setIsInitialLoading(false);
    }
  }, [toast, buildPageQuery, setIsLoading, setIsInitialLoading, setAllVipNumbers, setLastVisibleDoc, setFirstVisibleDoc, setHasMore, setSearchTerm ]);

  useEffect(() => {
    loadVipNumbers(null, true, activeFilters); 
  }, [activeFilters, loadVipNumbers]); 

  useEffect(() => {
    if (searchTerm === '') {
      setFilteredVipNumbers(allVipNumbers);
    } else {
      const lowercasedFilter = searchTerm.toLowerCase();
      const filteredData = allVipNumbers.filter(item =>
        item.number.toLowerCase().includes(lowercasedFilter)
      );
      setFilteredVipNumbers(filteredData);
    }
  }, [searchTerm, allVipNumbers]);

  useEffect(() => {
    const currentObserver = observerRef.current; 

    if (isLoading || !hasMore) {
      if (currentObserver) currentObserver.disconnect();
      return;
    }

    const observerInstance = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && lastVisibleDoc) { 
          loadVipNumbers(lastVisibleDoc, false, activeFilters); 
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
  }, [isLoading, hasMore, lastVisibleDoc, loadVipNumbers, activeFilters]);


  const handleAddNewVipNumber = () => {
    setEditingVipNumber(null);
    setIsDialogOpen(true);
  };

  const handleEditVipNumber = (product: VipNumber) => {
    setEditingVipNumber(product);
    setIsDialogOpen(true);
  };

  const openDeleteConfirmDialog = (product: VipNumber) => {
    setVipNumberToDelete(product);
  };

  const handleDialogClose = useCallback(() => {
    setIsDialogOpen(false);
    setEditingVipNumber(null);
  }, []);

  const closeDeleteConfirmDialog = useCallback(() => {
    setVipNumberToDelete(null);
  }, []);

  const handleDeleteVipNumber = async () => {
    if (!vipNumberToDelete || !vipNumberToDelete.id) return;
    setIsDeleting(true);
    try {
      await deleteDoc(doc(db, 'vipNumbers', vipNumberToDelete.id));
      toast({
        title: 'VIP Number Deleted',
        description: `VIP Number "${vipNumberToDelete.number}" has been successfully deleted.`,
      });
      loadVipNumbers(null, true, activeFilters); 
    } catch (error) {
      console.error("Error deleting VIP Number: ", error);
      toast({
        title: 'Deletion Failed',
        description: (error as Error).message || 'Could not delete the VIP number.',
        variant: 'destructive',
      });
    } finally {
      setIsDeleting(false);
      closeDeleteConfirmDialog();
    }
  };

  const onDialogSuccess = useCallback(() => {
    loadVipNumbers(null, true, activeFilters); 
  }, [loadVipNumbers, activeFilters]);

  const handleRefresh = useCallback(() => {
    loadVipNumbers(null, true, activeFilters); 
  }, [loadVipNumbers, activeFilters]);

  const displayVipNumbers = searchTerm ? filteredVipNumbers : allVipNumbers;

  return (
    <Card className="shadow-lg">
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <CardTitle>VIP Numbers List</CardTitle>
            <CardDescription>Browse and manage individual VIP mobile numbers. Filters from above apply.</CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Button onClick={handleRefresh} variant="outline" size="icon" disabled={isLoading || isInitialLoading}>
              <RefreshCcw className="h-4 w-4" />
              <span className="sr-only">Refresh</span>
            </Button>
            <Button onClick={handleAddNewVipNumber} className="bg-primary hover:bg-primary/90" disabled={isLoading || isInitialLoading}>
              <PlusCircle className="mr-2 h-4 w-4" /> Add VIP Number
            </Button>
          </div>
        </div>
        <div className="mt-4 relative">
          <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search by number (on current loaded data)..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 w-full md:w-1/2 lg:w-1/3"
            disabled={isInitialLoading && allVipNumbers.length === 0 && !Object.values(activeFilters).some(Boolean)}
          />
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <ScrollArea className="h-[60vh]"> 
          {isInitialLoading ? (
            <div className="p-6 space-y-2">
              {[...Array(Math.floor(PAGE_SIZE / 2))].map((_, i) => (
                <div key={i} className="flex items-center justify-between p-2 border rounded-md">
                  <div className="flex-1 space-y-1">
                    <Skeleton className="h-5 w-1/3" />
                    <Skeleton className="h-4 w-1/4" />
                  </div>
                  <Skeleton className="h-5 w-16" />
                  <Skeleton className="h-8 w-8 ml-4" />
                </div>
              ))}
            </div>
          ) : displayVipNumbers.length === 0 ? (
            <div className="flex flex-col items-center justify-center text-center p-10 min-h-[300px]">
              <PackageSearch className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-xl font-semibold">
                {searchTerm || Object.values(activeFilters).some(Boolean) ? 'No VIP Numbers Match Your Search/Filters' : 'No VIP Numbers Found'}
              </h3>
              <p className="text-muted-foreground">
                {searchTerm || Object.values(activeFilters).some(Boolean) ? 'Try different criteria or clear search/filters.' : 'Add your first VIP number to see it listed here.'}
              </p>
              {!searchTerm && !Object.values(activeFilters).some(Boolean) && ( 
                <Button onClick={handleAddNewVipNumber} className="mt-4 bg-primary hover:bg-primary/90">
                  <PlusCircle className="mr-2 h-4 w-4" /> Add First VIP Number
                </Button>
              )}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Number</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead className="hidden md:table-cell">Original Price (₹)</TableHead>
                  <TableHead className="hidden md:table-cell">Discount (%)</TableHead>
                  <TableHead>Price (₹)</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="hidden lg:table-cell">Created At</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {displayVipNumbers.map((product) => (
                  <TableRow key={product.id}>
                    <TableCell className="font-medium">{product.number}</TableCell>
                    <TableCell>{categoryMap[product.categorySlug] || product.categorySlug}</TableCell>
                    <TableCell className="hidden md:table-cell">{product.originalPrice?.toLocaleString() || 'N/A'}</TableCell>
                    <TableCell className="hidden md:table-cell">{product.discount ? `${product.discount}%` : 'N/A'}</TableCell>
                    <TableCell>{product.price.toLocaleString()}</TableCell>
                    <TableCell>
                      <Badge 
                        variant={product.status === 'available' ? 'default' : product.status === 'sold' ? 'destructive' : 'secondary'}
                        className="capitalize"
                      >
                        {product.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="hidden lg:table-cell">
                      {product.createdAt instanceof Timestamp 
                        ? format(product.createdAt.toDate(), 'PPp') 
                        : typeof product.createdAt === 'string' 
                          ? product.createdAt 
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
                          <DropdownMenuItem onClick={() => handleEditVipNumber(product)} disabled={isDeleting}>
                            <Edit className="mr-2 h-4 w-4" /> Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => openDeleteConfirmDialog(product)}
                            className="text-destructive focus:text-destructive focus:bg-destructive/10"
                            disabled={isDeleting}
                          >
                            <Trash2 className="mr-2 h-4 w-4" /> Delete
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
            {isLoading && !isInitialLoading && <p className="text-muted-foreground">Loading more VIP numbers...</p>}
            {!isLoading && !hasMore && displayVipNumbers.length > 0 && <p className="text-muted-foreground">No more VIP numbers to load.</p>}
          </div>
        </ScrollArea>
      </CardContent>

      {isDialogOpen && (
        <VipNumberDialog
          isOpen={isDialogOpen}
          onClose={handleDialogClose}
          vipNumber={editingVipNumber}
          onSuccess={onDialogSuccess}
        />
      )}

      {vipNumberToDelete && (
        <AlertDialog open={!!vipNumberToDelete} onOpenChange={(open) => !open && closeDeleteConfirmDialog()}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
              <AlertDialogDescription>
                This action cannot be undone. This will permanently delete the VIP Number
                "{vipNumberToDelete.number}".
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={closeDeleteConfirmDialog} disabled={isDeleting}>
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction onClick={handleDeleteVipNumber} disabled={isDeleting} className="bg-destructive hover:bg-destructive/90">
                {isDeleting ? "Deleting..." : "Yes, delete number"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </Card>
  );
}
