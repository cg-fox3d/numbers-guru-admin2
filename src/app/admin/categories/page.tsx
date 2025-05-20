
'use client';

import { useEffect, useState, useCallback } from 'react';
import { PageHeader } from '@/components/common/PageHeader';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { MoreHorizontal, Edit, Trash2, PlusCircle, FolderKanban, PackageSearch } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { db } from '@/lib/firebase';
import { collection, query, orderBy, onSnapshot, Timestamp, doc, deleteDoc } from 'firebase/firestore';
import type { Category, CategoryFormData } from '@/types';
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

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [categoryToDelete, setCategoryToDelete] = useState<Category | null>(null);

  const { toast } = useToast();

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
      // TODO: In a real app, check if this category is being used by any products (vipNumbers or numberPacks)
      // const vipNumbersQuery = query(collection(db, "vipNumbers"), where("categorySlug", "==", categoryToDelete.slug));
      // const numberPacksQuery = query(collection(db, "numberPacks"), where("categorySlug", "==", categoryToDelete.slug));
      // const vipNumbersSnapshot = await getDocs(vipNumbersQuery);
      // const numberPacksSnapshot = await getDocs(numberPacksQuery);
      // if (!vipNumbersSnapshot.empty || !numberPacksSnapshot.empty) {
      //   toast({
      //     title: "Deletion Failed",
      //     description: "This category is currently in use by one or more products and cannot be deleted.",
      //     variant: "destructive",
      //   });
      //   setIsDeleting(false);
      //   closeDeleteConfirmDialog();
      //   return;
      // }

      await deleteDoc(doc(db, 'categories', categoryToDelete.id));
      toast({
        title: 'Category Deleted',
        description: `Category "${categoryToDelete.title}" has been successfully deleted.`,
      });
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
  
  const fetchCategories = useCallback(() => {
    setIsLoading(true);
    // IMPORTANT: For correct numerical sorting, ensure the 'order' field 
    // in your Firestore 'categories' documents is stored as a NUMBER type.
    // This query also requires a composite index in Firestore. 
    // Firebase usually provides a link in the console error to create it.
    // The index typically involves: `categories` collection, `order` (ASC), `createdAt` (DESC).
    const q = query(collection(db, 'categories'), orderBy('order', 'asc'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, 
      (querySnapshot) => {
        const fetchedCategories: Category[] = [];
        querySnapshot.forEach((doc) => {
          fetchedCategories.push({ id: doc.id, ...doc.data() } as Category);
        });
        setCategories(fetchedCategories);
        setIsLoading(false);
      },
      (error) => {
        console.error("Error fetching categories: ", error);
        toast({
          title: 'Error Fetching Categories',
          description: (error as Error).message || 'Could not load categories.',
          variant: 'destructive',
        });
        setIsLoading(false);
      }
    );
    return unsubscribe;
  }, [toast]);

  useEffect(() => {
    const unsubscribe = fetchCategories();
    return () => unsubscribe();
  }, [fetchCategories]);

  return (
    <>
      <PageHeader
        title="Categories Management"
        description="Manage product categories for your shop."
        actions={
          <Button onClick={handleAddNewCategory} className="bg-primary hover:bg-primary/90">
            <PlusCircle className="mr-2 h-4 w-4" /> Add New Category
          </Button>
        }
      />
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FolderKanban className="h-6 w-6 text-primary" />
            <span>Categories List</span>
          </CardTitle>
          <CardDescription>
            View, add, edit, and delete categories for VIP numbers and number packs.
            Note: Ensure 'order' field in Firestore is a Number for correct sorting.
            A Firestore index is required for ordering by 'order' and 'createdAt'.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 space-y-2">
              {[...Array(3)].map((_, i) => (
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
          ) : categories.length === 0 ? (
            <div className="flex flex-col items-center justify-center text-center p-10">
              <PackageSearch className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-xl font-semibold">No Categories Found</h3>
              <p className="text-muted-foreground">Create your first category to see it listed here.</p>
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
                {categories.map((category) => (
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
                          ? category.createdAt // Fallback if it's a string for some reason
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
      </Card>

      {isDialogOpen && (
        <CategoryDialog
            isOpen={isDialogOpen}
            onClose={() => {
                setIsDialogOpen(false);
                setEditingCategory(null);
            }}
            category={editingCategory}
            onSuccess={() => fetchCategories()} // Re-fetch or update local state
        />
      )}

      {categoryToDelete && (
        <AlertDialog open={!!categoryToDelete} onOpenChange={(open) => !open && closeDeleteConfirmDialog()}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
              <AlertDialogDescription>
                This action cannot be undone. This will permanently delete the category
                "{categoryToDelete.title}".
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

