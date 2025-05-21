
'use client';

import { useEffect, useState, useCallback } from 'react';
import { PageHeader } from '@/components/common/PageHeader';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { MoreHorizontal, Edit, Trash2, PlusCircle, FolderKanban, PackageSearch, RefreshCcw, ChevronLeft, ChevronRight, Search as SearchIcon } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { db } from '@/lib/firebase';
import { collection, query, orderBy, Timestamp, doc, deleteDoc, getDocs, limit, startAfter, DocumentSnapshot, QueryDocumentSnapshot } from 'firebase/firestore';
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
  const [categoriesOnPage, setCategoriesOnPage] = useState<Category[]>([]); // Unfiltered data for the current page
  const [filteredCategories, setFilteredCategories] = useState<Category[]>([]); // Data to render (after search)
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [categoryToDelete, setCategoryToDelete] = useState<Category | null>(null);
  const { toast } = useToast();

  const [searchTerm, setSearchTerm] = useState('');

  // Pagination state
  const [currentPageIndex, setCurrentPageIndex] = useState(0); // 0-based
  const [pageCursors, setPageCursors] = useState<(QueryDocumentSnapshot<Category> | null)[]>([null]); // null for the first page query
  const [hasNextPage, setHasNextPage] = useState(false);

  const buildQuery = (cursor?: QueryDocumentSnapshot<Category> | null) => {
    let q = query(
      collection(db, 'categories'),
      orderBy('order', 'asc'),
      orderBy('createdAt', 'desc')
    );
    if (cursor) {
      q = query(q, startAfter(cursor));
    }
    return query(q, limit(PAGE_SIZE + 1)); // Fetch one extra to check for hasNextPage
  };

  const loadCategories = useCallback(async (pageIdx: number, direction?: 'next' | 'prev' | 'refresh') => {
    setIsLoading(true);
    const cursor = direction === 'refresh' ? null : pageCursors[pageIdx];
    
    try {
      const categoriesQuery = buildQuery(cursor || undefined); // Pass undefined if cursor is null
      const documentSnapshots = await getDocs(categoriesQuery);
      
      const fetchedCategories: Category[] = [];
      documentSnapshots.docs.slice(0, PAGE_SIZE).forEach((docSn) => {
        fetchedCategories.push({ id: docSn.id, ...docSn.data() } as Category);
      });
      
      setCategoriesOnPage(fetchedCategories);
      
      const newHasNextPage = documentSnapshots.docs.length > PAGE_SIZE;
      setHasNextPage(newHasNextPage);

      if (direction === 'next' && newHasNextPage) {
        const lastDocOnPage = documentSnapshots.docs[PAGE_SIZE - 1] as QueryDocumentSnapshot<Category>;
        setPageCursors(prevCursors => {
          const newCursors = [...prevCursors];
          newCursors[pageIdx + 1] = lastDocOnPage;
          return newCursors;
        });
      }
      if (direction === 'refresh') {
        setPageCursors([null]); // Reset cursors
        if (newHasNextPage) {
           const lastDocOnPage = documentSnapshots.docs[PAGE_SIZE-1] as QueryDocumentSnapshot<Category>;
           setPageCursors(prev => {
             const newCursors = [...prev];
             newCursors[1] = lastDocOnPage;
             return newCursors;
           });
        }
      }

    } catch (error) {
      console.error("Error fetching categories: ", error);
      toast({
        title: 'Error Fetching Categories',
        description: (error as Error).message || 'Could not load categories.',
        variant: 'destructive',
      });
      setHasNextPage(false);
    } finally {
      setIsLoading(false);
    }
  }, [toast]); // Removed buildQuery from deps as it's stable

  useEffect(() => {
    loadCategories(currentPageIndex, currentPageIndex === 0 ? 'refresh' : undefined);
  }, [currentPageIndex, loadCategories]);

  // Client-side search effect
  useEffect(() => {
    if (searchTerm === '') {
      setFilteredCategories(categoriesOnPage);
    } else {
      const lowercasedFilter = searchTerm.toLowerCase();
      const filteredData = categoriesOnPage.filter(category =>
        category.title.toLowerCase().includes(lowercasedFilter) ||
        category.slug.toLowerCase().includes(lowercasedFilter)
      );
      setFilteredCategories(filteredData);
    }
  }, [searchTerm, categoriesOnPage]);

  const handleRefresh = () => {
    setSearchTerm('');
    setCurrentPageIndex(0); // This will trigger the useEffect to load page 0 with 'refresh'
    // loadCategories(0, 'refresh'); // Explicit call if useEffect doesn't re-trigger as expected
  };

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
      // Refresh current page data, or if it was the last item on a page, try to go to prev or first.
      // For simplicity, let's try to reload current page index. If it's empty, user can navigate.
      loadCategories(currentPageIndex); 
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
  
  const onDialogSuccess = () => {
    // After add/edit, reload the current page to see changes
    loadCategories(currentPageIndex);
  };


  return (
    <>
      <PageHeader
        title="Categories Management"
        description="Manage product categories for your shop."
        actions={
          <div className="flex items-center gap-2">
            <Button onClick={handleRefresh} variant="outline" size="icon" aria-label="Refresh categories">
              <RefreshCcw className="h-4 w-4" />
            </Button>
            <Button onClick={handleAddNewCategory} className="bg-primary hover:bg-primary/90">
              <PlusCircle className="mr-2 h-4 w-4" /> Add New Category
            </Button>
          </div>
        }
      />
      <div className="mb-4 relative">
        <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
        <Input
          type="search"
          placeholder="Search by title or slug..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10 w-full md:w-1/2 lg:w-1/3"
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
        <CardContent className="p-0">
          {isLoading && filteredCategories.length === 0 ? (
            <div className="p-6 space-y-2">
              {[...Array(PAGE_SIZE / 2)].map((_, i) => ( // Show fewer skeletons
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
          ) : !isLoading && filteredCategories.length === 0 ? (
            <div className="flex flex-col items-center justify-center text-center p-10">
              <PackageSearch className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-xl font-semibold">
                {searchTerm ? 'No Categories Match Your Search' : 'No Categories Found'}
              </h3>
              <p className="text-muted-foreground">
                {searchTerm ? 'Try a different search term or clear search.' : 'Create your first category to see it listed here.'}
              </p>
              {!searchTerm && categoriesOnPage.length === 0 && ( // Show if no categories at all and no search
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
                {filteredCategories.map((category) => (
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
        {categoriesOnPage.length > 0 && (
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
