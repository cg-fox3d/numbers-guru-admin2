
'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { PageHeader } from '@/components/common/PageHeader';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { MoreHorizontal, Edit, Trash2, PlusCircle, FolderKanban, PackageSearch, Search as SearchIcon, RefreshCcw } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { db } from '@/lib/firebase';
import { collection, query, orderBy, Timestamp, doc, deleteDoc, getDocs, limit, startAfter, QueryDocumentSnapshot, DocumentData, endBefore } from 'firebase/firestore';
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
  const [allCategories, setAllCategories] = useState<Category[]>([]);
  const [filteredCategories, setFilteredCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [lastVisibleDoc, setLastVisibleDoc] = useState<QueryDocumentSnapshot<DocumentData> | null>(null);
  const [hasMore, setHasMore] = useState(true);
  
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [categoryToDelete, setCategoryToDelete] = useState<Category | null>(null);
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState('');

  const observerRef = useRef<IntersectionObserver | null>(null);
  const loadMoreRef = useRef<HTMLDivElement | null>(null);

  const buildBaseQuery = useCallback(() => {
    return query(
      collection(db, 'categories'),
      orderBy('order', 'asc'),
      orderBy('createdAt', 'desc')
    );
  }, []);

  const fetchCategories = useCallback(async (cursor: QueryDocumentSnapshot<DocumentData> | null = null, isRefresh = false) => {
    if (isLoading && !isRefresh) return;

    setIsLoading(true);
    if (isRefresh) {
      setIsInitialLoading(true);
      setSearchTerm(''); // Clear search on refresh
    }

    try {
      let categoriesQuery = buildBaseQuery();
      if (cursor) {
        categoriesQuery = query(categoriesQuery, startAfter(cursor), limit(PAGE_SIZE));
      } else { // Initial load or refresh
        categoriesQuery = query(categoriesQuery, limit(PAGE_SIZE));
      }
      
      const documentSnapshots = await getDocs(categoriesQuery);
      const fetchedCategories: Category[] = [];
      documentSnapshots.docs.forEach((docSn) => {
        fetchedCategories.push({ id: docSn.id, ...docSn.data() } as Category);
      });
      
      if (isRefresh) {
        setAllCategories(fetchedCategories);
      } else {
        setAllCategories(prevCategories => [...prevCategories, ...fetchedCategories]);
      }
      
      const newLastVisibleDoc = documentSnapshots.docs.length > 0 ? documentSnapshots.docs[documentSnapshots.docs.length - 1] : null;
      setLastVisibleDoc(newLastVisibleDoc);
      setHasMore(documentSnapshots.docs.length === PAGE_SIZE);

    } catch (error) {
      console.error("Error fetching categories: ", error);
      toast({
        title: 'Error Fetching Categories',
        description: (error as Error).message || 'Could not load categories. A Firestore index on \'categories\' for \'order\' (ASC) then \'createdAt\' (DESC) may be required.',
        variant: 'destructive',
      });
      setHasMore(false); // Stop further loading attempts on error
    } finally {
      setIsLoading(false);
      if (isRefresh) setIsInitialLoading(false);
    }
  }, [isLoading, buildBaseQuery, toast, setIsLoading, setIsInitialLoading, setAllCategories, setLastVisibleDoc, setHasMore, setSearchTerm]); 

  // Initial data fetch
  useEffect(() => {
    fetchCategories(null, true);
  }, [fetchCategories]);

  // Client-side search filtering
  useEffect(() => {
    if (searchTerm === '') {
      setFilteredCategories(allCategories);
    } else {
      const lowercasedFilter = searchTerm.toLowerCase();
      const filteredData = allCategories.filter(category =>
        category.title.toLowerCase().includes(lowercasedFilter) ||
        category.slug.toLowerCase().includes(lowercasedFilter)
      );
      setFilteredCategories(filteredData);
    }
  }, [searchTerm, allCategories]);

  // Intersection Observer for infinite scroll
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
          fetchCategories(lastVisibleDoc, false);
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
  }, [isLoading, hasMore, lastVisibleDoc, fetchCategories]);
  
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

  const handleDialogClose = useCallback(() => {
    setIsDialogOpen(false);
    setEditingCategory(null);
  }, []);
  
  const closeDeleteConfirmDialog = useCallback(() => {
    setCategoryToDelete(null);
  }, []);

  const handleDeleteCategory = async () => {
    if (!categoryToDelete || !categoryToDelete.id) return;
    setIsDeleting(true);
    try {
      await deleteDoc(doc(db, 'categories', categoryToDelete.id));
      toast({
        title: 'Category Deleted',
        description: `Category "${categoryToDelete.title}" has been successfully deleted.`,
      });
      fetchCategories(null, true); // Refresh all data from the beginning
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
    fetchCategories(null, true); // Refresh all data from the beginning
  }, [fetchCategories]);

  const handleRefresh = useCallback(() => {
    fetchCategories(null, true);
  }, [fetchCategories]);

  const displayCategories = searchTerm ? filteredCategories : allCategories;

  return (
    <>
      <PageHeader
        title="Categories Management"
        description="Manage product categories for your shop."
        actions={
          <div className="flex items-center gap-2">
            <Button onClick={handleRefresh} variant="outline" size="icon" disabled={isLoading || isInitialLoading}>
              <RefreshCcw className="h-4 w-4" />
              <span className="sr-only">Refresh</span>
            </Button>
            <Button onClick={handleAddNewCategory} className="bg-primary hover:bg-primary/90" disabled={isLoading || isInitialLoading}>
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
          disabled={isInitialLoading && allCategories.length === 0}
        />
      </div>
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FolderKanban className="h-6 w-6 text-primary" />
            <span>Categories List</span>
          </CardTitle>
          <CardDescription>
            View, add, edit, and delete categories. Scroll to load more.
            A Firestore index on 'categories' for 'order' (ASC) then 'createdAt' (DESC) is required.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
            <ScrollArea className="h-[60vh]"> {/* Ensure height is set for ScrollArea */}
              {isInitialLoading && allCategories.length === 0 ? (
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
              ) : displayCategories.length === 0 ? (
                <div className="flex flex-col items-center justify-center text-center p-10 min-h-[300px]">
                  <PackageSearch className="h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-xl font-semibold">
                    {searchTerm ? 'No Categories Match Your Search' : 'No Categories Found'}
                  </h3>
                  <p className="text-muted-foreground">
                    {searchTerm ? 'Try a different search term or clear search.' : 'Create your first category to see it listed here.'}
                  </p>
                  {!searchTerm && (
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
                    {displayCategories.map((category) => (
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
              <div ref={loadMoreRef} className="h-10 flex items-center justify-center">
                {isLoading && !isInitialLoading && <p className="text-muted-foreground">Loading more categories...</p>}
                {!isLoading && !hasMore && displayCategories.length > 0 && <p className="text-muted-foreground">No more categories to load.</p>}
              </div>
            </ScrollArea>
        </CardContent>
      </Card>

      {isDialogOpen && (
        <CategoryDialog
          isOpen={isDialogOpen}
          onClose={handleDialogClose}
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
    
