
'use client';

import type { UseFormReturn } from 'react-hook-form';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import type { VipNumberFormData } from '@/types';

interface VipNumberFormProps {
  form: UseFormReturn<VipNumberFormData>;
  onSubmit: (data: VipNumberFormData) => Promise<void>;
  isSubmitting: boolean;
  onClose?: () => void;
  // categories prop is removed
}

export function VipNumberForm({ form, onSubmit, isSubmitting, onClose }: VipNumberFormProps) {
  const { watch, setValue } = form;
  const originalPrice = watch('originalPrice');
  const discount = watch('discount');

  const handleCalculatePrice = () => {
    const op = parseFloat(String(originalPrice || 0));
    const d = parseFloat(String(discount || 0));
    if (!isNaN(op) && !isNaN(d) && d >= 0 && d <= 100) {
      const calculatedPrice = op - (op * d / 100);
      setValue('price', parseFloat(calculatedPrice.toFixed(2)), { shouldValidate: true });
    } else if (!isNaN(op)) {
      setValue('price', op, { shouldValidate: true });
    }
  };

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
                  <Input type="number" placeholder="e.g., 60000" {...field} 
                   onChange={e => field.onChange(parseFloat(e.target.value) || undefined)} // Allow undefined for optional
                   onBlur={handleCalculatePrice}
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
                  <Input type="number" placeholder="e.g., 10" {...field} 
                  onChange={e => field.onChange(parseFloat(e.target.value) || undefined)} // Allow undefined for optional
                  onBlur={handleCalculatePrice}
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
                  <Input type="number" placeholder="Auto-calculated or manual" {...field} 
                   onChange={e => field.onChange(parseFloat(e.target.value) || 0)}
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
              <FormLabel>Category Slug</FormLabel>
              <FormControl>
                <Input placeholder="e.g., fancy-numbers-786" {...field} />
              </FormControl>
              <FormDescription>Enter the exact category slug.</FormDescription>
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
                <Textarea placeholder="e.g., Special sequence, easy to remember" {...field} />
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
                <Input placeholder="e.g., luxury phone, golden digits (1-2 words)" {...field} />
              </FormControl>
              <FormDescription>Keywords for AI image generation if needed.</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <FormField
            control={form.control}
            name="sumOfDigits"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Sum of Digits (Optional)</FormLabel>
                <FormControl>
                  <Input placeholder="e.g., 45" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="totalDigits"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Total Digits (Optional)</FormLabel>
                <FormControl>
                  <Input placeholder="e.g., 10" {...field} />
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

    