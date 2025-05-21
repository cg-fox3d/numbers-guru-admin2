
'use client';

import { useEffect, useState, useCallback } from 'react';
import { db } from '@/lib/firebase';
import { collection, query, orderBy, Timestamp, doc, deleteDoc, getDocs, limit, startAfter, QueryDocumentSnapshot, DocumentData } from 'firebase/firestore';
import type { VipNumber } from '@/types';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { MoreHorizontal, Edit, Trash2, PackageSearch, PlusCircle, Search as SearchIcon, RefreshCcw, ChevronLeft, ChevronRight } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
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

interface VipNumbersTabProps {
  categoryMap: Record<string, string>;
}

const PAGE_SIZE = 10;

export function VipNumbersTab({ categoryMap }: VipNumbersTabProps) {
  const [vipNumbersOnPage, setVipNumbersOnPage] = useState<VipNumber[]>([]);
  const [filteredVipNumbers, setFilteredVipNumbers] = useState<VipNumber[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingVipNumber, setEditingVipNumber] = useState<VipNumber | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [vipNumberToDelete, setVipNumberToDelete] = useState<VipNumber | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const { toast } = useToast();

  const [currentPageIndex, setCurrentPageIndex] = useState(0);
  const [pageStartCursors, setPageStartCursors] = useState<(QueryDocumentSnapshot<DocumentData> | null)[]>([null]);
  const [lastVisibleDoc, setLastVisibleDoc] = useState<QueryDocumentSnapshot<DocumentData> | null>(null);
  const [firstVisibleDoc, setFirstVisibleDoc] = useState<QueryDocumentSnapshot<DocumentData> | null>(null);
  const [hasNextPage, setHasNextPage] = useState(false);

  const buildPageQuery = useCallback((cursor: QueryDocumentSnapshot<DocumentData> | null, direction: 'next' | 'prev' | 'current' = 'next') => {
    let q = query(collection(db, 'vipNumbers'), orderBy('createdAt', 'desc'));

    if (cursor) {
      if (direction === 'next') {
        q = query(q, startAfter(cursor), limit(PAGE_SIZE + 1));
      } else if (direction === 'prev') {
        // For 'prev', cursor is the start of the target previous page.
        q = query(q, startAfter(cursor), limit(PAGE_SIZE + 1));
      }
    } else {
      // First page or refresh
      q = query(q, limit(PAGE_SIZE + 1));
    }
    return q;
  }, []);

  const loadVipNumbers = useCallback(async (pageIdxToLoad: number, options: { isRefresh?: boolean } = {}) => {
    setIsLoading(true);
    if (options.isRefresh) {
      setSearchTerm('');
    }

    try {
      let queryCursor: QueryDocumentSnapshot<DocumentData> | null = null;

      if (options.isRefresh || pageIdxToLoad === 0) {
        queryCursor = null;
      } else if (pageIdxToLoad > 0 && pageIdxToLoad < pageStartCursors.length) {
        queryCursor = pageStartCursors[pageIdxToLoad];
      } else if (pageIdxToLoad > 0 && lastVisibleDoc && pageIdxToLoad === pageStartCursors.length) {
        queryCursor = lastVisibleDoc;
      }
      
      const vipNumbersQuery = buildPageQuery(queryCursor, options.isRefresh || pageIdxToLoad === 0 ? 'current' : (pageIdxToLoad > currentPageIndex ? 'next' : 'prev') );
      const documentSnapshots = await getDocs(vipNumbersQuery);

      const fetchedVipNumbers: VipNumber[] = [];
      documentSnapshots.docs.slice(0, PAGE_SIZE).forEach((docSn) => {
        fetchedVipNumbers.push({ id: docSn.id, ...docSn.data() } as VipNumber);
      });
      
      setVipNumbersOnPage(fetchedVipNumbers);

      const newFirstVisibleDoc = documentSnapshots.docs.length > 0 ? documentSnapshots.docs[0] : null;
      setFirstVisibleDoc(newFirstVisibleDoc);
      
      const newLastVisibleDoc = documentSnapshots.docs.length > PAGE_SIZE
        ? documentSnapshots.docs[PAGE_SIZE - 1]
        : (documentSnapshots.docs.length > 0 ? documentSnapshots.docs[documentSnapshots.docs.length - 1] : null);
      setLastVisibleDoc(newLastVisibleDoc);

      const newHasNextPage = documentSnapshots.docs.length > PAGE_SIZE;
      setHasNextPage(newHasNextPage);

      if (options.isRefresh || pageIdxToLoad === 0) {
        setPageStartCursors([null, newFirstVisibleDoc].filter(c => c !== undefined) as (QueryDocumentSnapshot<DocumentData> | null)[]);
      } else if (pageIdxToLoad >= pageStartCursors.length && newFirstVisibleDoc) {
        setPageStartCursors(prev => [...prev, newFirstVisibleDoc]);
      }
      
    } catch (error) {
      console.error("Error fetching VIP numbers: ", error);
      toast({
        title: 'Error Fetching VIP Numbers',
        description: (error as Error).message || 'Could not load VIP numbers. An index on \'vipNumbers\' for \'createdAt\' (desc) might be required.',
        variant: 'destructive',
      });
      setVipNumbersOnPage([]);
      setHasNextPage(false);
    } finally {
      setIsLoading(false);
    }
  }, [toast, buildPageQuery, currentPageIndex]); // currentPageIndex to re-evaluate cursor logic if direction depends on it.

  useEffect(() => {
    loadVipNumbers(currentPageIndex, {isRefresh: currentPageIndex === 0 && pageStartCursors.length <=1 });
  }, [currentPageIndex, loadVipNumbers]);

  useEffect(() => {
    if (searchTerm === '') {
      setFilteredVipNumbers(vipNumbersOnPage);
    } else {
      const lowercasedFilter = searchTerm.toLowerCase();
      const filteredData = (vipNumbersOnPage || []).filter(item =>
        item.number.toLowerCase().includes(lowercasedFilter)
      );
      setFilteredVipNumbers(filteredData);
    }
  }, [searchTerm, vipNumbersOnPage]);

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

  const closeDeleteConfirmDialog = () => {
    setVipNumberToDelete(null);
  };

  const handleDeleteVipNumber = async () => {
    if (!vipNumberToDelete || !vipNumberToDelete.id) return;
    setIsDeleting(true);
    try {
      await deleteDoc(doc(db, 'vipNumbers', vipNumberToDelete.id));
      toast({
        title: 'VIP Number Deleted',
        description: `VIP Number "${vipNumberToDelete.number}" has been successfully deleted.`,
      });
      if (vipNumbersOnPage.length === 1 && currentPageIndex > 0) {
        setCurrentPageIndex(prev => prev -1);
      } else {
        loadVipNumbers(currentPageIndex, { isRefresh: true });
      }
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
    loadVipNumbers(currentPageIndex, { isRefresh: true });
  }, [loadVipNumbers, currentPageIndex]);

  const handleRefresh = useCallback(() => {
    if (currentPageIndex === 0) {
        loadVipNumbers(0, { isRefresh: true });
    } else {
        setCurrentPageIndex(0); // This will trigger useEffect to load page 0
    }
  }, [loadVipNumbers, currentPageIndex]);

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
    <Card className="shadow-lg">
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <CardTitle>VIP Numbers List</CardTitle>
            <CardDescription>Browse and manage individual VIP mobile numbers. An index on 'createdAt' (desc) might be required.</CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Button onClick={handleRefresh} variant="outline" size="icon" disabled={isLoading}>
              <RefreshCcw className="h-4 w-4" />
              <span className="sr-only">Refresh</span>
            </Button>
            <Button onClick={handleAddNewVipNumber} className="bg-primary hover:bg-primary/90" disabled={isLoading}>
              <PlusCircle className="mr-2 h-4 w-4" /> Add New VIP Number
            </Button>
          </div>
        </div>
        <div className="mt-4 relative">
          <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search by number on current page..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 w-full md:w-1/2 lg:w-1/3"
            disabled={isLoading && (vipNumbersOnPage || []).length === 0}
          />
        </div>
      </CardHeader>
      <CardContent className="p-0 min-h-[300px]">
        {isLoading ? (
          <div className="p-6 space-y-2">
            {[...Array(5)].map((_, i) => (
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
        ) : !isLoading && (filteredVipNumbers || []).length === 0 ? (
          <div className="flex flex-col items-center justify-center text-center p-10 min-h-[300px]">
            <PackageSearch className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-xl font-semibold">
              {searchTerm ? 'No VIP Numbers Match Your Search' : 
               (vipNumbersOnPage || []).length === 0 ? 'No VIP Numbers Found' : 'No VIP Numbers Match Your Search'}
            </h3>
            <p className="text-muted-foreground">
              {searchTerm ? 'Try a different search term or clear search.' : 
               (vipNumbersOnPage || []).length === 0 ? 'Add your first VIP number to see it listed here.' : 'Adjust your search or add more VIP numbers.'}
            </p>
            {!searchTerm && (vipNumbersOnPage || []).length === 0 && ( 
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
              {(filteredVipNumbers || []).map((product) => (
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
                        <Button variant="ghost" className="h-8 w-8 p-0">
                          <span className="sr-only">Open menu</span>
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleEditVipNumber(product)}>
                          <Edit className="mr-2 h-4 w-4" /> Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => openDeleteConfirmDialog(product)}
                          className="text-destructive focus:text-destructive focus:bg-destructive/10"
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
      </CardContent>

      {(vipNumbersOnPage || []).length > 0 && (
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

      {isDialogOpen && (
        <VipNumberDialog
          isOpen={isDialogOpen}
          onClose={() => {
            setIsDialogOpen(false);
            setEditingVipNumber(null);
          }}
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
    