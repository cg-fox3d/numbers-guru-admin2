
'use client';

import type { UseFormReturn } from 'react-hook-form';
import { useEffect } from 'react';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import type { VipNumberFormData, Category } from '@/types';

interface VipNumberFormProps {
  form: UseFormReturn<VipNumberFormData>;
  onSubmit: (data: VipNumberFormData) => Promise<void>;
  isSubmitting: boolean;
  onClose?: () => void;
  categories: Category[];
}

// Helper function to calculate sum of digits and reduce to single digit (numerology)
const calculateNumerologySum = (numberStr: string): string => {
  if (!numberStr) return '';
  const digits = numberStr.replace(/\D/g, ''); // Remove non-digits
  if (!digits) return '';

  let sum = digits.split('').reduce((acc, digit) => acc + parseInt(digit, 10), 0);

  // Reduce sum to a single digit (1-9)
  // Keep reducing if sum is greater than 9
  while (sum > 9) {
    sum = sum.toString().split('').reduce((acc, digit) => acc + parseInt(digit, 10), 0);
  }
  return sum.toString();
};

// Helper function to calculate the sum of all digits in the number string
const calculateSumOfAllDigits = (numberStr: string): string => {
    if (!numberStr) return '';
    const digitsOnly = numberStr.replace(/\D/g, '');
    if (!digitsOnly) return '';
    const sum = digitsOnly.split('').reduce((acc, digit) => acc + parseInt(digit, 10), 0);
    return sum.toString();
};


export function VipNumberForm({ form, onSubmit, isSubmitting, onClose, categories }: VipNumberFormProps) {
  const { watch, setValue, getValues } = form;
  const numberInput = watch('number');
  const originalPriceInput = watch('originalPrice');
  const discountInput = watch('discount');

  useEffect(() => {
    if (numberInput !== undefined) { 
      const totalSumOfAllDigits = calculateSumOfAllDigits(numberInput);
      const numerologySum = calculateNumerologySum(numberInput);
      setValue('totalDigits', totalSumOfAllDigits, { shouldValidate: false });
      setValue('sumOfDigits', numerologySum, { shouldValidate: false });
    }
  }, [numberInput, setValue]);

  const handleCalculatePrice = () => {
    const originalPriceValue = getValues('originalPrice');
    const discountValue = getValues('discount');

    const op = typeof originalPriceValue === 'number' ? originalPriceValue : parseFloat(String(originalPriceValue) || '0');
    const d = typeof discountValue === 'number' ? discountValue : parseFloat(String(discountValue) || '0');


    if (!isNaN(op)) {
      if (!isNaN(d) && d >= 0 && d <= 100) {
        const calculatedPrice = op - (op * d / 100);
        setValue('price', Math.round(calculatedPrice), { shouldValidate: true });
      } else {
        // If discount is invalid or not provided, selling price is original price
        setValue('price', Math.round(op), { shouldValidate: true });
      }
    } else {
       // If original price is not a valid number, set selling price to 0 or handle as error
       setValue('price', 0, { shouldValidate: true });
    }
  };
  
  // Filter categories to ensure slugs are not empty strings
  const validCategories = categories.filter(category => category.slug && category.slug.trim() !== '');

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 max-h-[70vh] overflow-y-auto p-1 pr-3">
        <FormField
          control={form.control}
          name="number"
          render={({ field }) => (
            <FormItem>
              <FormLabel>VIP Number</FormLabel>
              <FormControl>
                <Input placeholder="e.g., 9876500001" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <FormField
            control={form.control}
            name="originalPrice"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Original Price (₹)</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    placeholder="e.g., 60000"
                    {...field}
                    value={field.value ?? ''}
                    onChange={e => field.onChange(e.target.value)} // Pass string for Zod to preprocess
                    onBlur={(e) => {
                        field.onBlur(); 
                        handleCalculatePrice(); 
                    }}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="discount"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Discount (%)</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    placeholder="e.g., 10"
                    step="0.01"
                    {...field}
                    value={field.value ?? ''}
                    onChange={e => field.onChange(e.target.value)} // Pass string for Zod to preprocess
                    onBlur={(e) => {
                        field.onBlur();
                        handleCalculatePrice();
                    }}
                    min="0"
                    max="100"
                  />
                </FormControl>
                <FormDescription>0 to 100</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="price"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Selling Price (₹)</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    placeholder="Auto-calculated or manual"
                    {...field}
                    value={field.value ?? ''}
                    onChange={e => field.onChange(e.target.value)} // Pass string for Zod to preprocess
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
         <Button type="button" variant="outline" size="sm" onClick={handleCalculatePrice} className="mb-4">
            Calculate Selling Price
        </Button>

        <FormField
          control={form.control}
          name="categorySlug"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Category</FormLabel>
              <Select onValueChange={field.onChange} value={field.value || ""} defaultValue={field.value || ""}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a category" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {validCategories.length === 0 && (
                    <SelectItem value="placeholder-disabled" disabled>
                      No 'individual' type categories found
                    </SelectItem>
                  )}
                  {validCategories.map((category) => (
                    <SelectItem key={category.id} value={category.slug}>
                      {category.title} ({category.slug})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormDescription>Select the category for this VIP number.</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="status"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Status</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="available">Available</SelectItem>
                  <SelectItem value="sold">Sold</SelectItem>
                  <SelectItem value="booked">Booked</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Description (Optional)</FormLabel>
              <FormControl>
                <Textarea placeholder="e.g., Special sequence, easy to remember" {...field} value={field.value ?? ''} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="imageHint"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Image Hint (Optional)</FormLabel>
              <FormControl>
                <Input placeholder="e.g., luxury phone, golden digits (1-2 words)" {...field} value={field.value ?? ''}/>
              </FormControl>
              <FormDescription>Keywords for AI image generation if needed.</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <FormField
            control={form.control}
            name="totalDigits"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Sum of All Digits (Auto)</FormLabel>
                <FormControl>
                  <Input placeholder="Auto-calculated" {...field} readOnly value={field.value ?? ''} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="sumOfDigits"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Numerology Sum (Auto)</FormLabel>
                <FormControl>
                  <Input placeholder="Auto-calculated" {...field} readOnly value={field.value ?? ''} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
           <FormField
            control={form.control}
            name="isVip"
            render={({ field }) => (
              <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4 mt-4">
                <FormControl>
                  <Checkbox
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                </FormControl>
                <div className="space-y-1 leading-none">
                  <FormLabel>
                    Mark as VIP
                  </FormLabel>
                  <FormDescription>
                    Indicates if this is a premium VIP number.
                  </FormDescription>
                </div>
              </FormItem>
            )}
          />
        </div>


        <div className="flex justify-end space-x-2 pt-4">
          {onClose && (
            <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </Button>
          )}
          <Button type="submit" disabled={isSubmitting} className="bg-primary hover:bg-primary/90">
            {isSubmitting ? 'Saving...' : 'Save VIP Number'}
          </Button>
        </div>
      </form>
    </Form>
  );
}
