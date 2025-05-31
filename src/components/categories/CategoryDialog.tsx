
'use client';

import * as React from 'react'; 
import { useEffect, useState, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { CategoryForm } from '@/components/categories/CategoryForm';
import type { Category, CategoryFormData } from '@/types';
import { categorySchema } from '@/lib/schemas';
import { db } from '@/lib/firebase';
import { collection, addDoc, doc, updateDoc, serverTimestamp, Timestamp, query, orderBy, limit, getDocs } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { slugify } from '@/lib/utils';

interface CategoryDialogProps {
  isOpen: boolean;
  onClose: () => void;
  category?: Category | null; 
  onSuccess?: () => void; 
}

export function CategoryDialog({ isOpen, onClose, category, onSuccess }: CategoryDialogProps) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingNextOrder, setIsLoadingNextOrder] = useState(false);

  const defaultFormValuesRef = React.useRef<CategoryFormData>({
    title: '',
    slug: '',
    order: 0, 
    type: 'individual',
  });

  const form = useForm<CategoryFormData>({
    resolver: zodResolver(categorySchema),
    defaultValues: defaultFormValuesRef.current,
  });

  const fetchNextCategoryOrder = useCallback(async (): Promise<number> => {
    try {
      const q = query(collection(db, 'categories'), orderBy('order', 'desc'), limit(1));
      const querySnapshot = await getDocs(q);
      if (!querySnapshot.empty) {
        const lastCategory = querySnapshot.docs[0].data();
        const lastOrder = typeof lastCategory.order === 'number' ? lastCategory.order : 0;
        return lastOrder + 1;
      }
      return 0; 
    } catch (error) {
      console.error("Error fetching max category order: ", error);
      toast({
        title: 'Error',
        description: 'Could not fetch next category order. Defaulting to 0.',
        variant: 'destructive',
      });
      return 0; 
    }
  }, [toast]);

  useEffect(() => {
    const initializeForm = async () => {
      if (category) { 
        form.reset({
          title: category.title,
          slug: category.slug,
          order: category.order,
          type: category.type,
        });
      } else { 
        setIsLoadingNextOrder(true);
        const nextOrder = await fetchNextCategoryOrder();
        form.reset({
          title: '',
          slug: '', 
          order: nextOrder,
          type: 'individual',
        });
        setIsLoadingNextOrder(false);
      }
    };

    if (isOpen) {
      initializeForm();
    }
  }, [category, form, isOpen, fetchNextCategoryOrder]);

  const handleFormSubmit = async (data: CategoryFormData) => {
    setIsSubmitting(true);
    
    const finalSlug = data.slug; 

    const dataToSave: Partial<CategoryFormData> & { updatedAt?: Timestamp, createdAt?: Timestamp } = {
      ...data,
      slug: finalSlug,
      order: Number(data.order) 
    };

    try {
      if (category && category.id) {
        const categoryRef = doc(db, 'categories', category.id);
        dataToSave.updatedAt = serverTimestamp() as Timestamp;
        await updateDoc(categoryRef, dataToSave);
        toast({
          title: 'Category Updated',
          description: `Category "${data.title}" has been successfully updated.`,
        });
      } else {
        dataToSave.createdAt = serverTimestamp() as Timestamp;
        dataToSave.updatedAt = serverTimestamp() as Timestamp; 
        await addDoc(collection(db, 'categories'), dataToSave);
        toast({
          title: 'Category Added',
          description: `Category "${data.title}" has been successfully added.`,
        });
      }
      onSuccess?.(); 
      onClose(); 
    } catch (error) {
      console.error('Error saving category:', error);
      toast({
        title: 'Error',
        description: (error as Error).message || 'Could not save the category. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenChange = useCallback((openStatus: boolean) => {
    if (!openStatus) {
      onClose();
    }
  }, [onClose]);

  if (!isOpen && !category && !isLoadingNextOrder) return null; 

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{category ? 'Edit Category' : 'Add New Category'}</DialogTitle>
          <DialogDescription>
            {category ? 'Update the details of this category.' : 'Fill in the details for the new category.'}
          </DialogDescription>
        </DialogHeader>
        {isLoadingNextOrder && !category ? (
            <div className="space-y-4 py-4">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-1/2" />
                <Skeleton className="h-10 w-full mt-2" />
            </div>
        ) : (
            <CategoryForm
                form={form}
                onSubmit={handleFormSubmit}
                isSubmitting={isSubmitting || (isLoadingNextOrder && !category)}
                onClose={onClose} 
            />
        )}
      </DialogContent>
    </Dialog>
  );
}
