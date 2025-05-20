
'use client';

import { useEffect, useState, useCallback } from 'react';
import { db } from '@/lib/firebase';
import { collection, query, orderBy, onSnapshot, Timestamp, doc, deleteDoc, where, getDocs } from 'firebase/firestore';
import type { VipNumber, Category } from '@/types';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { MoreHorizontal, Edit, Trash2, PackageSearch, PlusCircle } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { VipNumberDialog } from '@/components/products/dialogs/VipNumberDialog'; // Corrected alias
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
  // categories prop is removed, VipNumberDialog will fetch its own categories
}

export function VipNumbersTab({ categoryMap }: VipNumbersTabProps) {
  const [vipNumbers, setVipNumbers] = useState<VipNumber[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingVipNumber, setEditingVipNumber] = useState<VipNumber | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [vipNumberToDelete, setVipNumberToDelete] = useState<VipNumber | null>(null);
  const [individualCategories, setIndividualCategories] = useState<Category[]>([]);
  const [isLoadingCategories, setIsLoadingCategories] = useState(true);

  const { toast } = useToast();

  const fetchIndividualCategories = useCallback(async () => {
    setIsLoadingCategories(true);
    try {
      const catQuery = query(
        collection(db, 'categories'), 
        where('type', '==', 'individual'),
        orderBy('order', 'asc')
      );
      const snapshot = await getDocs(catQuery);
      const fetchedCategories: Category[] = [];
      snapshot.forEach(doc => fetchedCategories.push({ id: doc.id, ...doc.data() } as Category));
      setIndividualCategories(fetchedCategories);
    } catch (error) {
      console.error("Error fetching individual categories: ", error);
      toast({
        title: 'Error Fetching Categories',
        description: "Could not load categories for the form.",
        variant: 'destructive',
      });
    } finally {
      setIsLoadingCategories(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchIndividualCategories();
  }, [fetchIndividualCategories]);

  const fetchVipNumbers = useCallback(() => {
    setIsLoading(true);
    const q = query(collection(db, 'vipNumbers'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, 
      (querySnapshot) => {
        const numbers: VipNumber[] = [];
        querySnapshot.forEach((doc) => {
          numbers.push({ id: doc.id, ...doc.data() } as VipNumber);
        });
        setVipNumbers(numbers);
        setIsLoading(false);
      },
      (error) => {
        console.error("Error fetching VIP numbers: ", error);
        toast({
          title: 'Error Fetching VIP Numbers',
          description: (error as Error).message || 'Could not load VIP numbers.',
          variant: 'destructive',
        });
        setIsLoading(false);
      }
    );
    return unsubscribe;
  }, [toast]);

  useEffect(() => {
    const unsubscribe = fetchVipNumbers();
    return () => unsubscribe();
  }, [fetchVipNumbers]);

  const handleAddNewVipNumber = () => {
    if (isLoadingCategories) {
        toast({ title: 'Loading categories...', description: 'Please wait until categories are loaded.'});
        return;
    }
    if (individualCategories.length === 0) {
      toast({
        title: 'Cannot Add VIP Number',
        description: "Please create at least one 'Individual' type category first on the Categories page.",
        variant: 'destructive',
      });
      return;
    }
    setEditingVipNumber(null);
    setIsDialogOpen(true);
  };

  const handleEditVipNumber = (product: VipNumber) => {
     if (isLoadingCategories) {
        toast({ title: 'Loading categories...', description: 'Please wait until categories are loaded.'});
        return;
    }
    if (individualCategories.length === 0 && !product.categorySlug) {
         toast({
            title: 'Cannot Edit VIP Number',
            description: "No 'Individual' type categories found. Please add one first.",
            variant: 'destructive',
        });
        return;
    }
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

  if (isLoading && vipNumbers.length === 0) { // Initial full page loading state
    return (
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <Skeleton className="h-7 w-48 mb-1" /> {/* Adjusted width */}
              <Skeleton className="h-4 w-64" /> {/* Adjusted width */}
            </div>
            <Skeleton className="h-10 w-48" /> {/* Skeleton for Add button */}
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="flex items-center justify-between p-2 border rounded-md">
                <div className="flex-1 space-y-1">
                  <Skeleton className="h-5 w-1/3" />
                  <Skeleton className="h-4 w-1/4" />
                </div>
                <Skeleton className="h-8 w-8 ml-4" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }


  return (
    <Card className="shadow-lg">
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <CardTitle>VIP Numbers List</CardTitle>
            <CardDescription>Browse and manage individual VIP mobile numbers.</CardDescription>
          </div>
          <Button 
            onClick={handleAddNewVipNumber} 
            className="bg-primary hover:bg-primary/90"
            disabled={isLoadingCategories} // Disable if categories are still loading
          >
            <PlusCircle className="mr-2 h-4 w-4" /> Add New VIP Number
          </Button>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {isLoading && vipNumbers.length > 0 && ( // Loading state but some data might already be there (from previous snapshot)
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Number</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Price (₹)</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="hidden lg:table-cell">Created At</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {[...Array(3)].map((_, i) => (
                <TableRow key={`skeleton-${i}`}>
                  <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-20" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-16" /></TableCell>
                  <TableCell><Skeleton className="h-6 w-20 rounded-full" /></TableCell>
                  <TableCell className="hidden lg:table-cell"><Skeleton className="h-5 w-28" /></TableCell>
                  <TableCell className="text-right"><Skeleton className="h-8 w-8 ml-auto" /></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}

        {!isLoading && vipNumbers.length === 0 && (
          <div className="flex flex-col items-center justify-center text-center p-10">
            <PackageSearch className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-xl font-semibold">No VIP Numbers Found</h3>
            <p className="text-muted-foreground">Add your first VIP number to see it listed here.</p>
          </div>
        )}

        {!isLoading && vipNumbers.length > 0 && (
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
              {vipNumbers.map((product) => (
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
                        <DropdownMenuItem onClick={() => handleEditVipNumber(product)} disabled={isLoadingCategories}>
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

      {isDialogOpen && !isLoadingCategories && (
        <VipNumberDialog
          isOpen={isDialogOpen}
          onClose={() => {
            setIsDialogOpen(false);
            setEditingVipNumber(null);
          }}
          vipNumber={editingVipNumber}
          categories={individualCategories}
          onSuccess={() => { /* Data re-fetches via onSnapshot automatically */ }}
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
