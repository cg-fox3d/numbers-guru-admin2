
'use client';

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { VipNumberForm } from '@/components/products/forms/VipNumberForm';
import type { VipNumber, VipNumberFormData } from '@/types';
import { vipNumberSchema } from '@/lib/schemas';
import { db } from '@/lib/firebase';
import { collection, addDoc, doc, updateDoc, serverTimestamp, Timestamp } from 'firebase/firestore';
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
  
  const form = useForm<VipNumberFormData>({
    resolver: zodResolver(vipNumberSchema),
    defaultValues: {
      number: '',
      price: 0,
      originalPrice: null, // Changed from undefined
      discount: null,      // Changed from undefined
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
          originalPrice: vipNumber.originalPrice ?? null, // Changed
          discount: vipNumber.discount ?? null,          // Changed
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
          originalPrice: null, // Changed
          discount: null,      // Changed
          status: 'available',
          categorySlug: '',
          description: '',
          imageHint: '',
          isVip: false,
          sumOfDigits: '',
          totalDigits: '',
        });
      }
    }
  }, [vipNumber, form, isOpen]);


  const handleFormSubmit = async (data: VipNumberFormData) => {
    setIsSubmitting(true);
    
    // Prepare data for Firestore, ensuring numbers are numbers
    // and optional fields that are empty/null in form become undefined for Firestore or null if preferred
    const dataToSave: Partial<VipNumber> = { // Use Partial<VipNumber> to match Firestore structure potentially
      number: data.number,
      price: Number(data.price),
      originalPrice: data.originalPrice !== null && data.originalPrice !== undefined ? Number(data.originalPrice) : undefined,
      discount: data.discount !== null && data.discount !== undefined ? Number(data.discount) : undefined,
      status: data.status,
      categorySlug: data.categorySlug,
      description: data.description || undefined,
      imageHint: data.imageHint || undefined,
      isVip: data.isVip || false,
      sumOfDigits: data.sumOfDigits || undefined,
      totalDigits: data.totalDigits || undefined,
      // Casting serverTimestamp for updatedAt
      updatedAt: serverTimestamp() as Timestamp,
    };
    
    // Remove undefined fields explicitly for cleaner Firestore data, though Firestore handles it
    Object.keys(dataToSave).forEach(keyStr => {
      const key = keyStr as keyof typeof dataToSave;
      if (dataToSave[key] === undefined) {
        delete dataToSave[key];
      }
    });


    if (!dataToSave.categorySlug || dataToSave.categorySlug.trim() === '') {
        toast({
            title: 'Validation Error',
            description: 'Category Slug is required.',
            variant: 'destructive',
        });
        setIsSubmitting(false);
        return;
    }


    try {
      if (vipNumber && vipNumber.id) {
        const vipNumberRef = doc(db, 'vipNumbers', vipNumber.id);
        await updateDoc(vipNumberRef, dataToSave);
        toast({
          title: 'VIP Number Updated',
          description: `VIP Number "${data.number}" has been successfully updated.`,
        });
      } else {
        // Add createdAt only for new documents
        const dataForAdd = { ...dataToSave, createdAt: serverTimestamp() as Timestamp };
        delete dataForAdd.updatedAt; // No updatedAt on create, Firestore rule/trigger could handle this too
        await addDoc(collection(db, 'vipNumbers'), dataForAdd);
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
        <VipNumberForm
          form={form}
          onSubmit={handleFormSubmit}
          isSubmitting={isSubmitting}
          onClose={onClose}
        />
      </DialogContent>
    </Dialog>
  );
}
