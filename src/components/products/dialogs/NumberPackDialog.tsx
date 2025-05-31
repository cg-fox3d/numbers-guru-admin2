
'use client';

import * as React from 'react'; 
import { useEffect, useState, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { NumberPackForm } from '@/components/products/forms/NumberPackForm';
import type { NumberPack, NumberPackFormData, Category } from '@/types';
import { numberPackSchema } from '@/lib/schemas';
import { db } from '@/lib/firebase';
import { collection, addDoc, doc, updateDoc, serverTimestamp, Timestamp, query, where, getDocs, orderBy } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';

interface NumberPackDialogProps {
  isOpen: boolean;
  onClose: () => void;
  numberPack?: NumberPack | null; 
  onSuccess?: () => void;
}

export function NumberPackDialog({ isOpen, onClose, numberPack, onSuccess }: NumberPackDialogProps) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoadingCategories, setIsLoadingCategories] = useState(false);

  const defaultFormValuesRef = React.useRef<NumberPackFormData>({
    name: '',
    numbers: [{ number: '', price: 0, originalVipNumberId: undefined }],
    totalOriginalPrice: 0,
    status: 'available',
    categorySlug: '',
    description: '',
    imageHint: '',
    isVipPack: false,
  });
  
  const form = useForm<NumberPackFormData>({
    resolver: zodResolver(numberPackSchema),
    defaultValues: defaultFormValuesRef.current,
  });

  const fetchCategories = useCallback(async () => {
    setIsLoadingCategories(true);
    try {
      const q = query(collection(db, 'categories'), where('type', '==', 'pack'), orderBy('order', 'asc'));
      const querySnapshot = await getDocs(q);
      const fetchedCategories: Category[] = [];
      querySnapshot.forEach((docSn) => {
        fetchedCategories.push({ id: docSn.id, ...docSn.data() } as Category);
      });
      setCategories(fetchedCategories);
    } catch (error) {
      console.error("Error fetching categories for Number Pack form: ", error);
      toast({
        title: "Error Fetching Categories",
        description: (error as Error).message || "Could not load categories.",
        variant: "destructive",
      });
      setCategories([]); 
    } finally {
      setIsLoadingCategories(false);
    }
  }, [toast]); 

  useEffect(() => {
    if (isOpen) {
      fetchCategories();
      if (numberPack) {
        form.reset({
          name: numberPack.name,
          numbers: numberPack.numbers?.map(n => ({ 
            originalVipNumberId: n.originalVipNumberId, 
            number: n.number, 
            price: n.price 
          })) || [{ number: '', price: 0, originalVipNumberId: undefined }],
          totalOriginalPrice: numberPack.totalOriginalPrice ?? 0, 
          status: numberPack.status,
          categorySlug: numberPack.categorySlug || '',
          description: numberPack.description || '',
          imageHint: numberPack.imageHint || '',
          isVipPack: numberPack.isVipPack || false,
        });
      } else {
        form.reset(defaultFormValuesRef.current);
      }
    }
  }, [numberPack, form, isOpen, fetchCategories]);


  const handleFormSubmit = async (data: NumberPackFormData) => {
    setIsSubmitting(true);
    
    const processedNumbers = data.numbers.map(n => ({
      ...n,
      price: Number(n.price),
    }));

    const dataToSave: Partial<Omit<NumberPackFormData, 'totalOriginalPrice'>> & { 
        totalOriginalPrice?: number | null, 
        updatedAt: Timestamp, 
        createdAt?: Timestamp 
      } = {
      name: data.name,
      numbers: processedNumbers,
      status: data.status,
      categorySlug: data.categorySlug,
      description: data.description || undefined, 
      imageHint: data.imageHint || undefined,
      isVipPack: data.isVipPack,
      totalOriginalPrice: data.totalOriginalPrice, 
      updatedAt: serverTimestamp() as Timestamp,
    };
    
    Object.keys(dataToSave).forEach(keyStr => {
      const key = keyStr as keyof typeof dataToSave;
      if (dataToSave[key] === undefined) {
        delete (dataToSave as any)[key]; 
      }
    });


    if (!dataToSave.categorySlug || dataToSave.categorySlug.trim() === '') {
        toast({
            title: 'Validation Error',
            description: 'Category is required for the pack.',
            variant: 'destructive',
        });
        setIsSubmitting(false);
        return;
    }

    try {
      if (numberPack && numberPack.id) {
        const packRef = doc(db, 'numberPacks', numberPack.id);
        await updateDoc(packRef, dataToSave);
        toast({
          title: 'Number Pack Updated',
          description: `Pack "${data.name}" has been successfully updated.`,
        });
      } else {
        const dataForAdd = { ...dataToSave, createdAt: serverTimestamp() as Timestamp };
        delete (dataForAdd as any).updatedAt; 
        await addDoc(collection(db, 'numberPacks'), dataForAdd);
        toast({
          title: 'Number Pack Added',
          description: `Pack "${data.name}" has been successfully added.`,
        });
      }
      onSuccess?.();
      onClose();
    } catch (error) {
      console.error('Error saving number pack:', error);
      toast({
        title: 'Error',
        description: (error as Error).message || 'Could not save the number pack.',
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

  if (!isOpen && !numberPack && !isLoadingCategories) return null;

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-3xl"> 
        <DialogHeader>
          <DialogTitle>{numberPack ? 'Edit Number Pack' : 'Add New Number Pack'}</DialogTitle>
          <DialogDescription>
            {numberPack ? 'Update the details of this number pack.' : 'Fill in the details for the new number pack.'}
          </DialogDescription>
        </DialogHeader>
        {isLoadingCategories ? (
          <div className="space-y-4 py-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-10 w-1/2" />
            <Skeleton className="h-10 w-full mt-2" />
          </div>
        ) : (
          <NumberPackForm
            form={form}
            onSubmit={handleFormSubmit}
            isSubmitting={isSubmitting}
            onClose={onClose}
            categories={categories}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
