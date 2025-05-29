
'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { db } from '@/lib/firebase';
import { collection, query, orderBy, Timestamp, doc, deleteDoc, getDocs, limit, startAfter, QueryDocumentSnapshot, DocumentData, where, QueryConstraint } from 'firebase/firestore';
import type { NumberPack } from '@/types';
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
import { NumberPackDialog } from '@/components/products/dialogs/NumberPackDialog';
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

interface NumberPacksTabProps {
  categoryMap: Record<string, string>;
  activeFilters: ProductActiveFilters;
}

const PAGE_SIZE = 10;

export function NumberPacksTab({ categoryMap, activeFilters }: NumberPacksTabProps) {
  const [allNumberPacks, setAllNumberPacks] = useState<NumberPack[]>([]); 
  const [filteredNumberPacks, setFilteredNumberPacks] = useState<NumberPack[]>([]);
  
  const [isLoading, setIsLoading] = useState(false);
  const [isInitialLoading, setIsInitialLoading] = useState(true);

  const [lastVisibleDoc, setLastVisibleDoc] = useState<QueryDocumentSnapshot<DocumentData> | null>(null);
  const [firstVisibleDoc, setFirstVisibleDoc] = useState<QueryDocumentSnapshot<DocumentData> | null>(null);
  const [hasMore, setHasMore] = useState(true);

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingNumberPack, setEditingNumberPack] = useState<NumberPack | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [packToDelete, setPackToDelete] = useState<NumberPack | null>(null);
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
    // Price range filtering (on totalOriginalPrice) is done client-side.

    constraints.push(orderBy('createdAt', 'desc'));
    if (cursor) {
      constraints.push(startAfter(cursor));
    }
    constraints.push(limit(PAGE_SIZE));
    
    return query(collection(db, 'numberPacks'), ...constraints);
  }, []);

  const loadNumberPacks = useCallback(async (
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
        setAllNumberPacks([]);
        setLastVisibleDoc(null);
        setFirstVisibleDoc(null);
        setHasMore(true);
      }

      const packsQuery = buildPageQuery(cursor, currentFilters);
      const documentSnapshots = await getDocs(packsQuery);
      let fetchedPacksBatch: NumberPack[] = [];
      documentSnapshots.docs.forEach((docSn) => {
        fetchedPacksBatch.push({ id: docSn.id, ...docSn.data() } as NumberPack);
      });

      // Client-side price filtering on totalOriginalPrice
      if (typeof currentFilters.minPrice === 'number' || typeof currentFilters.maxPrice === 'number') {
        fetchedPacksBatch = fetchedPacksBatch.filter(pack => {
          const price = pack.totalOriginalPrice ?? 0; // Use totalOriginalPrice, default to 0 if undefined
          const meetsMin = typeof currentFilters.minPrice === 'number' ? price >= currentFilters.minPrice : true;
          const meetsMax = typeof currentFilters.maxPrice === 'number' ? price <= currentFilters.maxPrice : true;
          return meetsMin && meetsMax;
        });
      }

      if (isRefreshOrFilterChange || !cursor) {
        setAllNumberPacks(fetchedPacksBatch);
      } else {
        setAllNumberPacks(prevPacks => [...prevPacks, ...fetchedPacksBatch]);
      }
      
      const newLastVisibleDoc = documentSnapshots.docs.length > 0 ? documentSnapshots.docs[documentSnapshots.docs.length - 1] : null;
      setLastVisibleDoc(newLastVisibleDoc);
      
      const newFirstVisibleDoc = documentSnapshots.docs.length > 0 ? documentSnapshots.docs[0] : null;
      if (isRefreshOrFilterChange || !cursor) {
         setFirstVisibleDoc(newFirstVisibleDoc);
      }
      
      setHasMore(documentSnapshots.docs.length === PAGE_SIZE);
    } catch (error) {
      console.error("Error fetching number packs: ", error);
      toast({
        title: 'Error Fetching Number Packs',
        description: (error as Error).message || 'Could not load number packs. Check Firestore indexes for createdAt, status, categorySlug.',
        variant: 'destructive',
      });
      setHasMore(false);
    } finally {
      setIsLoading(false);
      if (isRefreshOrFilterChange) setIsInitialLoading(false);
    }
  }, [toast, buildPageQuery, setIsLoading, setIsInitialLoading, setAllNumberPacks, setLastVisibleDoc, setFirstVisibleDoc, setHasMore, setSearchTerm]);

  useEffect(() => {
    loadNumberPacks(null, true, activeFilters);
  }, [activeFilters, loadNumberPacks]);

  useEffect(() => {
    if (searchTerm === '') {
      setFilteredNumberPacks(allNumberPacks);
    } else {
      const lowercasedFilter = searchTerm.toLowerCase();
      const filteredData = allNumberPacks.filter(item =>
        item.name.toLowerCase().includes(lowercasedFilter)
      );
      setFilteredNumberPacks(filteredData);
    }
  }, [searchTerm, allNumberPacks]);
  
  useEffect(() => {
    const currentObserver = observerRef.current;
    const currentLoadMoreRef = loadMoreRef.current;

    if (isLoading || !hasMore) {
      if (currentObserver && currentLoadMoreRef) currentObserver.unobserve(currentLoadMoreRef);
      return;
    }
    
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && lastVisibleDoc) {
          loadNumberPacks(lastVisibleDoc, false, activeFilters);
        }
      },
      { threshold: 1.0 }
    );

    if (currentLoadMoreRef) {
      observer.observe(currentLoadMoreRef);
    }
    observerRef.current = observer;

    return () => {
      if (observer && currentLoadMoreRef) {
        observer.unobserve(currentLoadMoreRef);
      }
    };
  }, [isLoading, hasMore, lastVisibleDoc, loadNumberPacks, activeFilters]);

  const handleAddNewPack = () => {
    setEditingNumberPack(null);
    setIsDialogOpen(true);
  };

  const handleEditPack = (pack: NumberPack) => {
    setEditingNumberPack(pack);
    setIsDialogOpen(true);
  };

  const openDeleteConfirmDialog = (pack: NumberPack) => {
    setPackToDelete(pack);
  };

  const handleDialogClose = useCallback(() => {
    setIsDialogOpen(false);
    setEditingNumberPack(null);
  }, []);

  const closeDeleteConfirmDialog = useCallback(() => {
    setPackToDelete(null);
  }, []);

  const handleDeletePack = async () => {
    if (!packToDelete || !packToDelete.id) return;
    setIsDeleting(true);
    try {
      await deleteDoc(doc(db, 'numberPacks', packToDelete.id));
      toast({
        title: 'Number Pack Deleted',
        description: `Pack "${packToDelete.name}" has been successfully deleted.`,
      });
      loadNumberPacks(null, true, activeFilters); // Refresh
    } catch (error) {
      console.error("Error deleting number pack: ", error);
      toast({
        title: 'Deletion Failed',
        description: (error as Error).message || 'Could not delete the number pack.',
        variant: 'destructive',
      });
    } finally {
      setIsDeleting(false);
      closeDeleteConfirmDialog();
    }
  };

  const onDialogSuccess = useCallback(() => {
    loadNumberPacks(null, true, activeFilters); // Refresh
  }, [loadNumberPacks, activeFilters]);
  
  const handleRefresh = useCallback(() => {
    loadNumberPacks(null, true, activeFilters); // Refresh
  }, [loadNumberPacks, activeFilters]);
  
  const displayNumberPacks = searchTerm ? filteredNumberPacks : allNumberPacks;

  return (
    <Card className="shadow-lg">
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <CardTitle>Number Packs List</CardTitle>
            <CardDescription>Browse and manage number pack bundles. Filters from above apply. Check console for Firestore index errors.</CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Button onClick={handleRefresh} variant="outline" size="icon" disabled={isLoading || isInitialLoading}>
              <RefreshCcw className="h-4 w-4" />
              <span className="sr-only">Refresh</span>
            </Button>
            <Button onClick={handleAddNewPack} className="bg-primary hover:bg-primary/90" disabled={isLoading || isInitialLoading}>
                <PlusCircle className="mr-2 h-4 w-4" /> Add New Pack
            </Button>
          </div>
        </div>
        <div className="mt-4 relative">
          <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search by pack name (on current loaded data)..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 w-full md:w-1/2 lg:w-1/3"
            disabled={isInitialLoading && allNumberPacks.length === 0 && !Object.values(activeFilters).some(Boolean)}
          />
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <ScrollArea className="h-[60vh]"> {/* Ensure height is set for ScrollArea */}
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
          ) : displayNumberPacks.length === 0 ? (
            <div className="flex flex-col items-center justify-center text-center p-10 min-h-[300px]">
              <PackageSearch className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-xl font-semibold">
                {searchTerm || Object.values(activeFilters).some(Boolean) ? 'No Number Packs Match Your Search/Filters' : 'No Number Packs Found'}
              </h3>
              <p className="text-muted-foreground">
                {searchTerm || Object.values(activeFilters).some(Boolean) ? 'Try a different search term or clear search/filters.' : 'Create your first number pack to see it listed here.'}
              </p>
              {!searchTerm && !Object.values(activeFilters).some(Boolean) && ( 
                <Button onClick={handleAddNewPack} className="mt-4 bg-primary hover:bg-primary/90">
                  <PlusCircle className="mr-2 h-4 w-4" /> Add First Number Pack
                </Button>
              )}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Pack Name</TableHead>
                  <TableHead>Items</TableHead>
                  <TableHead>Total Original Price (₹)</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead className="hidden lg:table-cell max-w-xs truncate">Description</TableHead>
                  <TableHead className="hidden lg:table-cell">Created At</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {displayNumberPacks.map((pack) => (
                  <TableRow key={pack.id}>
                    <TableCell className="font-medium">{pack.name}</TableCell>
                    <TableCell>{pack.numbers?.length || 0}</TableCell>
                    <TableCell>{(pack.totalOriginalPrice ?? 0).toLocaleString()}</TableCell>
                    <TableCell>
                      <Badge 
                        variant={pack.status === 'available' ? 'default' : pack.status === 'sold' ? 'destructive' : 'secondary'}
                        className="capitalize"
                      >
                        {pack.status}
                      </Badge>
                    </TableCell>
                    <TableCell>{categoryMap[pack.categorySlug] || pack.categorySlug}</TableCell>
                    <TableCell className="hidden lg:table-cell max-w-xs truncate">{pack.description || 'N/A'}</TableCell>
                    <TableCell className="hidden lg:table-cell">
                      {pack.createdAt instanceof Timestamp 
                        ? format(pack.createdAt.toDate(), 'PPp') 
                        : typeof pack.createdAt === 'string' 
                          ? pack.createdAt 
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
                          <DropdownMenuItem onClick={() => handleEditPack(pack)} disabled={isDeleting}>
                            <Edit className="mr-2 h-4 w-4" /> Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => openDeleteConfirmDialog(pack)} className="text-destructive focus:text-destructive focus:bg-destructive/10" disabled={isDeleting}>
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
            {isLoading && !isInitialLoading && <p className="text-muted-foreground">Loading more packs...</p>}
            {!isLoading && !hasMore && displayNumberPacks.length > 0 && <p className="text-muted-foreground">No more packs to load.</p>}
          </div>
        </ScrollArea>
      </CardContent>

      {isDialogOpen && (
        <NumberPackDialog
            isOpen={isDialogOpen}
            onClose={handleDialogClose}
            numberPack={editingNumberPack}
            onSuccess={onDialogSuccess}
        />
      )}

      {packToDelete && (
        <AlertDialog open={!!packToDelete} onOpenChange={(open) => !open && closeDeleteConfirmDialog()}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
              <AlertDialogDescription>
                This action cannot be undone. This will permanently delete the number pack
                "{packToDelete.name}".
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={closeDeleteConfirmDialog} disabled={isDeleting}>
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction onClick={handleDeletePack} disabled={isDeleting} className="bg-destructive hover:bg-destructive/90">
                {isDeleting ? "Deleting..." : "Yes, delete pack"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </Card>
  );
}
    