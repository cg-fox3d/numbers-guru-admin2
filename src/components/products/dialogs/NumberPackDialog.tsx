
'use client';

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { NumberPackForm } from '@/components/products/forms/NumberPackForm';
import type { NumberPack, NumberPackFormData } from '@/types';
import { numberPackSchema } from '@/lib/schemas';
import { db } from '@/lib/firebase';
import { collection, addDoc, doc, updateDoc, serverTimestamp, Timestamp } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';

interface NumberPackDialogProps {
  isOpen: boolean;
  onClose: () => void;
  numberPack?: NumberPack | null; 
  onSuccess?: () => void;
}

export function NumberPackDialog({ isOpen, onClose, numberPack, onSuccess }: NumberPackDialogProps) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const form = useForm<NumberPackFormData>({
    resolver: zodResolver(numberPackSchema),
    defaultValues: {
      name: '',
      numbers: [{ number: '', price: 0 }], // Start with one empty number item
      packPrice: 0,
      totalOriginalPrice: null,
      status: 'available',
      categorySlug: '',
      description: '',
      imageHint: '',
      isVipPack: false,
    },
  });

  useEffect(() => {
    if (isOpen) {
      if (numberPack) {
        form.reset({
          name: numberPack.name,
          // Ensure numbers array is correctly mapped, providing empty objects if undefined
          numbers: numberPack.numbers?.map(n => ({ number: n.number, price: n.price, id: n.id })) || [{ number: '', price: 0 }],
          packPrice: numberPack.packPrice,
          totalOriginalPrice: numberPack.totalOriginalPrice ?? null,
          status: numberPack.status,
          categorySlug: numberPack.categorySlug,
          description: numberPack.description || '',
          imageHint: numberPack.imageHint || '',
          isVipPack: numberPack.isVipPack || false,
        });
      } else {
        form.reset({
          name: '',
          numbers: [{ number: '', price: 0 }],
          packPrice: 0,
          totalOriginalPrice: null,
          status: 'available',
          categorySlug: '',
          description: '',
          imageHint: '',
          isVipPack: false,
        });
      }
    }
  }, [numberPack, form, isOpen]);


  const handleFormSubmit = async (data: NumberPackFormData) => {
    setIsSubmitting(true);
    
    const dataToSave = {
      ...data,
      packPrice: Number(data.packPrice),
      totalOriginalPrice: data.totalOriginalPrice !== null && data.totalOriginalPrice !== undefined ? Number(data.totalOriginalPrice) : undefined,
      numbers: data.numbers.map(n => ({
        number: n.number,
        price: Number(n.price),
        // id: n.id // Persist id if needed for linking, otherwise it's mainly for form key
      })),
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
            description: 'Category Slug is required for the pack.',
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

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="sm:max-w-3xl"> {/* Increased width for pack form */}
        <DialogHeader>
          <DialogTitle>{numberPack ? 'Edit Number Pack' : 'Add New Number Pack'}</DialogTitle>
          <DialogDescription>
            {numberPack ? 'Update the details of this number pack.' : 'Fill in the details for the new number pack.'}
          </DialogDescription>
        </DialogHeader>
        <NumberPackForm
          form={form}
          onSubmit={handleFormSubmit}
          isSubmitting={isSubmitting}
          onClose={onClose}
        />
      </DialogContent>
    </Dialog>
  );
}

