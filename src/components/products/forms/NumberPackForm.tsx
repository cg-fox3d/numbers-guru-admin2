
'use client';

import type { UseFormReturn} from 'react-hook-form';
import { useFieldArray } from 'react-hook-form';
import { useEffect, useState } from 'react';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { PlusCircle, Trash2, ChevronsUpDown, CheckIcon } from 'lucide-react';
import type { NumberPackFormData, NumberPackItemFormData, VipNumber, Category } from '@/types';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

interface NumberPackFormProps {
  form: UseFormReturn<NumberPackFormData>;
  onSubmit: (data: NumberPackFormData) => Promise<void>;
  isSubmitting: boolean;
  onClose?: () => void;
  categories: Category[];
}

export function NumberPackForm({ form, onSubmit, isSubmitting, onClose, categories }: NumberPackFormProps) {
  const { fields, append, remove, update } = useFieldArray({
    control: form.control,
    name: "numbers",
  });

  const [availableVips, setAvailableVips] = useState<VipNumber[]>([]);
  const [isLoadingVips, setIsLoadingVips] = useState(false);
  const [isVipComboboxOpen, setIsVipComboboxOpen] = useState(false);
  const [vipSearchTerm, setVipSearchTerm] = useState("");
  const { toast } = useToast();

  const numbersInPack = form.watch('numbers');

  useEffect(() => {
    if (numbersInPack) {
      const calculatedTotal = numbersInPack.reduce((sum, item) => {
        const price = typeof item.price === 'number' ? item.price : parseFloat(String(item.price) || '0');
        return sum + (isNaN(price) ? 0 : price);
      }, 0);
      form.setValue('totalOriginalPrice', calculatedTotal, { shouldValidate: true });
    }
  }, [numbersInPack, form]);

  useEffect(() => {
    const fetchVips = async () => {
      setIsLoadingVips(true);
      try {
        const q = query(collection(db, 'vipNumbers'), where('status', '==', 'available'), orderBy('number', 'asc'));
        const querySnapshot = await getDocs(q);
        const vips: VipNumber[] = [];
        querySnapshot.forEach((doc) => {
          vips.push({ id: doc.id, ...doc.data() } as VipNumber);
        });
        setAvailableVips(vips);
      } catch (error) {
        console.error("Error fetching available VIP numbers: ", error);
        toast({
          title: "Error Fetching VIPs",
          description: "Could not load available VIP numbers for selection.",
          variant: "destructive",
        });
      } finally {
        setIsLoadingVips(false);
      }
    };
    fetchVips();
  }, [toast]);

  const handleAddVipToPack = (vip: VipNumber) => {
    const isAlreadyAdded = fields.some(field => field.originalVipNumberId === vip.id);
    if (isAlreadyAdded) {
      toast({
        title: "Already Added",
        description: `VIP Number "${vip.number}" is already in this pack.`,
        variant: "default" 
      });
      return;
    }

    append({
      originalVipNumberId: vip.id,
      number: vip.number,
      price: vip.price, 
    } as NumberPackItemFormData);
    setIsVipComboboxOpen(false); 
    setVipSearchTerm(""); 
  };
  
  const handleAddItemManually = () => {
    append({ number: '', price: 0, originalVipNumberId: undefined } as NumberPackItemFormData);
  };

  const validCategories = categories.filter(category => category.slug && category.slug.trim() !== '');

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 max-h-[70vh] overflow-y-auto p-1 pr-3">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Pack Name</FormLabel>
              <FormControl>
                <Input placeholder="e.g., Family Value Pack" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="categorySlug"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Category</FormLabel>
              <Select onValueChange={field.onChange} value={field.value || ""} defaultValue={field.value || ""}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a category for the pack" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {validCategories.length === 0 && (
                     <SelectItem value="placeholder-disabled" disabled>
                      No 'pack' type categories found
                    </SelectItem>
                  )}
                  {validCategories.map((category) => (
                    <SelectItem key={category.id} value={category.slug}>
                      {category.title} ({category.slug})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormDescription>Select the category for this number pack.</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <FormField
          control={form.control}
          name="totalOriginalPrice"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Total Original Price (₹) (Auto-calculated)</FormLabel>
              <FormControl>
                <Input 
                  type="number" 
                  placeholder="Auto-calculated sum of item prices" 
                  {...field} 
                  value={field.value ?? ''}
                  readOnly 
                  className="bg-muted/50 cursor-not-allowed"
                />
              </FormControl>
              <FormDescription>Sum of individual item prices in the pack.</FormDescription>
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
                  <SelectItem value="partially-sold">Partially Sold</SelectItem>
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
                <Textarea placeholder="e.g., A bundle of three great numbers." {...field} />
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
                <Input placeholder="e.g., happy family, business deal (1-2 words)" {...field} />
              </FormControl>
              <FormDescription>Keywords for AI image generation if needed.</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <FormField
            control={form.control}
            name="isVipPack"
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
                    Mark as VIP Pack
                  </FormLabel>
                  <FormDescription>
                    Indicates if this is a premium pack.
                  </FormDescription>
                </div>
              </FormItem>
            )}
          />

        <div className="space-y-3 border p-3 rounded-md">
          <div className="flex justify-between items-center">
            <FormLabel>Numbers in Pack</FormLabel>
            <Popover open={isVipComboboxOpen} onOpenChange={setIsVipComboboxOpen}>
              <PopoverTrigger asChild>
                <Button
                  type="button" 
                  variant="outline"
                  role="combobox"
                  aria-expanded={isVipComboboxOpen}
                  className="w-[250px] justify-between"
                  disabled={isLoadingVips}
                >
                  {isLoadingVips ? "Loading VIPs..." : "Add VIP Number from List"}
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[300px] p-0">
                <Command>
                  <CommandInput 
                    placeholder="Search VIP number..."
                    onValueChange={setVipSearchTerm} 
                  />
                  <CommandList>
                    <CommandEmpty>No VIP number found.</CommandEmpty>
                    <CommandGroup>
                      {availableVips
                        .filter(vip => vip.number.toLowerCase().includes(vipSearchTerm.toLowerCase()))
                        .map((vip) => {
                          const isAlreadyInPack = fields.some(field => field.originalVipNumberId === vip.id);
                          return (
                            <CommandItem
                              key={vip.id}
                              value={vip.number} 
                              onSelect={() => {
                                if (!isAlreadyInPack) {
                                  handleAddVipToPack(vip);
                                }
                              }}
                              disabled={isAlreadyInPack}
                            >
                              <CheckIcon
                                className={cn(
                                  "mr-2 h-4 w-4",
                                  isAlreadyInPack ? "opacity-100" : "opacity-0"
                                )}
                              />
                              {vip.number} (₹{vip.price.toLocaleString()})
                            </CommandItem>
                          );
                        })}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>

          {fields.map((item, index) => (
            <div key={item.id} className="flex items-end gap-2 p-2 border rounded-md">
              <FormField
                control={form.control}
                name={`numbers.${index}.number`}
                render={({ field }) => (
                  <FormItem className="flex-1">
                    <FormLabel className="text-xs">Number {index + 1}</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="e.g., 98XXXX0001" 
                        {...field} 
                        readOnly={!!item.originalVipNumberId} 
                        className={!!item.originalVipNumberId ? "bg-muted/50 cursor-not-allowed" : ""}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name={`numbers.${index}.price`}
                render={({ field }) => (
                  <FormItem className="w-32">
                     <FormLabel className="text-xs">Item Price (₹)</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        placeholder="e.g., 1000" 
                        {...field} 
                        onChange={e => field.onChange(e.target.value === '' ? undefined : parseFloat(e.target.value))}
                        />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <input type="hidden" {...form.register(`numbers.${index}.originalVipNumberId`)} />
              <Button
                type="button" 
                variant="destructive"
                size="icon"
                onClick={() => remove(index)}
                className="shrink-0"
              >
                <Trash2 className="h-4 w-4" />
                 <span className="sr-only">Remove Number</span>
              </Button>
            </div>
          ))}
          <Button
            type="button" 
            variant="outline"
            size="sm"
            onClick={handleAddItemManually}
            className="mt-2"
          >
            <PlusCircle className="mr-2 h-4 w-4" /> Add Item Manually
          </Button>
           <FormMessage>{form.formState.errors.numbers?.message || form.formState.errors.numbers?.root?.message}</FormMessage>
        </div>


        <div className="flex justify-end space-x-2 pt-4">
          {onClose && (
            <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </Button>
          )}
          <Button type="submit" disabled={isSubmitting} className="bg-primary hover:bg-primary/90">
            {isSubmitting ? 'Saving Pack...' : 'Save Pack'}
          </Button>
        </div>
      </form>
    </Form>
  );
}
