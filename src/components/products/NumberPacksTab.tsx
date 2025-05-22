
'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { db } from '@/lib/firebase';
import { collection, query, orderBy, Timestamp, doc, deleteDoc, getDocs, limit, startAfter, QueryDocumentSnapshot, DocumentData } from 'firebase/firestore';
import type { NumberPack } from '@/types';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { MoreHorizontal, Edit, Trash2, PackageSearch, PlusCircle, Search as SearchIcon, RefreshCcw, ChevronLeft, ChevronRight } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
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

interface NumberPacksTabProps {
  categoryMap: Record<string, string>;
}

const PAGE_SIZE = 10;

export function NumberPacksTab({ categoryMap }: NumberPacksTabProps) {
  const [allNumberPacks, setAllNumberPacks] = useState<NumberPack[]>([]); // Stores all fetched packs for current view if no pagination
  const [numberPacksOnPage, setNumberPacksOnPage] = useState<NumberPack[]>([]); // Packs for current page
  const [filteredNumberPacks, setFilteredNumberPacks] = useState<NumberPack[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingNumberPack, setEditingNumberPack] = useState<NumberPack | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [packToDelete, setPackToDelete] = useState<NumberPack | null>(null);
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
    let q = query(collection(db, 'numberPacks'), orderBy('createdAt', 'desc'));
    if (cursor) {
      q = query(q, startAfter(cursor), limit(PAGE_SIZE + 1));
    } else {
      q = query(q, limit(PAGE_SIZE + 1));
    }
    return q;
  }, []);

  const loadNumberPacks = useCallback(async (pageIdxToLoad: number, options: { isRefresh?: boolean } = {}) => {
    setIsLoading(true);
    if (options.isRefresh) {
      setSearchTerm('');
    }

    try {
      let queryCursor: QueryDocumentSnapshot<DocumentData> | null = null;
      const currentCursors = pageStartCursorsRef.current; // Read from ref

      if (options.isRefresh || pageIdxToLoad === 0) {
        queryCursor = null;
        if (options.isRefresh) {
          setPageStartCursors([null]);
        }
      } else if (pageIdxToLoad > 0 && pageIdxToLoad < currentCursors.length) {
        queryCursor = currentCursors[pageIdxToLoad];
      } else if (pageIdxToLoad > 0 && lastVisibleDoc && pageIdxToLoad === currentCursors.length) {
        queryCursor = lastVisibleDoc; // Use state variable directly here for "next" logic
      } else {
        console.warn("NumberPacksTab: Attempting to load page without a valid cursor strategy", { pageIdxToLoad, currentCursorsLength: currentCursors.length });
        queryCursor = (pageIdxToLoad > currentCursors.length -1 && lastVisibleDoc) ? lastVisibleDoc : null;
      }

      const packsQuery = buildPageQuery(queryCursor);
      const documentSnapshots = await getDocs(packsQuery);

      const fetchedPacks: NumberPack[] = [];
      documentSnapshots.docs.slice(0, PAGE_SIZE).forEach((docSn) => {
        fetchedPacks.push({ id: docSn.id, ...docSn.data() } as NumberPack);
      });

      setNumberPacksOnPage(fetchedPacks);

      const newFirstVisibleDoc = documentSnapshots.docs.length > 0 ? documentSnapshots.docs[0] : null;
      setFirstVisibleDoc(newFirstVisibleDoc);

      const newLastVisibleDoc = documentSnapshots.docs.length > PAGE_SIZE
        ? documentSnapshots.docs[PAGE_SIZE - 1]
        : (documentSnapshots.docs.length > 0 ? documentSnapshots.docs[documentSnapshots.docs.length -1] : null);
      setLastVisibleDoc(newLastVisibleDoc);

      const newHasNextPage = documentSnapshots.docs.length > PAGE_SIZE;
      setHasNextPage(newHasNextPage);
      
      if (options.isRefresh || pageIdxToLoad === 0) {
        setPageStartCursors(newFirstVisibleDoc ? [null, newFirstVisibleDoc] : [null]);
      } else if (pageIdxToLoad >= currentCursors.length && newFirstVisibleDoc) {
        // Navigated to a new "next" page
        setPageStartCursors(prev => [...prev, newFirstVisibleDoc]);
      }
    } catch (error) {
      console.error("Error fetching number packs: ", error);
      toast({
        title: 'Error Fetching Number Packs',
        description: (error as Error).message || 'Could not load number packs. An index on \'numberPacks\' for \'createdAt\' (desc) might be required.',
        variant: 'destructive',
      });
      setNumberPacksOnPage([]);
      setHasNextPage(false);
    } finally {
      setIsLoading(false);
    }
  }, [
    toast, 
    buildPageQuery, 
    setIsLoading, 
    setNumberPacksOnPage, 
    setHasNextPage, 
    setLastVisibleDoc, 
    setSearchTerm, 
    setPageStartCursors, 
    setFirstVisibleDoc
    // Removed lastVisibleDoc from dependencies to break potential loops
  ]);

  useEffect(() => {
    // Refresh if on page 0, otherwise just load the current page.
    // The `loadNumberPacks` function itself will handle full cursor reset if options.isRefresh is true.
    loadNumberPacks(currentPageIndex, {isRefresh: currentPageIndex === 0 });
  }, [currentPageIndex, loadNumberPacks]);

  useEffect(() => {
    if (searchTerm === '') {
      setFilteredNumberPacks(numberPacksOnPage);
    } else {
      const lowercasedFilter = searchTerm.toLowerCase();
      const filteredData = (numberPacksOnPage || []).filter(item =>
        item.name.toLowerCase().includes(lowercasedFilter)
      );
      setFilteredNumberPacks(filteredData);
    }
  }, [searchTerm, numberPacksOnPage]);

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

  const closeDeleteConfirmDialog = () => {
    setPackToDelete(null);
  };

  const handleDeletePack = async () => {
    if (!packToDelete || !packToDelete.id) return;
    setIsDeleting(true);
    try {
      await deleteDoc(doc(db, 'numberPacks', packToDelete.id));
      toast({
        title: 'Number Pack Deleted',
        description: `Pack "${packToDelete.name}" has been successfully deleted.`,
      });
      const isLastItemOnPage = numberPacksOnPage.length === 1;
      if (isLastItemOnPage && currentPageIndex > 0) {
        setCurrentPageIndex(prev => prev -1); 
      } else {
        loadNumberPacks(isLastItemOnPage && currentPageIndex === 0 ? 0 : currentPageIndex, { isRefresh: true });
      }
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
    loadNumberPacks(currentPageIndex, {isRefresh: true}); 
  }, [loadNumberPacks, currentPageIndex]);
  
  const handleRefresh = useCallback(() => {
    if (currentPageIndex === 0) {
        loadNumberPacks(0, { isRefresh: true });
    } else {
        setCurrentPageIndex(0); 
    }
  }, [loadNumberPacks, currentPageIndex]);

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
            <CardTitle>Number Packs List</CardTitle>
            <CardDescription>Browse and manage number pack bundles. An index on 'numberPacks' for 'createdAt' (desc) might be required.</CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Button onClick={handleRefresh} variant="outline" size="icon" disabled={isLoading}>
              <RefreshCcw className="h-4 w-4" />
              <span className="sr-only">Refresh</span>
            </Button>
            <Button onClick={handleAddNewPack} className="bg-primary hover:bg-primary/90" disabled={isLoading}>
                <PlusCircle className="mr-2 h-4 w-4" /> Add New Pack
            </Button>
          </div>
        </div>
        <div className="mt-4 relative">
          <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search by pack name on current page..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 w-full md:w-1/2 lg:w-1/3"
            disabled={isLoading && (numberPacksOnPage || []).length === 0}
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
        ) : !isLoading && (filteredNumberPacks || []).length === 0 ? (
          <div className="flex flex-col items-center justify-center text-center p-10 min-h-[300px]">
            <PackageSearch className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-xl font-semibold">
              {searchTerm ? 'No Number Packs Match Your Search' : 
               (numberPacksOnPage || []).length === 0 ? 'No Number Packs Found' : 'No Number Packs Match Your Search'}
            </h3>
            <p className="text-muted-foreground">
              {searchTerm ? 'Try a different search term or clear search.' : 
               (numberPacksOnPage || []).length === 0 ? 'Create your first number pack to see it listed here.' : 'Adjust your search or add more packs.'}
            </p>
            {!searchTerm && (numberPacksOnPage || []).length === 0 && ( 
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
              {(filteredNumberPacks || []).map((pack) => (
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
                        <Button variant="ghost" className="h-8 w-8 p-0">
                          <span className="sr-only">Open menu</span>
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleEditPack(pack)}>
                          <Edit className="mr-2 h-4 w-4" /> Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => openDeleteConfirmDialog(pack)} className="text-destructive focus:text-destructive focus:bg-destructive/10">
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

      {(filteredNumberPacks || []).length > 0 && (
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
        <NumberPackDialog
            isOpen={isDialogOpen}
            onClose={() => {
                setIsDialogOpen(false);
                setEditingNumberPack(null);
            }}
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

