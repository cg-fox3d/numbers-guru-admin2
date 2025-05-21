
'use client';

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { VipNumberForm } from '@/components/products/forms/VipNumberForm';
import type { VipNumber, VipNumberFormData } from '@/types';
import { vipNumberSchema } from '@/lib/schemas';
import { db } from '@/lib/firebase';
import { collection, addDoc, doc, updateDoc, serverTimestamp, Timestamp, query, where, getDocs } from 'firebase/firestore';
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
      originalPrice: null, 
      discount: null,      
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
        form.reset({
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
        });
      }
    }
  }, [vipNumber, form, isOpen]);


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
        // Only check for duplicates if the number string has actually changed
        if (processedNumber !== vipNumber.number.trim()) {
          q = query(vipNumbersRef, where('number', '==', processedNumber));
          const querySnapshot = await getDocs(q);
          if (!querySnapshot.empty) {
            // Check if the found duplicate is not the current document itself
            let isActualDuplicate = false;
            querySnapshot.forEach(doc => {
              if (doc.id !== vipNumber.id) {
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

    const dataToSave: Partial<VipNumber> = {
      number: processedNumber, // Use the processed number
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
      updatedAt: serverTimestamp() as Timestamp,
    };
    
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
          description: `VIP Number "${processedNumber}" has been successfully updated.`,
        });
      } else {
        const dataForAdd = { ...dataToSave, createdAt: serverTimestamp() as Timestamp };
        delete (dataForAdd as any).updatedAt; 
        await addDoc(collection(db, 'vipNumbers'), dataForAdd);
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
