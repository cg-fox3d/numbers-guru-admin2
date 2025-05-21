
'use client';

import { useEffect, useState, useCallback } from 'react';
import { PageHeader } from '@/components/common/PageHeader';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { MoreHorizontal, Edit, Trash2, PlusCircle, FolderKanban, PackageSearch, Search as SearchIcon, RefreshCcw, ChevronLeft, ChevronRight } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { db } from '@/lib/firebase';
import { collection, query, orderBy, Timestamp, doc, deleteDoc, getDocs, limit, startAfter, QueryDocumentSnapshot, DocumentData, endBefore, limitToLast } from 'firebase/firestore';
import type { Category } from '@/types';
import { format } from 'date-fns';
import { CategoryDialog } from '@/components/categories/CategoryDialog';
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

const PAGE_SIZE = 10;

export default function CategoriesPage() {
  const [categoriesOnPage, setCategoriesOnPage] = useState<Category[]>([]);
  const [filteredCategories, setFilteredCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [categoryToDelete, setCategoryToDelete] = useState<Category | null>(null);
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState('');

  const [currentPageIndex, setCurrentPageIndex] = useState(0);
  // pageStartCursors[i] stores the first document of page i.
  // pageStartCursors[0] is null for the very first fetch.
  const [pageStartCursors, setPageStartCursors] = useState<(QueryDocumentSnapshot<DocumentData> | null)[]>([null]);
  const [lastVisibleDoc, setLastVisibleDoc] = useState<QueryDocumentSnapshot<DocumentData> | null>(null);
  const [firstVisibleDoc, setFirstVisibleDoc] = useState<QueryDocumentSnapshot<DocumentData> | null>(null);
  const [hasNextPage, setHasNextPage] = useState(false);


  const buildPageQuery = useCallback((cursor: QueryDocumentSnapshot<DocumentData> | null, direction: 'next' | 'prev' | 'current' = 'next') => {
    let q = query(
      collection(db, 'categories'),
      orderBy('order', 'asc'),
      orderBy('createdAt', 'desc')
    );

    if (cursor) {
      if (direction === 'next') {
        q = query(q, startAfter(cursor), limit(PAGE_SIZE + 1));
      } else if (direction === 'prev') {
        // Firestore doesn't directly support "previous page" with multiple orderBys and endBefore well.
        // A common strategy is to reverse the query order, use endBefore, limit, then reverse results.
        // For simplicity here, we are re-fetching from a known start cursor of the previous page.
        // If cursor is not null (meaning not the first page), we use it for startAfter.
        // This logic is handled in loadCategories' pageIdxToLoad.
        // The cursor passed here for 'prev' would be the start of the *target* previous page.
         q = query(q, startAfter(cursor), limit(PAGE_SIZE + 1));
      }
    } else {
       // First page or refresh
       q = query(q, limit(PAGE_SIZE + 1));
    }
    return q;
  }, []);


  const loadCategories = useCallback(async (pageIdxToLoad: number, options: { isRefresh?: boolean } = {}) => {
    setIsLoading(true);
    setSearchTerm(''); // Reset search on page load/refresh

    try {
      let queryCursor: QueryDocumentSnapshot<DocumentData> | null = null;
      
      if (options.isRefresh || pageIdxToLoad === 0) {
        setPageStartCursors([null]); // Reset cursors for refresh or first page
        queryCursor = null;
      } else if (pageIdxToLoad > 0 && pageIdxToLoad < pageStartCursors.length) {
        queryCursor = pageStartCursors[pageIdxToLoad];
      } else if (pageIdxToLoad > 0 && lastVisibleDoc && pageIdxToLoad === pageStartCursors.length) { 
        // Trying to go to a new next page
        queryCursor = lastVisibleDoc;
      }


      const categoriesQuery = buildPageQuery(queryCursor);
      const documentSnapshots = await getDocs(categoriesQuery);
      
      const fetchedCategories: Category[] = [];
      documentSnapshots.docs.slice(0, PAGE_SIZE).forEach((docSn) => {
        fetchedCategories.push({ id: docSn.id, ...docSn.data() } as Category);
      });
      
      setCategoriesOnPage(fetchedCategories);
      
      const newFirstVisibleDoc = documentSnapshots.docs.length > 0 ? documentSnapshots.docs[0] : null;
      setFirstVisibleDoc(newFirstVisibleDoc);

      const newLastVisibleDoc = documentSnapshots.docs.length > PAGE_SIZE 
        ? documentSnapshots.docs[PAGE_SIZE - 1] 
        : (documentSnapshots.docs.length > 0 ? documentSnapshots.docs[documentSnapshots.docs.length - 1] : null);
      setLastVisibleDoc(newLastVisibleDoc);
      
      const newHasNextPage = documentSnapshots.docs.length > PAGE_SIZE;
      setHasNextPage(newHasNextPage);

      if (pageIdxToLoad >= pageStartCursors.length && newFirstVisibleDoc) {
        // Add the first doc of the new page as the cursor for this page
        setPageStartCursors(prev => [...prev, newFirstVisibleDoc]);
      } else if (options.isRefresh || pageIdxToLoad === 0) {
        setPageStartCursors([null, newFirstVisibleDoc].filter(c => c !== undefined) as (QueryDocumentSnapshot<DocumentData> | null)[]);
      }


    } catch (error) {
      console.error("Error fetching categories: ", error);
      toast({
        title: 'Error Fetching Categories',
        description: (error as Error).message || 'Could not load categories. A Firestore index on \'categories\' for \'order\' (ASC) then \'createdAt\' (DESC) may be required.',
        variant: 'destructive',
      });
      setCategoriesOnPage([]);
      setHasNextPage(false);
    } finally {
      setIsLoading(false);
    }
  }, [toast, buildPageQuery]); // pageStartCursors removed to break potential loops

  useEffect(() => {
    loadCategories(currentPageIndex);
  }, [currentPageIndex, loadCategories]); // loadCategories is memoized

  useEffect(() => {
    if (searchTerm === '') {
      setFilteredCategories(categoriesOnPage);
    } else {
      const lowercasedFilter = searchTerm.toLowerCase();
      // Client-side search on the current page's data
      const filteredData = (categoriesOnPage || []).filter(category =>
        category.title.toLowerCase().includes(lowercasedFilter) ||
        category.slug.toLowerCase().includes(lowercasedFilter)
      );
      setFilteredCategories(filteredData);
    }
  }, [searchTerm, categoriesOnPage]);
  
  const handleAddNewCategory = () => {
    setEditingCategory(null);
    setIsDialogOpen(true);
  };

  const handleEditCategory = (category: Category) => {
    setEditingCategory(category);
    setIsDialogOpen(true);
  };

  const openDeleteConfirmDialog = (category: Category) => {
    setCategoryToDelete(category);
  };

  const closeDeleteConfirmDialog = () => {
    setCategoryToDelete(null);
  };

  const handleDeleteCategory = async () => {
    if (!categoryToDelete || !categoryToDelete.id) return;
    setIsDeleting(true);
    try {
      await deleteDoc(doc(db, 'categories', categoryToDelete.id));
      toast({
        title: 'Category Deleted',
        description: `Category "${categoryToDelete.title}" has been successfully deleted.`,
      });
      // Check if the current page might become empty after delete
      if (categoriesOnPage.length === 1 && currentPageIndex > 0) {
        setCurrentPageIndex(prev => prev -1); // Go to previous page
      } else {
        loadCategories(currentPageIndex, {isRefresh: true}); // Refresh current page
      }
    } catch (error) {
      console.error("Error deleting category: ", error);
      toast({
        title: 'Deletion Failed',
        description: (error as Error).message || 'Could not delete the category.',
        variant: 'destructive',
      });
    } finally {
      setIsDeleting(false);
      closeDeleteConfirmDialog();
    }
  };
  
  const onDialogSuccess = useCallback(() => {
    // Refresh current page data after add/edit
    loadCategories(currentPageIndex, {isRefresh: true}); 
  }, [loadCategories, currentPageIndex]);

  const handleRefresh = useCallback(() => {
    if (currentPageIndex === 0) {
        loadCategories(0, { isRefresh: true });
    } else {
        setCurrentPageIndex(0); // This will trigger useEffect to load page 0
    }
  }, [loadCategories, currentPageIndex]);

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
    <>
      <PageHeader
        title="Categories Management"
        description="Manage product categories for your shop."
        actions={
          <div className="flex items-center gap-2">
            <Button onClick={handleRefresh} variant="outline" size="icon" disabled={isLoading}>
              <RefreshCcw className="h-4 w-4" />
              <span className="sr-only">Refresh</span>
            </Button>
            <Button onClick={handleAddNewCategory} className="bg-primary hover:bg-primary/90" disabled={isLoading}>
              <PlusCircle className="mr-2 h-4 w-4" /> Add New Category
            </Button>
          </div>
        }
      />
      <div className="mb-4 relative">
        <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
        <Input
          type="search"
          placeholder="Search by title or slug on current page..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10 w-full md:w-1/2 lg:w-1/3"
          disabled={isLoading && (categoriesOnPage || []).length === 0}
        />
      </div>
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FolderKanban className="h-6 w-6 text-primary" />
            <span>Categories List</span>
          </CardTitle>
          <CardDescription>
            View, add, edit, and delete categories.
            A Firestore index on 'categories' for 'order' (ASC) then 'createdAt' (DESC) is required.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0 min-h-[300px]"> {/* Added min-h for consistent loading view */}
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
          ) : !isLoading && (filteredCategories || []).length === 0 ? (
            <div className="flex flex-col items-center justify-center text-center p-10 min-h-[300px]">
              <PackageSearch className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-xl font-semibold">
                {searchTerm ? 'No Categories Match Your Search' : 
                 (categoriesOnPage || []).length === 0 ? 'No Categories Found' : 'No Categories Match Your Search'}
              </h3>
              <p className="text-muted-foreground">
                {searchTerm ? 'Try a different search term or clear search.' : 
                 (categoriesOnPage || []).length === 0 ? 'Create your first category to see it listed here.' : 'Adjust your search or add more categories.'}
              </p>
              {!searchTerm && (categoriesOnPage || []).length === 0 && ( 
                <Button onClick={handleAddNewCategory} className="mt-4 bg-primary hover:bg-primary/90">
                  <PlusCircle className="mr-2 h-4 w-4" /> Add First Category
                </Button>
              )}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Slug</TableHead>
                  <TableHead>Order</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Created At</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(filteredCategories || []).map((category) => (
                  <TableRow key={category.id}>
                    <TableCell className="font-medium">{category.title}</TableCell>
                    <TableCell>{category.slug}</TableCell>
                    <TableCell>{category.order}</TableCell>
                    <TableCell>
                      <Badge variant={category.type === 'individual' ? 'default' : 'secondary'} className="capitalize">
                        {category.type}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {category.createdAt instanceof Timestamp
                        ? format(category.createdAt.toDate(), 'PPp')
                        : typeof category.createdAt === 'string'
                          ? category.createdAt
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
                          <DropdownMenuItem onClick={() => handleEditCategory(category)}>
                            <Edit className="mr-2 h-4 w-4" /> Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => openDeleteConfirmDialog(category)} className="text-destructive focus:text-destructive focus:bg-destructive/10">
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
        { (categoriesOnPage || []).length > 0 && (
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

      {isDialogOpen && (
        <CategoryDialog
          isOpen={isDialogOpen}
          onClose={() => {
            setIsDialogOpen(false);
            setEditingCategory(null);
          }}
          category={editingCategory}
          onSuccess={onDialogSuccess}
        />
      )}

      {categoryToDelete && (
        <AlertDialog open={!!categoryToDelete} onOpenChange={(open) => !open && closeDeleteConfirmDialog()}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
              <AlertDialogDescription>
                This action cannot be undone. This will permanently delete the category
                "{categoryToDelete.title}". Make sure no products are using this category.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={closeDeleteConfirmDialog} disabled={isDeleting}>
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction onClick={handleDeleteCategory} disabled={isDeleting} className="bg-destructive hover:bg-destructive/90">
                {isDeleting ? "Deleting..." : "Yes, delete category"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </>
  );
}
    