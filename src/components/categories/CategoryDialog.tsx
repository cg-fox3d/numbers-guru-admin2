
'use client';

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { CategoryForm } from './CategoryForm';
import type { Category, CategoryFormData } from '@/types';
import { categorySchema } from '@/lib/schemas';
import { db } from '@/lib/firebase';
import { collection, addDoc, doc, updateDoc, serverTimestamp, Timestamp } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { slugify } from '@/lib/utils';

interface CategoryDialogProps {
  isOpen: boolean;
  onClose: () => void;
  category?: Category | null; // Existing category for editing
  onSuccess?: () => void; // Callback on successful save
}

export function CategoryDialog({ isOpen, onClose, category, onSuccess }: CategoryDialogProps) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<CategoryFormData>({
    resolver: zodResolver(categorySchema),
    defaultValues: {
      title: '',
      slug: '',
      order: 0,
      type: 'individual',
    },
  });

  useEffect(() => {
    if (isOpen) { // Reset form when dialog opens
      if (category) {
        form.reset({
          title: category.title,
          slug: category.slug,
          order: category.order,
          type: category.type,
        });
      } else {
        form.reset({ // Default values for new category
          title: '',
          slug: '',
          order: 0,
          type: 'individual',
        });
      }
    }
  }, [category, form, isOpen]);

  const handleFormSubmit = async (data: CategoryFormData) => {
    setIsSubmitting(true);
    
    // Ensure slug is generated if not provided or is empty
    const finalSlug = (data.slug && data.slug.trim() !== '') ? slugify(data.slug) : slugify(data.title);
    if (!finalSlug) {
        toast({
            title: 'Validation Error',
            description: 'Title or slug is required to generate a valid slug.',
            variant: 'destructive',
        });
        setIsSubmitting(false);
        return;
    }

    const dataToSave = {
      ...data,
      slug: finalSlug,
      order: Number(data.order) // Ensure order is a number
    };

    try {
      if (category && category.id) {
        // Update existing category
        const categoryRef = doc(db, 'categories', category.id);
        // Note: createdAt is not updated on edit
        await updateDoc(categoryRef, dataToSave);
        toast({
          title: 'Category Updated',
          description: `Category "${data.title}" has been successfully updated.`,
        });
      } else {
        // Add new category
        await addDoc(collection(db, 'categories'), {
          ...dataToSave,
          createdAt: serverTimestamp() as Timestamp, // Add createdAt for new categories
        });
        toast({
          title: 'Category Added',
          description: `Category "${data.title}" has been successfully added.`,
        });
      }
      onSuccess?.(); // Call onSuccess callback if provided (e.g., to re-fetch data)
      onClose(); // Close the dialog
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

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{category ? 'Edit Category' : 'Add New Category'}</DialogTitle>
          <DialogDescription>
            {category ? 'Update the details of this category.' : 'Fill in the details for the new category.'}
          </DialogDescription>
        </DialogHeader>
        <CategoryForm
          form={form}
          onSubmit={handleFormSubmit}
          isSubmitting={isSubmitting}
          onClose={onClose} 
        />
        {/* DialogFooter is removed as actions are in CategoryForm */}
      </DialogContent>
    </Dialog>
  );
}
