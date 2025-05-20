
'use client';

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
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
  categories: Category[]; // Pre-fetched 'individual' categories from VipNumbersTab
}

export function VipNumberDialog({ isOpen, onClose, vipNumber, onSuccess, categories }: VipNumberDialogProps) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const form = useForm<VipNumberFormData>({
    resolver: zodResolver(vipNumberSchema),
    defaultValues: {
      number: '',
      price: 0,
      originalPrice: undefined,
      discount: undefined,
      status: 'available',
      categorySlug: '',
      description: '',
      imageHint: '',
      isVip: false,
      sumOfDigits: '',
      totalDigits: '',
    },
  });

  useEffect(() => {
    if (isOpen) {
      if (vipNumber) {
        form.reset({
          number: vipNumber.number,
          price: vipNumber.price,
          originalPrice: vipNumber.originalPrice || undefined,
          discount: vipNumber.discount || undefined,
          status: vipNumber.status,
          categorySlug: vipNumber.categorySlug,
          description: vipNumber.description || '',
          imageHint: vipNumber.imageHint || '',
          isVip: vipNumber.isVip || false,
          sumOfDigits: vipNumber.sumOfDigits || '',
          totalDigits: vipNumber.totalDigits || '',
        });
      } else {
        form.reset({
          number: '',
          price: 0,
          originalPrice: undefined,
          discount: undefined,
          status: 'available',
          categorySlug: categories.length > 0 ? categories[0].slug : '', // Default to first category if available
          description: '',
          imageHint: '',
          isVip: false,
          sumOfDigits: '',
          totalDigits: '',
        });
      }
    }
  }, [vipNumber, form, isOpen, categories]);


  const handleFormSubmit = async (data: VipNumberFormData) => {
    setIsSubmitting(true);
    
    const dataToSave: Partial<VipNumberFormData & {updatedAt: Timestamp, createdAt?: Timestamp}> = {
      ...data,
      price: Number(data.price),
      originalPrice: data.originalPrice ? Number(data.originalPrice) : (null as any), // Firestore handles null for delete/unset
      discount: data.discount ? Number(data.discount) : (null as any),
      updatedAt: serverTimestamp() as Timestamp,
    };
     // Remove undefined fields so Firestore doesn't store them as nulls unless intended
    Object.keys(dataToSave).forEach(key => {
      if (dataToSave[key as keyof typeof dataToSave] === undefined) {
        delete dataToSave[key as keyof typeof dataToSave];
      }
    });


    try {
      if (vipNumber && vipNumber.id) {
        const vipNumberRef = doc(db, 'vipNumbers', vipNumber.id);
        await updateDoc(vipNumberRef, dataToSave);
        toast({
          title: 'VIP Number Updated',
          description: `VIP Number "${data.number}" has been successfully updated.`,
        });
      } else {
        dataToSave.createdAt = serverTimestamp() as Timestamp;
        await addDoc(collection(db, 'vipNumbers'), dataToSave);
        toast({
          title: 'VIP Number Added',
          description: `VIP Number "${data.number}" has been successfully added.`,
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
        {categories.length === 0 && !vipNumber ? (
           <div className="p-4 text-center text-muted-foreground">
            Please add at least one 'Individual' type category before adding VIP numbers. Go to the Categories page to add one.
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
