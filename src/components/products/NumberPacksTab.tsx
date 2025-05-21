
'use client';

import { useEffect, useState, useCallback } from 'react';
import { db } from '@/lib/firebase';
import { collection, query, orderBy, onSnapshot, Timestamp, doc, deleteDoc } from 'firebase/firestore';
import type { NumberPack } from '@/types';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { MoreHorizontal, Edit, Trash2, PackageSearch, PlusCircle, Search as SearchIcon } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
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

export function NumberPacksTab({ categoryMap }: NumberPacksTabProps) {
  const [allNumberPacks, setAllNumberPacks] = useState<NumberPack[]>([]);
  const [filteredNumberPacks, setFilteredNumberPacks] = useState<NumberPack[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingNumberPack, setEditingNumberPack] = useState<NumberPack | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [packToDelete, setPackToDelete] = useState<NumberPack | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const { toast } = useToast();

  const fetchNumberPacks = useCallback(() => {
    setIsLoading(true);
    const q = query(collection(db, 'numberPacks'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, 
      (querySnapshot) => {
        const packs: NumberPack[] = [];
        querySnapshot.forEach((doc) => {
          packs.push({ id: doc.id, ...doc.data() } as NumberPack);
        });
        setAllNumberPacks(packs);
        setFilteredNumberPacks(packs); // Initialize filtered list
        setIsLoading(false);
      },
      (error) => {
        console.error("Error fetching number packs: ", error);
        toast({
          title: 'Error Fetching Number Packs',
          description: (error as Error).message || 'Could not load number packs.',
          variant: 'destructive',
        });
        setIsLoading(false);
      }
    );
    return unsubscribe;
  }, [toast]);

  useEffect(() => {
    const unsubscribe = fetchNumberPacks();
    return () => unsubscribe();
  }, [fetchNumberPacks]);

  useEffect(() => {
    const lowercasedFilter = searchTerm.toLowerCase();
    const filteredData = allNumberPacks.filter(item => {
      return item.name.toLowerCase().includes(lowercasedFilter);
    });
    setFilteredNumberPacks(filteredData);
  }, [searchTerm, allNumberPacks]);

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
  
  if (isLoading && allNumberPacks.length === 0) { // Check allNumberPacks for initial load
    return (
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
                <Skeleton className="h-7 w-48 mb-1" />
                <Skeleton className="h-4 w-64" />
            </div>
            <Skeleton className="h-10 w-48" />
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
                <CardTitle>Number Packs List</CardTitle>
                <CardDescription>Browse and manage number pack bundles.</CardDescription>
            </div>
            <Button onClick={handleAddNewPack} className="bg-primary hover:bg-primary/90">
                <PlusCircle className="mr-2 h-4 w-4" /> Add New Pack
            </Button>
        </div>
        <div className="mt-4 relative">
          <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search by pack name..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 w-full md:w-1/2 lg:w-1/3"
          />
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {isLoading && filteredNumberPacks.length === 0 && searchTerm === '' && (
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
                  {[...Array(3)].map((_, i) => (
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
        )}
        {!isLoading && filteredNumberPacks.length === 0 ? (
          <div className="flex flex-col items-center justify-center text-center p-10">
            <PackageSearch className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-xl font-semibold">
              {searchTerm ? 'No Number Packs Match Your Search' : 'No Number Packs Found'}
            </h3>
            <p className="text-muted-foreground">
              {searchTerm ? 'Try a different search term.' : 'Create your first number pack to see it listed here.'}
            </p>
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
                  <TableHead className="hidden lg:table-cell">Description</TableHead>
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

      {isDialogOpen && (
        <NumberPackDialog
            isOpen={isDialogOpen}
            onClose={() => {
                setIsDialogOpen(false);
                setEditingNumberPack(null);
            }}
            numberPack={editingNumberPack}
            onSuccess={() => { /* Data re-fetches via onSnapshot automatically */ }}
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
