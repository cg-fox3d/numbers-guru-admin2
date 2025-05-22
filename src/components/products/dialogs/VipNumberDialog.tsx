
'use client';

import { useEffect, useState, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { VipNumberForm } from '@/components/products/forms/VipNumberForm';
import type { VipNumber, VipNumberFormData, Category } from '@/types';
import { vipNumberSchema } from '@/lib/schemas';
import { db } from '@/lib/firebase';
import { collection, addDoc, doc, updateDoc, serverTimestamp, Timestamp, query, where, getDocs, orderBy } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';

interface VipNumberDialogProps {
  isOpen: boolean;
  onClose: () => void;
  vipNumber?: VipNumber | null;
  onSuccess?: () => void;
}

export function VipNumberDialog({ isOpen, onClose, vipNumber, onSuccess }: VipNumberDialogProps) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoadingCategories, setIsLoadingCategories] = useState(false);

  const defaultFormValues: VipNumberFormData = {
    number: '',
    price: 0,
    originalPrice: null,
    discount: null,
    status: 'available',
    categorySlug: '',
    description: '',
    imageHint: '',
    isVip: false,
    sumOfDigits: '',
    totalDigits: '',
  };

  const form = useForm<VipNumberFormData>({
    resolver: zodResolver(vipNumberSchema),
    defaultValues: defaultFormValues,
  });

  const fetchCategories = useCallback(async () => {
    setIsLoadingCategories(true);
    try {
      const q = query(collection(db, 'categories'), where('type', '==', 'individual'), orderBy('order', 'asc'));
      const querySnapshot = await getDocs(q);
      const fetchedCategories: Category[] = [];
      querySnapshot.forEach((doc) => {
        fetchedCategories.push({ id: doc.id, ...doc.data() } as Category);
      });
      setCategories(fetchedCategories);
      if (fetchedCategories.length > 0 && !vipNumber && !form.getValues('categorySlug')) {
        // Pre-select first category if adding new and no categorySlug is set
        // form.setValue('categorySlug', fetchedCategories[0].slug);
      }
    } catch (error) {
      console.error("Error fetching categories for VIP Number form: ", error);
      toast({
        title: "Error Fetching Categories",
        description: (error as Error).message || "Could not load categories.",
        variant: "destructive",
      });
    } finally {
      setIsLoadingCategories(false);
    }
  }, [toast, vipNumber, form]);


  useEffect(() => {
    if (isOpen) {
      fetchCategories();
      if (vipNumber) {
        form.reset({
          number: vipNumber.number,
          price: vipNumber.price,
          originalPrice: vipNumber.originalPrice ?? null,
          discount: vipNumber.discount ?? null,
          status: vipNumber.status,
          categorySlug: vipNumber.categorySlug,
          description: vipNumber.description || '',
          imageHint: vipNumber.imageHint || '',
          isVip: vipNumber.isVip || false,
          sumOfDigits: vipNumber.sumOfDigits || '',
          totalDigits: vipNumber.totalDigits || '',
        });
      } else {
        form.reset(defaultFormValues);
      }
    }
  }, [vipNumber, form, isOpen, fetchCategories]);


  const handleFormSubmit = async (data: VipNumberFormData) => {
    setIsSubmitting(true);
    const processedNumber = data.number.trim();

    if (!processedNumber) {
        toast({
            title: 'Validation Error',
            description: 'VIP Number cannot be empty.',
            variant: 'destructive',
        });
        setIsSubmitting(false);
        return;
    }
    
    // Duplicate check
    try {
      const vipNumbersRef = collection(db, 'vipNumbers');
      let q;

      if (vipNumber && vipNumber.id) { // Editing existing number
        if (processedNumber !== (vipNumber.number || '').trim()) { // Only check if number string actually changed
          q = query(vipNumbersRef, where('number', '==', processedNumber));
          const querySnapshot = await getDocs(q);
          let isActualDuplicate = false;
          querySnapshot.forEach(docSnap => {
            if (docSnap.id !== vipNumber.id) {
              isActualDuplicate = true;
            }
          });
          if (isActualDuplicate) {
            toast({
              title: 'Duplicate VIP Number',
              description: `The VIP Number "${processedNumber}" already exists. Please enter a unique number.`,
              variant: 'destructive',
            });
            setIsSubmitting(false);
            return;
          }
        }
      } else { // Adding new number
        q = query(vipNumbersRef, where('number', '==', processedNumber));
        const querySnapshot = await getDocs(q);
        if (!querySnapshot.empty) {
          toast({
            title: 'Duplicate VIP Number',
            description: `The VIP Number "${processedNumber}" already exists. Please enter a unique number.`,
            variant: 'destructive',
          });
          setIsSubmitting(false);
          return;
        }
      }
    } catch (error) {
      console.error('Error checking for duplicate VIP number:', error);
      toast({
        title: 'Error',
        description: 'Could not verify VIP number uniqueness. Please try again.',
        variant: 'destructive',
      });
      setIsSubmitting(false);
      return;
    }

    const dataToSave: Partial<VipNumberFormData> & { updatedAt: Timestamp, createdAt?: Timestamp } = {
      ...data,
      number: processedNumber,
      price: Math.round(Number(data.price)),
      originalPrice: data.originalPrice !== null && data.originalPrice !== undefined ? Math.round(Number(data.originalPrice)) : undefined,
      discount: data.discount !== null && data.discount !== undefined ? Number(data.discount) : undefined,
      updatedAt: serverTimestamp() as Timestamp,
    };
    
    // Remove undefined fields to avoid Firestore errors
    Object.keys(dataToSave).forEach(keyStr => {
      const key = keyStr as keyof typeof dataToSave;
      if (dataToSave[key] === undefined) {
        delete dataToSave[key];
      }
    });

    if (!dataToSave.categorySlug || dataToSave.categorySlug.trim() === '') {
        toast({
            title: 'Validation Error',
            description: 'Category is required.',
            variant: 'destructive',
        });
        setIsSubmitting(false);
        return;
    }

    try {
      if (vipNumber && vipNumber.id) {
        const vipNumberRef = doc(db, 'vipNumbers', vipNumber.id);
        await updateDoc(vipNumberRef, dataToSave as any); // Cast to any to avoid type issues with partial update
        toast({
          title: 'VIP Number Updated',
          description: `VIP Number "${processedNumber}" has been successfully updated.`,
        });
      } else {
        const dataForAdd = { ...dataToSave, createdAt: serverTimestamp() as Timestamp };
        delete dataForAdd.updatedAt; // Remove updatedAt for new documents as createdAt covers it
        await addDoc(collection(db, 'vipNumbers'), dataForAdd as any); // Cast to any
        toast({
          title: 'VIP Number Added',
          description: `VIP Number "${processedNumber}" has been successfully added.`,
        });
      }
      onSuccess?.();
      onClose();
    } catch (error) {
      console.error('Error saving VIP number:', error);
      toast({
        title: 'Error',
        description: (error as Error).message || 'Could not save the VIP number. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{vipNumber ? 'Edit VIP Number' : 'Add New VIP Number'}</DialogTitle>
          <DialogDescription>
            {vipNumber ? 'Update the details of this VIP number.' : 'Fill in the details for the new VIP number.'}
          </DialogDescription>
        </DialogHeader>
        {isLoadingCategories ? (
          <div className="space-y-4 py-4">
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
          </div>
        ) : (
          <VipNumberForm
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
