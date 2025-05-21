
'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { db } from '@/lib/firebase';
import { collection, query, orderBy, Timestamp, doc, deleteDoc, getDocs, limit, startAfter, QueryDocumentSnapshot, endBefore, limitToLast } from 'firebase/firestore';
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
  const [numberPacksOnPage, setNumberPacksOnPage] = useState<NumberPack[]>([]);
  const [filteredNumberPacks, setFilteredNumberPacks] = useState<NumberPack[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingNumberPack, setEditingNumberPack] = useState<NumberPack | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [packToDelete, setPackToDelete] = useState<NumberPack | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const { toast } = useToast();

  const [currentPageIndex, setCurrentPageIndex] = useState(0);
  const [pageCursors, setPageCursors] = useState<(QueryDocumentSnapshot<NumberPack> | null)[]>([null]);
  const pageCursorsRef = useRef(pageCursors); // Ref to hold current pageCursors
  const [hasNextPage, setHasNextPage] = useState(false);
  const [lastFetchedDoc, setLastFetchedDoc] = useState<QueryDocumentSnapshot<NumberPack> | null>(null);

  useEffect(() => {
    pageCursorsRef.current = pageCursors;
  }, [pageCursors]);

  const buildPageQuery = useCallback((cursor?: QueryDocumentSnapshot<NumberPack> | null) => {
    let q = query(collection(db, 'numberPacks'), orderBy('createdAt', 'desc'));
    if (cursor) {
      q = query(q, startAfter(cursor));
    }
    return query(q, limit(PAGE_SIZE + 1));
  }, []);

  const loadNumberPacks = useCallback(async (pageIdxToLoad: number, options?: { isRefresh?: boolean }) => {
    setIsLoading(true);
    const isActualRefresh = options?.isRefresh || (pageIdxToLoad === 0 && pageCursorsRef.current.length <= 1 && pageCursorsRef.current[0] === null);
    
    let queryCursor: QueryDocumentSnapshot<NumberPack> | null = null;
    let effectivePageIdx = pageIdxToLoad;

    if (isActualRefresh) {
      effectivePageIdx = 0;
      setSearchTerm('');
      setPageCursors([null]); // This will trigger the ref update
      setLastFetchedDoc(null);
      if (currentPageIndex !== 0 && pageIdxToLoad === 0) { // Avoid immediate re-render if already on page 0
         // setCurrentPageIndex(0) is handled by handleRefresh if needed
      } else if (currentPageIndex !== 0) {
        setCurrentPageIndex(0); // This will trigger the useEffect for loading
        setIsLoading(false); // Prevent loading state flicker if already handled
        return;
      }
    } else {
      queryCursor = pageCursorsRef.current[effectivePageIdx] || null;
    }

    try {
      const numberPacksQuery = buildPageQuery(queryCursor);
      const documentSnapshots = await getDocs(numberPacksQuery);
      const packs: NumberPack[] = [];
      documentSnapshots.docs.slice(0, PAGE_SIZE).forEach((docSn) => {
        packs.push({ id: docSn.id, ...docSn.data() } as NumberPack);
      });
      setNumberPacksOnPage(packs);
      
      const newHasNextPage = documentSnapshots.docs.length > PAGE_SIZE;
      setHasNextPage(newHasNextPage);

      if (newHasNextPage) {
        const lastDocOnThisPage = documentSnapshots.docs[PAGE_SIZE - 1] as QueryDocumentSnapshot<NumberPack>;
        setLastFetchedDoc(lastDocOnThisPage);
      } else {
        setLastFetchedDoc(null);
      }
    } catch (error) {
      console.error("Error fetching number packs: ", error);
      setNumberPacksOnPage([]);
      toast({
        title: 'Error Fetching Number Packs',
        description: (error as Error).message || 'Could not load number packs. An index on \'createdAt\' (desc) might be required.',
        variant: 'destructive',
      });
       setHasNextPage(false);
    } finally {
      setIsLoading(false);
    }
  }, [toast, buildPageQuery, currentPageIndex, setIsLoading, setNumberPacksOnPage, setHasNextPage, setLastFetchedDoc, setSearchTerm, setPageCursors]);


  useEffect(() => {
    const isRefreshForEffect = currentPageIndex === 0 && (pageCursorsRef.current.length <=1 && pageCursorsRef.current[0] === null) && !searchTerm;
    loadNumberPacks(currentPageIndex, { isRefresh: isRefreshForEffect });
  }, [currentPageIndex, loadNumberPacks, searchTerm]);


  useEffect(() => {
    const lowercasedFilter = searchTerm.toLowerCase();
     if (searchTerm === '') {
        setFilteredNumberPacks(numberPacksOnPage);
    } else {
        const filteredData = numberPacksOnPage.filter(item =>
        item.name.toLowerCase().includes(lowercasedFilter)
        );
        setFilteredNumberPacks(filteredData);
    }
  }, [searchTerm, numberPacksOnPage]);

  const handleRefresh = useCallback(() => {
    if (currentPageIndex === 0) {
      loadNumberPacks(0, { isRefresh: true });
    } else {
      setCurrentPageIndex(0); // This will trigger the useEffect which calls loadNumberPacks with refresh intent
    }
  }, [currentPageIndex, loadNumberPacks]);

  const handleNextPage = () => {
    if (hasNextPage && lastFetchedDoc) {
      setPageCursors(prev => {
        const newCursors = [...prev];
        newCursors[currentPageIndex + 1] = lastFetchedDoc; 
        return newCursors;
      });
      setCurrentPageIndex(prev => prev + 1);
    }
  };

  const handlePrevPage = () => {
    if (currentPageIndex > 0) {
      setCurrentPageIndex(prev => prev - 1);
    }
  };

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
      const isCurrentPageBecomingEmpty = filteredNumberPacks.length === 1 && numberPacksOnPage.length === 1;
      if (currentPageIndex === 0 || isCurrentPageBecomingEmpty) {
        loadNumberPacks(0, {isRefresh: true});
      } else if (isCurrentPageBecomingEmpty && currentPageIndex > 0) {
        setCurrentPageIndex(prev => prev -1); // Go to previous page
      }
      else {
        loadNumberPacks(currentPageIndex, {isRefresh: false}); // Refresh current page
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
    const isRefresh = currentPageIndex === 0;
    loadNumberPacks(currentPageIndex, { isRefresh });
  }, [currentPageIndex, loadNumberPacks]);
  
  return (
    <Card className="shadow-lg">
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
                <CardTitle>Number Packs List</CardTitle>
                <CardDescription>Browse and manage number pack bundles. An index on 'numberPacks' for 'createdAt' (desc) might be required.</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button onClick={handleRefresh} variant="outline" size="icon" aria-label="Refresh Number Packs" disabled={isLoading}>
                <RefreshCcw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
              </Button>
              <Button onClick={handleAddNewPack} className="bg-primary hover:bg-primary/90">
                  <PlusCircle className="mr-2 h-4 w-4" /> Add New Pack
              </Button>
            </div>
        </div>
        <div className="mt-4 relative">
          <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search by pack name..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 w-full md:w-1/2 lg:w-1/3"
            disabled={isLoading && numberPacksOnPage.length === 0}
          />
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {isLoading && filteredNumberPacks.length === 0 ? (
             <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Pack Name</TableHead>
                    <TableHead>Items</TableHead>
                    <TableHead>Price (₹)</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead className="hidden lg:table-cell">Created At</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {[...Array(Math.min(PAGE_SIZE, 3))].map((_, i) => (
                    <TableRow key={`skeleton-${i}`}>
                      <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                      <TableCell><Skeleton className="h-5 w-12" /></TableCell>
                      <TableCell><Skeleton className="h-5 w-20" /></TableCell>
                      <TableCell><Skeleton className="h-6 w-20 rounded-full" /></TableCell>
                      <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                      <TableCell className="hidden lg:table-cell"><Skeleton className="h-5 w-28" /></TableCell>
                      <TableCell className="text-right"><Skeleton className="h-8 w-8 ml-auto" /></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
             </Table>
        ): !isLoading && filteredNumberPacks.length === 0 ? (
          <div className="flex flex-col items-center justify-center text-center p-10">
            <PackageSearch className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-xl font-semibold">
              {searchTerm ? 'No Number Packs Match Your Search' : 'No Number Packs Found'}
            </h3>
            <p className="text-muted-foreground">
              {searchTerm ? 'Try a different search term.' : 'Create your first number pack to see it listed here.'}
            </p>
            {!searchTerm && numberPacksOnPage.length === 0 && ( 
                <Button onClick={handleAddNewPack} className="mt-4 bg-primary hover:bg-primary/90">
                  <PlusCircle className="mr-2 h-4 w-4" /> Add First Number Pack
                </Button>
              )}
          </div>
        ) : null}
        
        {!isLoading && filteredNumberPacks.length > 0 && (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Pack Name</TableHead>
                  <TableHead>Items</TableHead>
                  <TableHead>Pack Price (₹)</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead className="hidden lg:table-cell max-w-xs truncate">Description</TableHead>
                  <TableHead className="hidden lg:table-cell">Created At</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredNumberPacks.map((pack) => (
                  <TableRow key={pack.id}>
                    <TableCell className="font-medium">{pack.name}</TableCell>
                    <TableCell>{pack.numbers?.length || 0}</TableCell>
                    <TableCell>{pack.packPrice.toLocaleString()}</TableCell>
                    <TableCell>
                      <Badge 
                        variant={pack.status === 'available' ? 'default' : 'destructive'}
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
          )
        }
      </CardContent>
      {(numberPacksOnPage.length > 0 || hasNextPage || currentPageIndex > 0) && !isLoading && (
        <CardFooter className="flex items-center justify-between p-4 border-t">
            <span className="text-sm text-muted-foreground">
                Page {currentPageIndex + 1}
            </span>
            <div className="flex items-center gap-2">
                <Button
                variant="outline"
                size="sm"
                onClick={handlePrevPage}
                disabled={currentPageIndex === 0 || isLoading}
                >
                <ChevronLeft className="mr-1 h-4 w-4" />
                Previous
                </Button>
                <Button
                variant="outline"
                size="sm"
                onClick={handleNextPage}
                disabled={!hasNextPage || isLoading}
                >
                Next
                <ChevronRight className="ml-1 h-4 w-4" />
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
